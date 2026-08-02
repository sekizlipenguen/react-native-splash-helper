const fs = require('fs');
const path = require('path');
const { parseStringPromise, Builder } = require('xml2js');
const { toAndroidColor } = require('./utils/color');
const { androidGravityFor, isFullBleedMode } = require('./utils/resizeMode');
const { ensureDir, writeFile, copyFile, removeFile } = require('./utils/fs');
const { writeAndroidImageAssets, writeCoverPreparedImage } = require('./utils/density');
const { findLauncherActivity } = require('./utils/androidManifest');
const { wireAndroidNative } = require('./utils/androidWire');
const log = require('./utils/log');

/**
 * Android 12 always draws an animated icon (falls back to the launcher icon if
 * missing/invalid). A 288dp shape filled with the splash color blends into the
 * background so full-bleed art is not squeezed into the icon circle.
 */
const SPLASH_ICON_MASK_XML = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <size android:width="288dp" android:height="288dp" />
    <solid android:color="@color/splash_background" />
</shape>
`;

function ensureStyleItem(style, name, value) {
  if (!style.item) {
    style.item = [];
  }
  const existing = style.item.find((item) => item.$.name === name);
  if (existing) {
    existing._ = value;
    return 'updated';
  }
  style.item.push({ $: { name }, _: value });
  return 'added';
}

function removeStyleItem(style, name) {
  if (!style.item) return;
  style.item = style.item.filter((item) => item.$.name !== name);
}

function ensureColorEntry(colorsJson, name, value) {
  if (typeof colorsJson.resources === 'string' || !colorsJson.resources) {
    colorsJson.resources = {};
  }
  if (!colorsJson.resources.color) {
    colorsJson.resources.color = [];
  }
  const existing = colorsJson.resources.color.find((c) => c.$.name === name);
  if (existing) {
    existing._ = value;
  } else {
    colorsJson.resources.color.push({ $: { name }, _: value });
  }
}

async function readOrCreateColors(colorsPath) {
  if (fs.existsSync(colorsPath)) {
    const content = fs.readFileSync(colorsPath, 'utf8') || '<resources></resources>';
    return parseStringPromise(content);
  }
  return { resources: { color: [] } };
}

function imageDrawableName(fileName) {
  return path.basename(fileName, path.extname(fileName));
}

/**
 * @param {import('./utils/config').PlatformConfig} androidConfig
 * @param {{ dryRun?: boolean, root?: string }} [options]
 */
async function updateStyles(androidConfig, options = {}) {
  const dryRun = Boolean(options.dryRun);
  const root = options.root || process.cwd();

  const resDir = path.join(root, 'android/app/src/main/res');
  const stylesPath = path.join(resDir, 'values/styles.xml');
  const colorsPath = path.join(resDir, 'values/colors.xml');
  const nightColorsPath = path.join(resDir, 'values-night/colors.xml');
  const nightV31StylesPath = path.join(resDir, 'values-night-v31/styles.xml');
  const v31StylesPath = path.join(resDir, 'values-v31/styles.xml');
  const manifestPath = path.join(root, 'android/app/src/main/AndroidManifest.xml');
  const drawablePath = path.join(resDir, 'drawable');

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`AndroidManifest.xml not found at ${manifestPath}`);
  }
  if (!fs.existsSync(stylesPath)) {
    throw new Error(`styles.xml not found at ${stylesPath}`);
  }

  const manifestJson = await parseStringPromise(fs.readFileSync(manifestPath, 'utf8'));
  const applicationNode = manifestJson.manifest.application[0];
  const themeAttribute = applicationNode.$?.['android:theme'];

  if (!themeAttribute) {
    throw new Error('No android:theme found on <application> in AndroidManifest.xml.');
  }

  const appThemeName = themeAttribute.replace('@style/', '');
  log.info(`Using application theme: ${appThemeName}`);

  const launcherActivity = findLauncherActivity(applicationNode);
  let activityThemeName = null;
  if (launcherActivity?.$?.['android:theme']) {
    activityThemeName = launcherActivity.$['android:theme'].replace('@style/', '');
    log.info(
      `Using launcher activity theme: ${activityThemeName} (${launcherActivity.$['android:name']})`
    );
  } else if (launcherActivity) {
    log.info(`Launcher activity: ${launcherActivity.$['android:name']} (inherits application theme)`);
  } else {
    log.warn('Could not find LAUNCHER activity; only application theme will be updated.');
  }

  const themeNames = [...new Set([appThemeName, activityThemeName].filter(Boolean))];

  const bgColor = toAndroidColor(androidConfig.backgroundColor);
  const sourceExt = path.extname(androidConfig.splashImage).toLowerCase();
  const imageFileName = `splash_image${sourceExt === '.jpeg' ? '.jpg' : sourceExt}`;
  const useAndroid12 = androidConfig.android12 !== false;
  const fullBleed = isFullBleedMode(androidConfig.resizeMode);

  // --- styles.xml (legacy windowBackground for pre-31) ---
  const stylesJson = await parseStringPromise(fs.readFileSync(stylesPath, 'utf8'));
  if (!stylesJson.resources?.style) {
    throw new Error('styles.xml has no <style> entries.');
  }

  for (const themeName of themeNames) {
    const style = stylesJson.resources.style.find((s) => s.$.name === themeName);
    if (!style) {
      log.warn(`Theme "${themeName}" not found in styles.xml; skipping.`);
      continue;
    }
    const action = ensureStyleItem(style, 'android:windowBackground', '@drawable/splash_background');
    log.info(`${action} android:windowBackground on theme: ${themeName}`);

    // Keep splash opaque during transition on older APIs
    ensureStyleItem(style, 'android:windowDisablePreview', 'false');
  }

  writeFile(stylesPath, new Builder().buildObject(stylesJson), { dryRun, log: log.info });
  log.success('styles.xml updated.');

  // --- colors.xml ---
  const colorsJson = await readOrCreateColors(colorsPath);
  ensureColorEntry(colorsJson, 'splash_background', bgColor);
  writeFile(colorsPath, new Builder().buildObject(colorsJson), { dryRun, log: log.info });
  log.success('colors.xml updated.');

  // --- dark mode colors ---
  if (androidConfig.darkBackgroundColor) {
    const darkColor = toAndroidColor(androidConfig.darkBackgroundColor);
    const nightColors = await readOrCreateColors(nightColorsPath);
    ensureColorEntry(nightColors, 'splash_background', darkColor);
    writeFile(nightColorsPath, new Builder().buildObject(nightColors), {
      dryRun,
      log: log.info,
    });
    log.success('values-night/colors.xml updated (dark mode).');
  }

  ensureDir(drawablePath, { dryRun });

  // Image assets first — cover mode may bake a 1080x2400 PNG via sharp
  const imageResult = await writeAndroidImageAssets({
    sourcePath: androidConfig.splashImage,
    resDir,
    fileName: imageFileName,
    generateDensities: Boolean(androidConfig.generateDensities),
    resizeMode: androidConfig.resizeMode,
    dryRun,
  });

  const effectiveFileName = imageResult.fileName || imageFileName;
  const imageResName = imageDrawableName(effectiveFileName);
  const coverPrepared = Boolean(imageResult.coverPrepared);
  const gravity = androidGravityFor(androidConfig.resizeMode, { coverPrepared });

  // Dark splash image (optional) — drawable-night
  if (androidConfig.darkSplashImage) {
    const nightDrawableDir = path.join(resDir, 'drawable-night');
    ensureDir(nightDrawableDir, { dryRun });
    if (androidConfig.resizeMode === 'cover') {
      const prepared = await writeCoverPreparedImage(
        androidConfig.darkSplashImage,
        path.join(nightDrawableDir, 'splash_image.png'),
        { dryRun }
      );
      if (!prepared) {
        copyFile(
          androidConfig.darkSplashImage,
          path.join(nightDrawableDir, effectiveFileName),
          { dryRun, log: log.info }
        );
      }
    } else {
      copyFile(androidConfig.darkSplashImage, path.join(nightDrawableDir, effectiveFileName), {
        dryRun,
        log: log.info,
      });
    }
    log.success('drawable-night splash image updated.');
  }

  // Color-matched icon mask so Android 12+ does not show/squeeze the launcher icon
  writeFile(path.join(drawablePath, 'splash_icon_mask.xml'), SPLASH_ICON_MASK_XML, {
    dryRun,
    log: log.info,
  });

  const splashDrawableContent = `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@color/splash_background" />
    <item>
        <bitmap
            android:gravity="${gravity}"
            android:src="@drawable/${imageResName}" />
    </item>
</layer-list>
`;
  writeFile(path.join(drawablePath, 'splash_background.xml'), splashDrawableContent, {
    dryRun,
    log: log.info,
  });

  // Remove stale extension variants
  for (const stale of ['splash_image.jpg', 'splash_image.jpeg', 'splash_image.webp']) {
    if (stale !== effectiveFileName) {
      removeFile(path.join(drawablePath, stale), { dryRun, log: log.info });
    }
  }
  if (effectiveFileName === 'splash_image.png' && sourceExt !== '.png' && !coverPrepared) {
    // kept png from source
  }

  log.success(
    `Drawable splash resources updated (resizeMode=${androidConfig.resizeMode}, gravity=${gravity}${
      coverPrepared ? ', cover-baked' : ''
    }).`
  );

  // --- Android 12+ (API 31) SplashScreen theme attrs ---
  if (useAndroid12) {
    await writeAndroid12Styles({
      v31StylesPath,
      nightV31StylesPath,
      themeNames,
      stylesJson,
      androidConfig,
      imageResName,
      fullBleed,
      dryRun,
    });
  }

  // --- Auto-wire Gradle + MainActivity (dismiss system splash / show cover) ---
  if (androidConfig.wireNative !== false) {
    const launcherName = launcherActivity?.$?.['android:name'] || '.MainActivity';
    wireAndroidNative({
      root,
      fullBleed,
      imageResName,
      launcherActivityName: launcherName,
      dryRun,
    });
  }
}

async function writeAndroid12Styles({
  v31StylesPath,
  nightV31StylesPath,
  themeNames,
  stylesJson,
  androidConfig,
  imageResName,
  fullBleed,
  dryRun,
}) {
  const builder = new Builder();

  /**
   * Full-bleed (cover/fill): Android 12's windowSplashScreenBackground only reliably
   * accepts colors (bitmaps fall back to white). Animated icons are always centered
   * in a circle — full-bleed art there looks squeezed. Use splash color + matching
   * icon mask; the cover-baked image lives on windowBackground.
   * Contain (logo): color background + image as the centered animated icon.
   */
  const splashBackground = '@color/splash_background';
  const animatedIcon = fullBleed
    ? '@drawable/splash_icon_mask'
    : `@drawable/${imageResName}`;

  /** @type {object} */
  let v31Json;
  if (fs.existsSync(v31StylesPath)) {
    v31Json = await parseStringPromise(fs.readFileSync(v31StylesPath, 'utf8'));
    if (!v31Json.resources) v31Json.resources = {};
    if (!v31Json.resources.style) v31Json.resources.style = [];
  } else {
    v31Json = { resources: { style: [] } };
  }

  for (const themeName of themeNames) {
    const baseStyle = stylesJson.resources.style.find((s) => s.$.name === themeName);
    const parent = baseStyle?.$.parent || 'Theme.AppCompat.DayNight.NoActionBar';

    let style = v31Json.resources.style.find((s) => s.$.name === themeName);
    if (!style) {
      style = { $: { name: themeName, parent }, item: [] };
      v31Json.resources.style.push(style);
    } else if (!style.item) {
      style.item = [];
    }

    if (!String(style.$.parent || '').includes('SplashScreen')) {
      style.$.parent = parent;
    }

    ensureStyleItem(style, 'android:windowSplashScreenBackground', splashBackground);
    ensureStyleItem(style, 'android:windowSplashScreenAnimatedIcon', animatedIcon);
    ensureStyleItem(
      style,
      'android:windowSplashScreenIconBackgroundColor',
      fullBleed ? '@color/splash_background' : '@android:color/transparent'
    );
    removeStyleItem(style, 'postSplashScreenTheme');
  }

  writeFile(v31StylesPath, builder.buildObject(v31Json), { dryRun, log: log.info });
  log.success(
    `values-v31/styles.xml updated (Android 12+, ${
      fullBleed
        ? 'color-only system splash; cover image on windowBackground'
        : 'logo icon'
    }).`
  );
  if (fullBleed) {
    log.info(
      'Android 12+ system splash is color-only; full-bleed cover is shown via MainActivity wiring (installSplashScreen + cover overlay).'
    );
  }

  if (androidConfig.darkBackgroundColor) {
    let nightV31;
    if (fs.existsSync(nightV31StylesPath)) {
      nightV31 = await parseStringPromise(fs.readFileSync(nightV31StylesPath, 'utf8'));
      if (!nightV31.resources) nightV31.resources = {};
      if (!nightV31.resources.style) nightV31.resources.style = [];
    } else {
      nightV31 = { resources: { style: [] } };
    }

    for (const themeName of themeNames) {
      let style = nightV31.resources.style.find((s) => s.$.name === themeName);
      if (!style) {
        const base = v31Json.resources.style.find((s) => s.$.name === themeName);
        style = {
          $: { name: themeName, parent: base?.$.parent || 'Theme.AppCompat.DayNight.NoActionBar' },
          item: [],
        };
        nightV31.resources.style.push(style);
      }
      ensureStyleItem(style, 'android:windowSplashScreenBackground', splashBackground);
      ensureStyleItem(style, 'android:windowSplashScreenAnimatedIcon', animatedIcon);
    }

    writeFile(nightV31StylesPath, builder.buildObject(nightV31), { dryRun, log: log.info });
    log.success('values-night-v31/styles.xml updated.');
  }
}

module.exports = updateStyles;

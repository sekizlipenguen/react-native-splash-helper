const fs = require('fs');
const path = require('path');
const { writeFile } = require('./fs');
const log = require('./log');

const MARKER_START = '// <splash-helper>';
const MARKER_END = '// </splash-helper>';
const IMPORT_START = '// <splash-helper-imports>';
const IMPORT_END = '// </splash-helper-imports>';

const SPLASHSCREEN_DEP =
  'implementation("androidx.core:core-splashscreen:1.0.1")';

/**
 * Recursively collect files under dir matching predicate.
 * @param {string} dir
 * @param {(name: string, full: string) => boolean} pred
 * @param {string[]} [acc]
 */
function walkFiles(dir, pred, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, pred, acc);
    } else if (pred(entry.name, full)) {
      acc.push(full);
    }
  }
  return acc;
}

/**
 * Locate MainActivity.kt / MainActivity.java from launcher activity name.
 * @param {string} root
 * @param {string|null} launcherActivityName e.g. ".MainActivity"
 */
function findMainActivityFile(root, launcherActivityName) {
  const simple =
    (launcherActivityName || 'MainActivity')
      .replace(/^\./, '')
      .split('.')
      .pop() || 'MainActivity';

  const srcRoots = [
    path.join(root, 'android/app/src/main/java'),
    path.join(root, 'android/app/src/main/kotlin'),
  ];

  const matches = [];
  for (const src of srcRoots) {
    walkFiles(
      src,
      (name) => name === `${simple}.kt` || name === `${simple}.java`,
      matches
    );
  }

  if (matches.length === 0) {
    return null;
  }

  // Prefer kotlin, then exact MainActivity
  matches.sort((a, b) => {
    const score = (p) =>
      (p.endsWith('.kt') ? 0 : 1) + (path.basename(p).startsWith('MainActivity') ? 0 : 10);
    return score(a) - score(b);
  });

  return matches[0];
}

/**
 * Ensure androidx.core:core-splashscreen is in android/app/build.gradle.
 * @param {string} root
 * @param {{ dryRun?: boolean }} [opts]
 */
function ensureSplashScreenDependency(root, { dryRun = false } = {}) {
  const gradlePath = path.join(root, 'android/app/build.gradle');
  if (!fs.existsSync(gradlePath)) {
    throw new Error(`android/app/build.gradle not found at ${gradlePath}`);
  }

  let content = fs.readFileSync(gradlePath, 'utf8');
  if (content.includes('core-splashscreen')) {
    log.info('android/app/build.gradle already has core-splashscreen.');
    return { changed: false, path: gradlePath };
  }

  if (!/dependencies\s*\{/.test(content)) {
    throw new Error('Could not find dependencies { } block in android/app/build.gradle');
  }

  const next = content.replace(/dependencies\s*\{/, (match) => `${match}\n    ${SPLASHSCREEN_DEP}`);

  writeFile(gradlePath, next, { dryRun, log: log.info });
  log.success('Added androidx.core:core-splashscreen to android/app/build.gradle');
  return { changed: true, path: gradlePath };
}

function stripMarkedBlock(content, start, end) {
  const re = new RegExp(
    `${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}\\n?`,
    'g'
  );
  return content.replace(re, '');
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildKotlinHelperBlock({ fullBleed, imageResName }) {
  if (!fullBleed) {
    return [
      `  ${MARKER_START}`,
      `  val splashScreen = installSplashScreen()`,
      `  ${MARKER_END}`,
    ].join('\n');
  }

  return [
    `  ${MARKER_START}`,
    `  val splashScreen = installSplashScreen()`,
    `  // Dismiss Android 12 color/icon splash; show full-bleed cover instead.`,
    `  splashScreen.setKeepOnScreenCondition { false }`,
    `  splashScreen.setOnExitAnimationListener { provider ->`,
    `    val host = provider.view`,
    `    val parent = host.parent as? android.view.ViewGroup`,
    `    val cover = android.widget.ImageView(this).apply {`,
    `      setImageResource(R.drawable.${imageResName})`,
    `      scaleType = android.widget.ImageView.ScaleType.CENTER_CROP`,
    `      layoutParams = android.view.ViewGroup.LayoutParams(`,
    `        android.view.ViewGroup.LayoutParams.MATCH_PARENT,`,
    `        android.view.ViewGroup.LayoutParams.MATCH_PARENT,`,
    `      )`,
    `      tag = "splash_helper_cover"`,
    `    }`,
    `    parent?.addView(cover)`,
    `    provider.remove()`,
    `    android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({`,
    `      (cover.parent as? android.view.ViewGroup)?.removeView(cover)`,
    `    }, 1500)`,
    `  }`,
    `  ${MARKER_END}`,
  ].join('\n');
}

function buildKotlinImports({ fullBleed }) {
  const lines = [
    IMPORT_START,
    'import android.os.Bundle',
    'import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen',
  ];
  if (fullBleed) {
    // ImageView / Handler referenced with FQCN in block — no extra imports required
  }
  lines.push(IMPORT_END);
  return `${lines.join('\n')}\n`;
}

function buildJavaHelperBlock({ fullBleed, imageResName }) {
  if (!fullBleed) {
    return [
      `        ${MARKER_START}`,
      `        SplashScreen.installSplashScreen(this);`,
      `        ${MARKER_END}`,
    ].join('\n');
  }

  return [
    `        ${MARKER_START}`,
    `        SplashScreen splashScreen = SplashScreen.installSplashScreen(this);`,
    `        splashScreen.setKeepOnScreenCondition(() -> false);`,
    `        splashScreen.setOnExitAnimationListener(provider -> {`,
    `            android.view.View host = provider.getView();`,
    `            android.view.ViewGroup parent = host.getParent() instanceof android.view.ViewGroup`,
    `                ? (android.view.ViewGroup) host.getParent() : null;`,
    `            android.widget.ImageView cover = new android.widget.ImageView(this);`,
    `            cover.setImageResource(R.drawable.${imageResName});`,
    `            cover.setScaleType(android.widget.ImageView.ScaleType.CENTER_CROP);`,
    `            cover.setLayoutParams(new android.view.ViewGroup.LayoutParams(`,
    `                android.view.ViewGroup.LayoutParams.MATCH_PARENT,`,
    `                android.view.ViewGroup.LayoutParams.MATCH_PARENT));`,
    `            cover.setTag("splash_helper_cover");`,
    `            if (parent != null) parent.addView(cover);`,
    `            provider.remove();`,
    `            new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {`,
    `                if (cover.getParent() instanceof android.view.ViewGroup) {`,
    `                    ((android.view.ViewGroup) cover.getParent()).removeView(cover);`,
    `                }`,
    `            }, 1500);`,
    `        });`,
    `        ${MARKER_END}`,
  ].join('\n');
}

function buildJavaImports() {
  return [
    IMPORT_START,
    'import android.os.Bundle;',
    'import androidx.core.splashscreen.SplashScreen;',
    IMPORT_END,
    '',
  ].join('\n');
}

/**
 * Ensure helper imports exist (idempotent via markers).
 */
function ensureImports(content, importBlock) {
  const block = `${importBlock.trimEnd()}\n`;
  if (content.includes(IMPORT_START) && content.includes(IMPORT_END)) {
    return content.replace(
      new RegExp(`${escapeRegExp(IMPORT_START)}[\\s\\S]*?${escapeRegExp(IMPORT_END)}\\n?`),
      block
    );
  }
  const pkgMatch = content.match(/^package\s+[^\n;]+;?\n/);
  if (!pkgMatch) {
    return `${block}\n${content}`;
  }
  const idx = pkgMatch[0].length;
  return content.slice(0, idx) + '\n' + block + content.slice(idx);
}

function replaceOrInsertHelper(content, helper, onCreateRegex, createOnCreate) {
  if (content.includes(MARKER_START) && content.includes(MARKER_END)) {
    return content.replace(
      new RegExp(`${escapeRegExp(MARKER_START)}[\\s\\S]*?${escapeRegExp(MARKER_END)}`),
      helper.trim()
    );
  }

  if (onCreateRegex.test(content)) {
    let next = content.replace(onCreateRegex, `$1\n${helper}`);
    if (!/super\.onCreate\s*\(/.test(next)) {
      next = next.replace(MARKER_END, `${MARKER_END}\n    super.onCreate(savedInstanceState)`);
    }
    return next;
  }

  return createOnCreate(content, helper);
}

/**
 * Patch Kotlin MainActivity.
 */
function patchKotlinMainActivity(content, { fullBleed, imageResName }) {
  let next = ensureImports(content, buildKotlinImports({ fullBleed }));
  const helper = buildKotlinHelperBlock({ fullBleed, imageResName });

  next = replaceOrInsertHelper(
    next,
    helper,
    /(override\s+fun\s+onCreate\s*\([^)]*\)\s*\{)/,
    (src, helperBlock) => {
      const onCreateFn = [
        '',
        '  override fun onCreate(savedInstanceState: Bundle?) {',
        helperBlock,
        '    super.onCreate(savedInstanceState)',
        '  }',
        '',
      ].join('\n');
      if (/class\s+\w+[^{]*\{/.test(src)) {
        return src.replace(/(class\s+\w+[^{]*\{)/, `$1\n${onCreateFn}`);
      }
      return `${src}${onCreateFn}`;
    }
  );

  return next;
}

/**
 * Patch Java MainActivity.
 */
function patchJavaMainActivity(content, { fullBleed, imageResName }) {
  let next = ensureImports(content, buildJavaImports());
  const helper = buildJavaHelperBlock({ fullBleed, imageResName });

  next = replaceOrInsertHelper(
    next,
    helper,
    /(void\s+onCreate\s*\([^)]*\)\s*\{)/,
    (src, helperBlock) => {
      const onCreateFn = [
        '',
        '    @Override',
        '    protected void onCreate(Bundle savedInstanceState) {',
        helperBlock,
        '        super.onCreate(savedInstanceState);',
        '    }',
        '',
      ].join('\n');
      if (/class\s+\w+[^{]*\{/.test(src)) {
        return src.replace(/(class\s+\w+[^{]*\{)/, `$1\n${onCreateFn}`);
      }
      return `${src}${onCreateFn}`;
    }
  );

  return next;
}

/**
 * Wire Android native project for SplashScreen API + full-bleed cover.
 *
 * @param {object} opts
 * @param {string} opts.root
 * @param {boolean} opts.fullBleed
 * @param {string} opts.imageResName e.g. splash_image
 * @param {string|null} [opts.launcherActivityName]
 * @param {boolean} [opts.dryRun]
 */
function wireAndroidNative({
  root,
  fullBleed,
  imageResName,
  launcherActivityName = null,
  dryRun = false,
}) {
  ensureSplashScreenDependency(root, { dryRun });

  const activityPath = findMainActivityFile(root, launcherActivityName);
  if (!activityPath) {
    throw new Error(
      'Could not find MainActivity.kt/java under android/app/src/main. Add installSplashScreen() manually or check the launcher activity name.'
    );
  }

  const original = fs.readFileSync(activityPath, 'utf8');
  const isKotlin = activityPath.endsWith('.kt');
  const patched = isKotlin
    ? patchKotlinMainActivity(original, { fullBleed, imageResName })
    : patchJavaMainActivity(original, { fullBleed, imageResName });

  if (patched === original) {
    log.info(`${path.relative(root, activityPath)} already wired.`);
    return { gradle: true, activityPath, changed: false };
  }

  writeFile(activityPath, patched, { dryRun, log: log.info });
  log.success(
    `Wired ${path.relative(root, activityPath)} (installSplashScreen${
      fullBleed ? ' + full-bleed cover overlay' : ''
    })`
  );
  return { gradle: true, activityPath, changed: true };
}

module.exports = {
  MARKER_START,
  MARKER_END,
  SPLASHSCREEN_DEP,
  findMainActivityFile,
  ensureSplashScreenDependency,
  patchKotlinMainActivity,
  patchJavaMainActivity,
  wireAndroidNative,
};

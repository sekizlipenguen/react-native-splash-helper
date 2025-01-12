const fs = require('fs');
const path = require('path');
const { parseStringPromise, Builder } = require('xml2js');

async function updateStyles(androidConfig) {
  const stylesPath = path.join(process.cwd(), 'android/app/src/main/res/values/styles.xml');
  const colorsPath = path.join(process.cwd(), 'android/app/src/main/res/values/colors.xml');
  const manifestPath = path.join(process.cwd(), 'android/app/src/main/AndroidManifest.xml');
  const drawablePath = path.join(process.cwd(), 'android/app/src/main/res/drawable');
  const splashImageSource = path.resolve(androidConfig.splashImage);

  // ** Retrieve theme name from AndroidManifest.xml **
  if (!fs.existsSync(manifestPath)) {
    console.error('AndroidManifest.xml not found. Please check the path.');
    return;
  }

  const manifestContent = fs.readFileSync(manifestPath, 'utf8');
  const manifestJson = await parseStringPromise(manifestContent);

  const applicationNode = manifestJson.manifest.application[0];
  const themeAttribute = applicationNode.$['android:theme'];
  const mainActivityNode = applicationNode.activity.find(
      (activity) => activity.$['android:name'] === '.MainActivity'
  );

  if (!themeAttribute) {
    console.error('No theme found in AndroidManifest.xml at the application level.');
    return;
  }

  const appThemeName = themeAttribute.replace('@style/', '');
  console.log(`Using application theme: ${appThemeName}`);

  let mainActivityThemeName = null;
  if (mainActivityNode && mainActivityNode.$['android:theme']) {
    mainActivityThemeName = mainActivityNode.$['android:theme'].replace('@style/', '');
    console.log(`Using MainActivity theme: ${mainActivityThemeName}`);
  }

  const themeNames = [appThemeName, mainActivityThemeName].filter(Boolean);

  // ** Update styles.xml **
  if (fs.existsSync(stylesPath)) {
    const stylesContent = fs.readFileSync(stylesPath, 'utf8');
    const stylesJson = await parseStringPromise(stylesContent);

    themeNames.forEach((themeName) => {
      const appTheme = stylesJson.resources.style.find((style) => style.$.name === themeName);
      if (appTheme && !appTheme.item.some((item) => item.$.name === 'android:windowBackground')) {
        appTheme.item.push({ $: { name: 'android:windowBackground' }, _: '@drawable/splash_background' });
        console.log(`Added android:windowBackground to theme: ${themeName}`);
      }
    });

    const updatedStylesContent = new Builder().buildObject(stylesJson);
    fs.writeFileSync(stylesPath, updatedStylesContent, 'utf8');
    console.log('styles.xml updated.');
  } else {
    console.error('styles.xml not found. Please check the path.');
    return;
  }

  // ** Update colors.xml **
  let colorsJson;
  if (fs.existsSync(colorsPath)) {
    const colorsContent = fs.readFileSync(colorsPath, 'utf8') || '<resources></resources>';
    colorsJson = await parseStringPromise(colorsContent);

    if (typeof colorsJson.resources === 'string') {
      colorsJson.resources = {};
    }

    if (!colorsJson.resources.color) {
      colorsJson.resources.color = [];
    }

    const splashColor = colorsJson.resources.color.find((color) => color.$.name === 'splash_background');
    if (splashColor) {
      splashColor._ = androidConfig.backgroundColor;
    } else {
      colorsJson.resources.color.push({
        $: { name: 'splash_background' },
        _: androidConfig.backgroundColor,
      });
    }
  } else {
    console.log('colors.xml not found. Creating a new colors.xml file.');
    colorsJson = {
      resources: {
        color: [
          {
            $: { name: 'splash_background' },
            _: androidConfig.backgroundColor,
          },
        ],
      },
    };
  }

  const updatedColorsContent = new Builder().buildObject(colorsJson);
  fs.writeFileSync(colorsPath, updatedColorsContent, 'utf8');
  console.log('colors.xml created or updated.');

  // ** Update Drawable Splash **
  if (!fs.existsSync(drawablePath)) {
    fs.mkdirSync(drawablePath, { recursive: true });
  }

  const splashDrawableContent = `
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
  <item android:drawable="@color/splash_background" />
  <item>
    <bitmap android:gravity="fill" android:src="@drawable/splash_image" />
  </item>
</layer-list>
`;

  const splashImageTarget = path.join(drawablePath, 'splash_image.png');
  fs.copyFileSync(splashImageSource, splashImageTarget);
  fs.writeFileSync(path.join(drawablePath, 'splash_background.xml'), splashDrawableContent, 'utf8');
  console.log('Drawable splash resources updated.');
}

module.exports = updateStyles;

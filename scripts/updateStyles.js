const fs = require('fs');
const path = require('path');
const { parseStringPromise, Builder } = require('xml2js');

async function updateStyles(androidConfig) {
  const stylesPath = path.join(process.cwd(), 'android/app/src/main/res/values/styles.xml');
  const colorsPath = path.join(process.cwd(), 'android/app/src/main/res/values/colors.xml');
  const drawablePath = path.join(process.cwd(), 'android/app/src/main/res/drawable');
  const splashImageSource = path.resolve(androidConfig.splashImage);

  // ** styles.xml Güncellemesi **
  if (!fs.existsSync(stylesPath)) {
    console.error('styles.xml not found. Please check the path.');
    return;
  }

  const stylesContent = fs.readFileSync(stylesPath, 'utf8');
  const stylesJson = await parseStringPromise(stylesContent);
  const appTheme = stylesJson.resources.style.find((style) => style.$.name === 'AppTheme');
  if (appTheme && !appTheme.item.some((item) => item.$.name === 'android:windowBackground')) {
    appTheme.item.push({ $: { name: 'android:windowBackground' }, _: '@drawable/splash_background' });
  }
  const updatedStylesContent = new Builder().buildObject(stylesJson);
  fs.writeFileSync(stylesPath, updatedStylesContent, 'utf8');
  console.log('styles.xml updated.');

  // ** colors.xml Güncellemesi **
  if (fs.existsSync(colorsPath)) {
    const colorsContent = fs.readFileSync(colorsPath, 'utf8');
    const colorsJson = await parseStringPromise(colorsContent);
    const splashColor = colorsJson.resources.color.find((color) => color.$.name === 'splash_background');
    if (splashColor) {
      splashColor._ = androidConfig.backgroundColor;
    } else {
      colorsJson.resources.color.push({
        $: { name: 'splash_background' },
        _: androidConfig.backgroundColor,
      });
    }
    const updatedColorsContent = new Builder().buildObject(colorsJson);
    fs.writeFileSync(colorsPath, updatedColorsContent, 'utf8');
    console.log('colors.xml updated.');
  } else {
    console.error('colors.xml not found. Creating a new colors.xml file.');
    const colorsContent = {
      resources: {
        color: [
          {
            $: { name: 'splash_background' },
            _: androidConfig.backgroundColor,
          },
        ],
      },
    };
    const newColorsContent = new Builder().buildObject(colorsContent);
    fs.writeFileSync(colorsPath, newColorsContent, 'utf8');
    console.log('colors.xml created and updated.');
  }

  // ** Drawable Splash Ayarı **
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

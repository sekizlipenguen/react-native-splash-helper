const updateStyles = require('./updateStyles');
const updateStoryboard = require('./updateStoryboard');

function generateSplash() {
  console.log('Generating splash screens...');

  // React Native config dosyasını yükle
  const config = require(`${process.cwd()}/react-native.config.js`)['@sekizlipenguen/react-native-splash-helper'];

  if (!config) {
    console.error(
        'Splash configuration not found in react-native.config.js. Please add the required configuration.'
    );
    process.exit(1);
  }

  // Android ve iOS işlemleri
  if (config.android) {
    updateStyles(config.android);
  }
  if (config.ios) {
    updateStoryboard(config.ios);
  }

  console.log('Splash screens have been successfully generated!');
}

module.exports = generateSplash;

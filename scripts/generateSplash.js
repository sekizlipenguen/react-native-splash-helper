#!/usr/bin/env node

const updateStyles = require('./updateStyles');
const updateStoryboard = require('./updateStoryboard');

async function generateSplash() {
  console.log('Generating splash screens...');

  try {
    // React Native config dosyasını yükle
    const config = require(`${process.cwd()}/react-native.config.js`)['@sekizlipenguen/react-native-splash-helper'];

    if (!config) {
      console.error(
          'Splash configuration not found in react-native.config.js. Please add the required configuration.'
      );
      process.exit(1);
    }

    // Android işlemleri
    if (config.android) {
      try {
        await updateStyles(config.android); // Android için splash ekranını oluştur
        console.log('Android splash screen setup completed.');
      } catch (error) {
        console.error('Error generating Android splash screen:', error.message);
      }
    } else {
      console.log('No Android configuration found. Skipping Android splash screen setup.');
    }

    // iOS işlemleri
    if (config.ios) {
      try {
        updateStoryboard(config.ios); // iOS için splash ekranını oluştur
        console.log('iOS splash screen setup completed.');
      } catch (error) {
        console.error('Error generating iOS splash screen:', error.message);
      }
    } else {
      console.log('No iOS configuration found. Skipping iOS splash screen setup.');
    }

    console.log('Splash screens have been successfully generated!');
  } catch (error) {
    console.error('Error during splash screen generation:', error.message);
    process.exit(1);
  }
}

module.exports = generateSplash;

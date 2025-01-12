const generateSplash = require('./scripts/generateSplash');

module.exports = {
  commands: [
    {
      name: 'generate-splash',
      description: 'Generates splash screen assets for iOS and Android',
      func: generateSplash,
    },
  ],
};

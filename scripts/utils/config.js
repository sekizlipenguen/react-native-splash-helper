const fs = require('fs');
const path = require('path');
const { resolveProjectRoot, assertImageFile } = require('./fs');
const { normalizeHexColor } = require('./color');
const { normalizeResizeMode } = require('./resizeMode');

const CONFIG_KEY = '@sekizlipenguen/react-native-splash-helper';
const DEFAULT_BACKGROUND = '#FFFFFF';

const CONFIG_EXAMPLE = `
module.exports = {
  '${CONFIG_KEY}': {
    android: {
      splashImage: './assets/splash.png',
      backgroundColor: '#FFFFFF',
      resizeMode: 'cover',
    },
    ios: {
      splashImage: './assets/splash.png',
      backgroundColor: '#FFFFFF',
      resizeMode: 'cover',
    },
  },
};
`.trim();

/**
 * @typedef {object} PlatformConfig
 * @property {string} splashImage
 * @property {string} backgroundColor
 * @property {string} [darkBackgroundColor]
 * @property {string} [darkSplashImage]
 * @property {'cover'|'contain'|'fill'} resizeMode
 * @property {boolean} [android12]
 * @property {boolean} [wireNative]
 * @property {boolean} [generateDensities]
 */

/**
 * @param {string} [cwd]
 * @returns {{ root: string, raw: object, android?: PlatformConfig, ios?: PlatformConfig }}
 */
function loadConfig(cwd = process.cwd()) {
  const root = resolveProjectRoot(cwd);
  const configPath = path.join(root, 'react-native.config.js');

  if (!fs.existsSync(configPath)) {
    throw new Error(
      `react-native.config.js not found in ${root}.\n\nAdd configuration like:\n\n${CONFIG_EXAMPLE}`
    );
  }

  // Clear cache so re-runs pick up edits during the same Node process
  delete require.cache[require.resolve(configPath)];
  const rnConfig = require(configPath);
  const raw = rnConfig[CONFIG_KEY];

  if (!raw || typeof raw !== 'object') {
    throw new Error(
      `Splash configuration not found under "${CONFIG_KEY}" in react-native.config.js.\n\nExample:\n\n${CONFIG_EXAMPLE}`
    );
  }

  if (!raw.android && !raw.ios) {
    throw new Error(
      `No android or ios section found under "${CONFIG_KEY}".\n\nExample:\n\n${CONFIG_EXAMPLE}`
    );
  }

  return {
    root,
    raw,
    android: raw.android ? normalizePlatformConfig(raw.android, 'android', root) : undefined,
    ios: raw.ios ? normalizePlatformConfig(raw.ios, 'ios', root) : undefined,
  };
}

/**
 * @param {object} platformRaw
 * @param {'android'|'ios'} platform
 * @param {string} root
 * @returns {PlatformConfig}
 */
function normalizePlatformConfig(platformRaw, platform, root) {
  if (!platformRaw || typeof platformRaw !== 'object') {
    throw new Error(`${platform} config must be an object.`);
  }

  if (!platformRaw.splashImage) {
    throw new Error(`${platform}.splashImage is required.`);
  }

  const splashImage = assertImageFile(
    path.resolve(root, platformRaw.splashImage),
    `${platform}.splashImage`
  );

  const backgroundColor = normalizeHexColor(
    platformRaw.backgroundColor,
    DEFAULT_BACKGROUND
  );

  const resizeMode = normalizeResizeMode(platformRaw.resizeMode);

  /** @type {PlatformConfig} */
  const config = {
    splashImage,
    backgroundColor,
    resizeMode,
    android12: platformRaw.android12 !== false,
    // Default on: patch build.gradle + MainActivity for SplashScreen API
    wireNative: platformRaw.wireNative !== false,
    generateDensities: platformRaw.generateDensities === true,
  };

  if (platformRaw.darkBackgroundColor != null && platformRaw.darkBackgroundColor !== '') {
    config.darkBackgroundColor = normalizeHexColor(platformRaw.darkBackgroundColor);
  }

  if (platformRaw.darkSplashImage) {
    config.darkSplashImage = assertImageFile(
      path.resolve(root, platformRaw.darkSplashImage),
      `${platform}.darkSplashImage`
    );
  }

  return config;
}

/**
 * Parse CLI argv flags.
 * @param {string[]} [argv]
 */
function parseCliArgs(argv = process.argv.slice(2)) {
  const flags = {
    android: false,
    ios: false,
    dryRun: false,
    help: false,
  };

  for (const arg of argv) {
    switch (arg) {
      case '--android':
        flags.android = true;
        break;
      case '--ios':
        flags.ios = true;
        break;
      case '--dry-run':
        flags.dryRun = true;
        break;
      case '--help':
      case '-h':
        flags.help = true;
        break;
      default:
        if (arg.startsWith('-')) {
          throw new Error(`Unknown flag: ${arg}. Use --android, --ios, --dry-run, or --help.`);
        }
        break;
    }
  }

  // If neither platform flag is set, run both (when configured)
  if (!flags.android && !flags.ios) {
    flags.android = true;
    flags.ios = true;
  }

  return flags;
}

module.exports = {
  CONFIG_KEY,
  CONFIG_EXAMPLE,
  DEFAULT_BACKGROUND,
  loadConfig,
  normalizePlatformConfig,
  parseCliArgs,
};

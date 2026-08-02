#!/usr/bin/env node

const updateStyles = require('./updateStyles');
const updateStoryboard = require('./updateStoryboard');
const { loadConfig, parseCliArgs, CONFIG_EXAMPLE } = require('./utils/config');
const log = require('./utils/log');

function printHelp() {
  console.log(`
Usage: react-native-splash-helper [generate-splash] [options]

Generates native splash screen assets for Android and iOS from react-native.config.js.

Options:
  --android    Only generate Android splash assets
  --ios        Only generate iOS splash assets
  --dry-run    Log planned writes without modifying files
  -h, --help   Show this help

Configuration example (react-native.config.js):

${CONFIG_EXAMPLE}
`);
}

/**
 * @param {object} [legacyArg] unused; kept for react-native CLI command signature
 * @param {string[]} [argv]
 */
async function generateSplash(legacyArg, argv) {
  let flags;
  try {
    // react-native CLI may pass (argv, config) or we run via bin with process.argv
    const args = Array.isArray(argv)
      ? argv
      : Array.isArray(legacyArg)
        ? legacyArg
        : process.argv.slice(2).filter((a) => a !== 'generate-splash');

    flags = parseCliArgs(args);
  } catch (err) {
    log.error(err.message);
    process.exitCode = 1;
    return;
  }

  if (flags.help) {
    printHelp();
    return;
  }

  log.info(`Generating splash screens${flags.dryRun ? ' (dry-run)' : ''}...`);

  let config;
  try {
    config = loadConfig(process.cwd());
  } catch (err) {
    log.error(err.message);
    process.exitCode = 1;
    return;
  }

  const errors = [];
  const runAndroid = flags.android && config.android;
  const runIos = flags.ios && config.ios;

  if (flags.android && !config.android) {
    log.warn('No Android configuration found. Skipping Android.');
  }
  if (flags.ios && !config.ios) {
    log.warn('No iOS configuration found. Skipping iOS.');
  }

  if (!runAndroid && !runIos) {
    log.error('Nothing to do. Configure android and/or ios, and pass matching flags.');
    process.exitCode = 1;
    return;
  }

  if (runAndroid) {
    try {
      await updateStyles(config.android, { dryRun: flags.dryRun, root: config.root });
      log.success('Android splash screen setup completed.');
    } catch (err) {
      log.error(`Android: ${err.message}`);
      errors.push(err);
    }
  }

  if (runIos) {
    try {
      updateStoryboard(config.ios, { dryRun: flags.dryRun, root: config.root });
      log.success('iOS splash screen setup completed.');
    } catch (err) {
      log.error(`iOS: ${err.message}`);
      errors.push(err);
    }
  }

  if (errors.length > 0) {
    log.error(`Splash generation finished with ${errors.length} error(s).`);
    process.exitCode = 1;
    return;
  }

  log.success('Splash screens have been successfully generated!');
}

module.exports = generateSplash;

if (require.main === module) {
  generateSplash().then(() => {
    if (process.exitCode && process.exitCode !== 0) {
      process.exit(process.exitCode);
    }
  });
}

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { loadConfig, parseCliArgs, CONFIG_KEY } = require('../utils/config');

// --- parseCliArgs ---
{
  const both = parseCliArgs([]);
  assert.strictEqual(both.android, true);
  assert.strictEqual(both.ios, true);
  assert.strictEqual(both.dryRun, false);

  const onlyAndroid = parseCliArgs(['--android', '--dry-run']);
  assert.strictEqual(onlyAndroid.android, true);
  assert.strictEqual(onlyAndroid.ios, false);
  assert.strictEqual(onlyAndroid.dryRun, true);

  const onlyIos = parseCliArgs(['--ios']);
  assert.strictEqual(onlyIos.android, false);
  assert.strictEqual(onlyIos.ios, true);

  assert.throws(() => parseCliArgs(['--nope']), /Unknown flag/);
}

// --- loadConfig with temp project ---
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'splash-helper-'));
  const assetsDir = path.join(tmp, 'assets');
  fs.mkdirSync(assetsDir);
  const imagePath = path.join(assetsDir, 'splash.png');
  // minimal fake png bytes (existence + extension only matter)
  fs.writeFileSync(imagePath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));

  fs.writeFileSync(
    path.join(tmp, 'react-native.config.js'),
    `
module.exports = {
  '${CONFIG_KEY}': {
    android: {
      splashImage: './assets/splash.png',
      backgroundColor: '#abc',
      resizeMode: 'contain',
    },
    ios: {
      splashImage: './assets/splash.png',
    },
  },
};
`
  );

  const config = loadConfig(tmp);
  assert.ok(config.android);
  assert.ok(config.ios);
  assert.strictEqual(config.android.backgroundColor, '#AABBCC');
  assert.strictEqual(config.android.resizeMode, 'contain');
  assert.strictEqual(config.ios.backgroundColor, '#FFFFFF');
  assert.strictEqual(config.ios.resizeMode, 'cover');
  assert.strictEqual(config.android.android12, true);

  fs.rmSync(tmp, { recursive: true, force: true });
}

// --- missing config ---
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'splash-helper-missing-'));
  assert.throws(() => loadConfig(tmp), /react-native.config.js not found/);
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log('config.test.js passed');

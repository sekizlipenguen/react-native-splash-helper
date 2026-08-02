#!/usr/bin/env node
/**
 * End-to-end integrity check: unit surface + npm pack + example generate + artifact asserts.
 * Run from package root: npm run check
 */
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const EXAMPLE = path.join(ROOT, 'example');

function section(title) {
  console.log(`\n======== ${title} ========`);
}

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exitCode = 1;
}

function ok(cond, msg) {
  if (!cond) {
    fail(msg);
    return false;
  }
  console.log(`✓ ${msg}`);
  return true;
}

function run(cmd, opts = {}) {
  return execSync(cmd, {
    cwd: opts.cwd || ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...opts,
  });
}

section('UNIT TESTS');
const test = spawnSync('npm', ['test'], { cwd: ROOT, encoding: 'utf8', stdio: 'inherit' });
if (test.status !== 0) {
  fail('unit tests failed');
  process.exit(1);
}

section('PACK INTEGRITY');
const packOut = run('npm pack --dry-run 2>&1');
ok(!/__tests__/.test(packOut), 'pack excludes __tests__');
ok(!/example\//.test(packOut), 'pack excludes example/');
ok(!/cleanBin/.test(packOut), 'pack excludes cleanBin');
ok(/scripts\/utils\/androidWire\.js/.test(packOut), 'pack includes androidWire.js');
ok(/bin\/react-native-splash-helper/.test(packOut), 'pack includes bin');

section('DOCS / TYPES ALIGNMENT');
const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
const dts = fs.readFileSync(path.join(ROOT, 'index.d.ts'), 'utf8');
const indexJs = fs.readFileSync(path.join(ROOT, 'index.js'), 'utf8');
ok(readme.includes('wireNative') && dts.includes('wireNative'), 'wireNative in README + types');
ok(readme.includes('android12') && dts.includes('android12'), 'android12 in README + types');
ok(readme.includes('generateDensities') && dts.includes('generateDensities'), 'generateDensities aligned');
ok(!readme.includes('splash_1.webp'), 'README has no broken screenshot');
ok(!readme.includes('postSplashScreenTheme'), 'README has no postSplashScreenTheme');
ok(indexJs.includes("name: 'generate-splash'"), 'index.js exports generate-splash command');

if (!fs.existsSync(EXAMPLE)) {
  fail('example/ missing — cannot assert generate artifacts');
  process.exit(1);
}

section('EXAMPLE GENERATE');
const gen = spawnSync('npx', ['react-native-splash-helper'], {
  cwd: EXAMPLE,
  encoding: 'utf8',
  stdio: 'inherit',
});
if (gen.status !== 0) {
  fail('generate-splash failed in example/');
  process.exit(1);
}

section('ARTIFACT ASSERTIONS');
const ma = fs.readFileSync(
  path.join(EXAMPLE, 'android/app/src/main/java/com/splashhelperexample/MainActivity.kt'),
  'utf8'
);
ok(ma.includes('installSplashScreen'), 'MainActivity has installSplashScreen');
ok(ma.includes('<splash-helper>'), 'MainActivity has markers');
ok(ma.includes('CENTER_CROP'), 'MainActivity has cover overlay');
ok(ma.includes('super.onCreate'), 'MainActivity calls super.onCreate');

const gradle = fs.readFileSync(path.join(EXAMPLE, 'android/app/build.gradle'), 'utf8');
ok(gradle.includes('core-splashscreen'), 'build.gradle has core-splashscreen');

const colors = fs.readFileSync(
  path.join(EXAMPLE, 'android/app/src/main/res/values/colors.xml'),
  'utf8'
);
ok(colors.includes('#0B1F3A'), 'colors.xml splash_background');

const bg = fs.readFileSync(
  path.join(EXAMPLE, 'android/app/src/main/res/drawable/splash_background.xml'),
  'utf8'
);
ok(bg.includes('android:gravity="fill"'), 'splash_background gravity fill (cover-baked)');
ok(bg.includes('@drawable/splash_image'), 'splash_background refs splash_image');

const v31 = fs.readFileSync(
  path.join(EXAMPLE, 'android/app/src/main/res/values-v31/styles.xml'),
  'utf8'
);
ok(v31.includes('windowSplashScreenBackground'), 'v31 splash background');
ok(v31.includes('splash_icon_mask'), 'v31 uses icon mask (not full image)');
ok(!v31.includes('postSplashScreenTheme'), 'v31 has no invalid postSplashScreenTheme');

ok(
  fs.existsSync(path.join(EXAMPLE, 'android/app/src/main/res/drawable/splash_image.png')),
  'android splash_image.png exists'
);
ok(
  fs.existsSync(path.join(EXAMPLE, 'android/app/src/main/res/drawable/splash_icon_mask.xml')),
  'splash_icon_mask exists'
);

const sb = fs.readFileSync(
  path.join(EXAMPLE, 'ios/SplashHelperExample/LaunchScreen.storyboard'),
  'utf8'
);
ok(sb.includes('scaleAspectFill'), 'iOS contentMode scaleAspectFill');
ok(sb.includes('splash_image'), 'iOS storyboard refs splash_image');
ok(sb.includes('red="0.043"'), 'iOS bg ~ #0B1F3A');

const imageset = path.join(
  EXAMPLE,
  'ios/SplashHelperExample/Images.xcassets/splash_image.imageset'
);
ok(fs.existsSync(path.join(imageset, 'splash_image.png')), 'iOS splash_image.png');
const contents = JSON.parse(fs.readFileSync(path.join(imageset, 'Contents.json'), 'utf8'));
ok(
  contents.images.every((i) => !/splash_\d+_/.test(i.filename || '')),
  'no random cache-bust filenames'
);

const cfg =
  require(path.join(EXAMPLE, 'react-native.config.js'))[
    '@sekizlipenguen/react-native-splash-helper'
  ];
ok(cfg.android.resizeMode === 'cover', 'example config cover');
ok(cfg.android.backgroundColor === '#0B1F3A', 'example config color');

(async () => {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    fail('sharp required for cover bake assertion (optionalDependency)');
    process.exit(1);
  }

  const splashPath = path.join(
    EXAMPLE,
    'android/app/src/main/res/drawable/splash_image.png'
  );
  const meta = await sharp(splashPath).metadata();
  ok(meta.width === 1080 && meta.height === 2400, `cover bake ${meta.width}x${meta.height}`);

  const { data, info } = await sharp(splashPath).raw().toBuffer({ resolveWithObject: true });
  let navy = 0;
  let yellow = 0;
  const step = info.channels * 50;
  for (let i = 0; i < data.length; i += step) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r < 40 && g < 50 && b < 100 && b > 40) navy++;
    if (r > 200 && g > 160 && b < 100) yellow++;
  }
  ok(navy > 100, `cover has navy pixels (${navy})`);
  ok(yellow > 5, `cover has yellow accent (${yellow})`);

  if (process.exitCode && process.exitCode !== 0) {
    console.error('\nINTEGRITY FAILED');
    process.exit(1);
  }
  console.log('\n======== INTEGRITY PASS ========');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

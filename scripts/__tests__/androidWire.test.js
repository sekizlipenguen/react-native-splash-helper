const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  ensureSplashScreenDependency,
  patchKotlinMainActivity,
  patchJavaMainActivity,
  findMainActivityFile,
  MARKER_START,
} = require('../utils/androidWire');

// --- gradle dependency ---
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'splash-wire-gradle-'));
  const gradleDir = path.join(tmp, 'android/app');
  fs.mkdirSync(gradleDir, { recursive: true });
  const gradlePath = path.join(gradleDir, 'build.gradle');
  fs.writeFileSync(
    gradlePath,
    `
dependencies {
    implementation("com.facebook.react:react-android")
}
`
  );

  const first = ensureSplashScreenDependency(tmp);
  assert.strictEqual(first.changed, true);
  const once = fs.readFileSync(gradlePath, 'utf8');
  assert.ok(once.includes('core-splashscreen'));

  const second = ensureSplashScreenDependency(tmp);
  assert.strictEqual(second.changed, false);
  assert.strictEqual(
    (fs.readFileSync(gradlePath, 'utf8').match(/core-splashscreen/g) || []).length,
    1
  );

  fs.rmSync(tmp, { recursive: true, force: true });
}

// --- kotlin patch idempotent ---
{
  const base = `
package com.demo

import com.facebook.react.ReactActivity

class MainActivity : ReactActivity() {
  override fun getMainComponentName(): String = "Demo"
}
`;
  const once = patchKotlinMainActivity(base, {
    fullBleed: true,
    imageResName: 'splash_image',
  });
  assert.ok(once.includes(MARKER_START));
  assert.ok(once.includes('installSplashScreen()'));
  assert.ok(once.includes('CENTER_CROP'));
  assert.ok(once.includes('super.onCreate'));

  const twice = patchKotlinMainActivity(once, {
    fullBleed: true,
    imageResName: 'splash_image',
  });
  assert.strictEqual(
    (twice.match(/installSplashScreen\(\)/g) || []).length,
    1
  );
}

// --- java contain (no overlay) ---
{
  const base = `
package com.demo;

import com.facebook.react.ReactActivity;

public class MainActivity extends ReactActivity {
  @Override
  protected String getMainComponentName() {
    return "Demo";
  }
}
`;
  const patched = patchJavaMainActivity(base, {
    fullBleed: false,
    imageResName: 'splash_image',
  });
  assert.ok(patched.includes('SplashScreen.installSplashScreen(this)'));
  assert.ok(!patched.includes('CENTER_CROP'));
}

// --- find MainActivity ---
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'splash-wire-find-'));
  const dir = path.join(tmp, 'android/app/src/main/java/com/demo');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'MainActivity.kt');
  fs.writeFileSync(file, 'class MainActivity');
  const found = findMainActivityFile(tmp, '.MainActivity');
  assert.strictEqual(found, file);
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log('androidWire.test.js passed');

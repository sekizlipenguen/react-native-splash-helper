const assert = require('assert');
const { parseStringPromise } = require('xml2js');
const { findLauncherActivity } = require('../utils/androidManifest');

async function main() {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <application android:theme="@style/AppTheme">
    <activity android:name=".OtherActivity" />
    <activity android:name=".HomeActivity" android:theme="@style/SplashTheme">
      <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
      </intent-filter>
    </activity>
  </application>
</manifest>`;

  const json = await parseStringPromise(xml);
  const app = json.manifest.application[0];
  const launcher = findLauncherActivity(app);

  assert.ok(launcher);
  assert.strictEqual(launcher.$['android:name'], '.HomeActivity');
  assert.strictEqual(launcher.$['android:theme'], '@style/SplashTheme');
  assert.strictEqual(app.$['android:theme'], '@style/AppTheme');

  console.log('androidTheme.test.js passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

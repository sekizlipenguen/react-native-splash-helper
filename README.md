![platforms](https://img.shields.io/badge/platforms-Android%20%7C%20iOS-brightgreen.svg?style=flat-square&colorB=191A17)
[![npm](https://img.shields.io/npm/v/@sekizlipenguen/react-native-splash-helper.svg?style=flat-square)](https://www.npmjs.com/package/@sekizlipenguen/react-native-splash-helper)
[![npm](https://img.shields.io/npm/dm/@sekizlipenguen/react-native-splash-helper.svg?style=flat-square&colorB=007ec6)](https://www.npmjs.com/package/@sekizlipenguen/react-native-splash-helper)

# @sekizlipenguen/react-native-splash-helper

A lightweight CLI that generates native splash screen assets for bare React Native apps (Android + iOS) from `react-native.config.js`.

> This package is a **generator**, not a runtime splash controller. After the native splash dismisses, hide/retain logic is up to your app (e.g. `react-native-bootsplash` or the AndroidX SplashScreen API).

## Example

A React Native **0.86.2** playground lives in [`example/`](example/). See [example/README.md](example/README.md) for setup and iOS run instructions.

## Features

- Config-driven splash generation for Android and iOS
- Theme discovery from `AndroidManifest.xml` (application + LAUNCHER activity)
- `resizeMode`: `cover` | `contain` | `fill`
- Optional dark mode colors / images
- Android 12+ `values-v31` SplashScreen attributes (with legacy `windowBackground` fallback)
- Auto-wire AndroidX SplashScreen (`wireNative`) + full-bleed cover overlay
- Optional density generation via `sharp`
- `--android` / `--ios` / `--dry-run` flags

## Installation

```bash
yarn add @sekizlipenguen/react-native-splash-helper --dev
# or
npm install @sekizlipenguen/react-native-splash-helper --save-dev
```

Optional (Android density buckets):

```bash
yarn add sharp --dev
```

## Configuration

Add a section to `react-native.config.js`:

```javascript
module.exports = {
  '@sekizlipenguen/react-native-splash-helper': {
    android: {
      splashImage: './assets/splash.png',
      backgroundColor: '#FFFFFF',
      darkBackgroundColor: '#000000', // optional
      darkSplashImage: './assets/splash-dark.png', // optional
      resizeMode: 'cover', // cover | contain | fill
      android12: true, // default true — writes values-v31 styles
      wireNative: true, // default true — patches build.gradle + MainActivity
      generateDensities: false, // set true + install sharp for mdpi…xxxhdpi
    },
    ios: {
      splashImage: './assets/splash.png',
      backgroundColor: '#FFFFFF',
      darkSplashImage: './assets/splash-dark.png', // optional (imageset appearances)
      resizeMode: 'cover',
    },
  },
};
```

### Options

| Option | Platform | Default | Description |
|--------|----------|---------|-------------|
| `splashImage` | Both | — | Path to splash image (`png` / `jpg` / `webp`). Required. |
| `backgroundColor` | Both | `#FFFFFF` | Hex background (`#FFF`, `#FFFFFF`, or `#RRGGBBAA`). |
| `darkBackgroundColor` | Android | — | Night `colors.xml` splash background. |
| `darkSplashImage` | Both | — | Dark image (`drawable-night` / iOS imageset appearance). |
| `resizeMode` | Both | `cover` | `cover` (aspect-fill), `contain` (letterbox), or `fill` (stretch). On Android, `cover` is baked with `sharp` into a 1080×2400 image so it does not squash. |
| `android12` | Android | `true` | Write Android 12+ SplashScreen style attrs under `values-v31`. |
| `wireNative` | Android | `true` | Auto-add `core-splashscreen` and wire `installSplashScreen()` in `MainActivity` (cover overlay for `cover`/`fill`). |
| `generateDensities` | Android | `false` | Generate density drawables with `sharp`. |

## Usage

```bash
npx react-native-splash-helper
# or
npx @sekizlipenguen/react-native-splash-helper generate-splash
```

Flags:

```bash
npx react-native-splash-helper --android
npx react-native-splash-helper --ios
npx react-native-splash-helper --dry-run
```

React Native CLI command (via `package.json` `commands` export):

```bash
npx react-native generate-splash
```

## What it writes

### Android

- Updates detected themes in `styles.xml` with `android:windowBackground` → `@drawable/splash_background`
- Creates/updates `values/colors.xml` (`splash_background`)
- Writes `drawable/splash_background.xml` + copies `splash_image.*`
- Optional: `values-night/colors.xml`, `drawable-night/`
- Optional: `values-v31/styles.xml` with `windowSplashScreenBackground` / `windowSplashScreenAnimatedIcon`
- Optional: `drawable-mdpi` … `drawable-xxxhdpi` when `generateDensities: true` and `sharp` is installed
- With `wireNative` (default): `android/app/build.gradle` + `MainActivity` SplashScreen wiring

**Android 12+ / `cover` note:** The system splash background may only be a **solid color**, and the animated icon is always a centered circle — a full-bleed image there looks squashed. With defaults (`android12` + `wireNative`), `generate-splash`:
1. Bakes the image with `sharp` to 1080×2400 (`fit: 'cover'`)
2. Writes `values-v31` color + icon mask
3. Adds `androidx.core:core-splashscreen` to `android/app/build.gradle`
4. Wires `MainActivity` with `installSplashScreen()` and a short `CENTER_CROP` cover overlay

Set `wireNative: false` to skip Gradle/MainActivity patching. For logo-style splash use `resizeMode: 'contain'`.

### iOS

- Overwrites `LaunchScreen.storyboard` with a full-bleed image + configured background color
- Creates/updates `Images.xcassets/splash_image.imageset` with a stable filename (no random cache-bust names)
- Optional dark image via Xcode `appearances`

The storyboard file is **replaced** on each run so results stay predictable.

## Notes

- Run the generator from the React Native project root (where `react-native.config.js` lives).
- Missing/invalid config exits with code `1` and a clear message.
- This tool does not manage the in-JS splash after the native layer hands off to React Native.

## License

MIT © [Sekizli Penguen](https://github.com/sekizlipenguen)

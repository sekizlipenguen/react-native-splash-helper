# Splash Helper Example

Playground app for `@sekizlipenguen/react-native-splash-helper` on **React Native 0.86.2**.

Tracked for local development, but **not published to npm** (root `files` + `.npmignore`).

## Setup

```bash
cd example
npm install
npm run generate-splash
bundle install
bundle exec pod install --project-directory=ios
```

## Run (iOS)

Requires **Node >= 22.11** (RN 0.86). Use a free Metro port; if the app shows “No script URL”, Metro isn’t on the port the binary expects (default **8081**).

```bash
# terminal 1
nvm use 22
npm start -- --port 8081

# terminal 2
npx react-native run-ios --udid "$(xcrun simctl list devices booted | sed -nE 's/.*\(([A-F0-9-]+)\).*/\1/p' | head -1)" --port 8081
```

## Run (Android)

```bash
# emulator must be running (e.g. Pixel_8)
adb reverse tcp:8081 tcp:8081
npx react-native run-android --port 8081 --device emulator-5554
```

## Regenerate splash

```bash
npm run generate-splash
# platform-only:
npx react-native-splash-helper --android
npx react-native-splash-helper --ios
# dry-run:
npx react-native-splash-helper --dry-run
```

## Package integrity (from repo root)

```bash
npm test          # unit tests
npm run check     # unit + pack + generate + artifact asserts
```

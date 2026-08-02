const fs = require('fs');
const path = require('path');
const { hexToRgbComponents } = require('./utils/color');
const { iosContentModeFor } = require('./utils/resizeMode');
const { ensureDir, writeFile, copyFile, removeFile } = require('./utils/fs');
const log = require('./utils/log');

function resolveIosAppName(root) {
  const iosDir = path.join(root, 'ios');
  if (!fs.existsSync(iosDir)) {
    throw new Error(`ios/ directory not found at ${iosDir}`);
  }

  const appName = fs
    .readdirSync(iosDir)
    .find((dir) => fs.existsSync(path.join(iosDir, dir, 'Info.plist')));

  if (!appName) {
    throw new Error('iOS app name could not be resolved (no Info.plist under ios/*).');
  }

  return appName;
}

function cleanImageset(splashImagePath, { dryRun = false } = {}) {
  if (!fs.existsSync(splashImagePath)) return;

  for (const file of fs.readdirSync(splashImagePath)) {
    // Remove legacy random-named cache-bust files and any previous splash images
    if (
      (file.startsWith('splash_image') && file.endsWith('.png')) ||
      (file.startsWith('splash_image') && /\.(jpg|jpeg|webp)$/i.test(file)) ||
      file === 'Contents.json'
    ) {
      // Keep Contents.json for rewrite; delete image files
      if (file === 'Contents.json') continue;
      removeFile(path.join(splashImagePath, file), { dryRun, log: log.info });
    }
  }
}

function buildStoryboard({ contentMode, backgroundColor }) {
  const rgb = hexToRgbComponents(backgroundColor);

  return `<?xml version="1.0" encoding="UTF-8"?>
<document type="com.apple.InterfaceBuilder3.CocoaTouch.Storyboard.XIB" version="3.0" toolsVersion="23504" targetRuntime="iOS.CocoaTouch" propertyAccessControl="none" useAutolayout="YES" launchScreen="YES" useTraitCollections="YES" useSafeAreas="YES" colorMatched="YES" initialViewController="01J-lp-oVM">
    <device id="retina4_7" orientation="portrait" appearance="light"/>
    <dependencies>
        <deployment identifier="iOS"/>
        <plugIn identifier="com.apple.InterfaceBuilder.IBCocoaTouchPlugin" version="23506"/>
        <capability name="Safe area layout guides" minToolsVersion="9.0"/>
        <capability name="documents saved in the Xcode 8 format" minToolsVersion="8.0"/>
    </dependencies>
    <scenes>
        <!--View Controller-->
        <scene sceneID="EHf-IW-A2E">
            <objects>
                <viewController id="01J-lp-oVM" sceneMemberID="viewController">
                    <view key="view" contentMode="scaleToFill" id="Ze5-6b-2t3">
                        <rect key="frame" x="0.0" y="0.0" width="375" height="667"/>
                        <autoresizingMask key="autoresizingMask" widthSizable="YES" heightSizable="YES"/>
                        <subviews>
                            <imageView userInteractionEnabled="NO" contentMode="${contentMode}" image="splash_image" translatesAutoresizingMaskIntoConstraints="NO" id="img-splash">
                                <rect key="frame" x="0.0" y="0.0" width="375" height="667"/>
                            </imageView>
                        </subviews>
                        <viewLayoutGuide key="safeArea" id="jCx-lo-f50"/>
                        <color key="backgroundColor" red="${rgb.red}" green="${rgb.green}" blue="${rgb.blue}" alpha="${rgb.alpha}" colorSpace="custom" customColorSpace="sRGB"/>
                        <constraints>
                            <constraint firstItem="img-splash" firstAttribute="bottom" secondItem="Ze5-6b-2t3" secondAttribute="bottom" id="bottom-constraint"/>
                            <constraint firstItem="img-splash" firstAttribute="leading" secondItem="Ze5-6b-2t3" secondAttribute="leading" id="leading-constraint"/>
                            <constraint firstItem="img-splash" firstAttribute="top" secondItem="Ze5-6b-2t3" secondAttribute="top" id="top-constraint"/>
                            <constraint firstItem="img-splash" firstAttribute="trailing" secondItem="Ze5-6b-2t3" secondAttribute="trailing" id="trailing-constraint"/>
                        </constraints>
                    </view>
                </viewController>
                <placeholder placeholderIdentifier="IBFirstResponder" id="iYj-Kq-Ea1" userLabel="First Responder" sceneMemberID="firstResponder"/>
            </objects>
            <point key="canvasLocation" x="52.173913043478265" y="375"/>
        </scene>
    </scenes>
    <resources>
        <image name="splash_image" width="375" height="667"/>
    </resources>
</document>
`;
}

/**
 * @param {import('./utils/config').PlatformConfig} iosConfig
 * @param {{ dryRun?: boolean, root?: string }} [options]
 */
function updateStoryboard(iosConfig, options = {}) {
  const dryRun = Boolean(options.dryRun);
  const root = options.root || process.cwd();

  const iosAppName = resolveIosAppName(root);
  const storyboardPath = path.join(root, 'ios', iosAppName, 'LaunchScreen.storyboard');
  const assetsPath = path.join(root, 'ios', iosAppName, 'Images.xcassets');
  const splashImagePath = path.join(assetsPath, 'splash_image.imageset');
  const darkImagesetPath = path.join(assetsPath, 'splash_image.imageset');

  ensureDir(assetsPath, { dryRun });
  ensureDir(splashImagePath, { dryRun });

  cleanImageset(splashImagePath, { dryRun });

  const sourceExt = path.extname(iosConfig.splashImage).toLowerCase();
  const lightFileName = `splash_image${sourceExt === '.jpeg' ? '.jpg' : sourceExt}`;
  const lightTarget = path.join(splashImagePath, lightFileName);
  copyFile(iosConfig.splashImage, lightTarget, { dryRun, log: log.info });

  /** @type {object} */
  const contentsJson = {
    images: [
      {
        idiom: 'universal',
        filename: lightFileName,
        scale: '1x',
      },
      {
        idiom: 'universal',
        filename: lightFileName,
        scale: '2x',
      },
      {
        idiom: 'universal',
        filename: lightFileName,
        scale: '3x',
      },
    ],
    info: { version: 1, author: 'xcode' },
  };

  // Dark appearance image (optional) — Xcode appearances API
  if (iosConfig.darkSplashImage) {
    const darkExt = path.extname(iosConfig.darkSplashImage).toLowerCase();
    const darkFileName = `splash_image_dark${darkExt === '.jpeg' ? '.jpg' : darkExt}`;
    copyFile(iosConfig.darkSplashImage, path.join(darkImagesetPath, darkFileName), {
      dryRun,
      log: log.info,
    });

    contentsJson.images = [
      { idiom: 'universal', filename: lightFileName, scale: '1x' },
      { idiom: 'universal', filename: lightFileName, scale: '2x' },
      { idiom: 'universal', filename: lightFileName, scale: '3x' },
      {
        appearances: [{ appearance: 'luminosity', value: 'dark' }],
        idiom: 'universal',
        filename: darkFileName,
        scale: '1x',
      },
      {
        appearances: [{ appearance: 'luminosity', value: 'dark' }],
        idiom: 'universal',
        filename: darkFileName,
        scale: '2x',
      },
      {
        appearances: [{ appearance: 'luminosity', value: 'dark' }],
        idiom: 'universal',
        filename: darkFileName,
        scale: '3x',
      },
    ];
  }

  writeFile(
    path.join(splashImagePath, 'Contents.json'),
    `${JSON.stringify(contentsJson, null, 2)}\n`,
    { dryRun, log: log.info }
  );

  // Note: LaunchScreen storyboard does not support dark/light trait variations for
  // backgroundColor easily; we use the light backgroundColor. Dark image still swaps via imageset.
  const contentMode = iosContentModeFor(iosConfig.resizeMode);
  const bg = iosConfig.backgroundColor;
  const storyboardContent = buildStoryboard({ contentMode, backgroundColor: bg });

  writeFile(storyboardPath, storyboardContent, { dryRun, log: log.info });
  log.success(`LaunchScreen.storyboard updated (${iosAppName}).`);

  if (iosConfig.darkBackgroundColor) {
    log.warn(
      'ios.darkBackgroundColor is accepted for API symmetry; LaunchScreen.storyboard uses backgroundColor. Dark splash image (darkSplashImage) is applied via imageset appearances.'
    );
  }

  // Touch Contents.json mtime already handled by rewrite — avoids random filename cache hack
}

module.exports = updateStoryboard;

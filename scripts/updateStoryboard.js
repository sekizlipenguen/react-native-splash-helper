const fs = require('fs');
const path = require('path');

function updateStoryboard(iosConfig) {
  const iosAppName = fs
  .readdirSync(path.join(process.cwd(), 'ios'))
  .find((dir) => fs.existsSync(path.join(process.cwd(), 'ios', dir, 'Info.plist')));

  if (!iosAppName) {
    console.error('iOS app name could not be resolved.');
    return;
  }

  const storyboardPath = path.join(process.cwd(), `ios/${iosAppName}/LaunchScreen.storyboard`);
  const assetsPath = path.join(process.cwd(), `ios/${iosAppName}/Images.xcassets`);
  const splashImagePath = path.join(assetsPath, 'splash_image.imageset');

  if (!fs.existsSync(storyboardPath)) {
    console.error('LaunchScreen.storyboard not found.');
    return;
  }

  if (!fs.existsSync(assetsPath)) {
    fs.mkdirSync(assetsPath, { recursive: true });
  }

  if (!fs.existsSync(splashImagePath)) {
    fs.mkdirSync(splashImagePath, { recursive: true });
  }

  // Splash image işlemi
  const splashImageSource = path.resolve(iosConfig.splashImage);
  const splashImageTarget = path.join(splashImagePath, 'splash_image.png');
  fs.copyFileSync(splashImageSource, splashImageTarget);

  const contentsJson = {
    images: [
      { idiom: 'universal', filename: 'splash_image.png', scale: '1x' },
      { idiom: 'universal', filename: 'splash_image.png', scale: '2x' },
      { idiom: 'universal', filename: 'splash_image.png', scale: '3x' },
    ],
    info: { version: 1, author: 'xcode' },
  };

  fs.writeFileSync(path.join(splashImagePath, 'Contents.json'), JSON.stringify(contentsJson, null, 2), 'utf8');

  // HEX rengini RGB'ye çevir
  function hexToRgb(hex) {
    const bigint = parseInt(hex.replace('#', ''), 16);
    const red = ((bigint >> 16) & 255) / 255;
    const green = ((bigint >> 8) & 255) / 255;
    const blue = (bigint & 255) / 255;
    return { red, green, blue };
  }

  const rgbColor = hexToRgb(iosConfig.backgroundColor);

  // Storyboard içeriği
  const storyboardContent = `
<?xml version="1.0" encoding="UTF-8"?>
<document type="com.apple.InterfaceBuilder3.CocoaTouch.Storyboard.XIB" version="3.0" toolsVersion="15702" targetRuntime="iOS.CocoaTouch" propertyAccessControl="none" useAutolayout="YES" launchScreen="YES" useTraitCollections="YES" useSafeAreas="YES" initialViewController="01J-lp-oVM">
  <scenes>
    <scene sceneID="EHf-IW-A2E">
      <objects>
        <viewController id="01J-lp-oVM" sceneMemberID="viewController">
          <view key="view" contentMode="scaleToFill">
            <rect key="frame" x="0.0" y="0.0" width="375" height="667"/>
            <color key="backgroundColor" red="${rgbColor.red}" green="${rgbColor.green}" blue="${rgbColor.blue}" alpha="1" />
            <subviews>
              <imageView contentMode="scaleAspectFill" image="splash_image" translatesAutoresizingMaskIntoConstraints="NO" id="splashImageView">
                <rect key="frame" x="0.0" y="0.0" width="375" height="667"/>
              </imageView>
            </subviews>
            <constraints>
              <constraint firstItem="splashImageView" firstAttribute="top" secondItem="Ze5-6b-2t3" secondAttribute="top" id="topConstraint"/>
              <constraint firstItem="splashImageView" firstAttribute="bottom" secondItem="Ze5-6b-2t3" secondAttribute="bottom" id="bottomConstraint"/>
              <constraint firstItem="splashImageView" firstAttribute="leading" secondItem="Ze5-6b-2t3" secondAttribute="leading" id="leadingConstraint"/>
              <constraint firstItem="splashImageView" firstAttribute="trailing" secondItem="Ze5-6b-2t3" secondAttribute="trailing" id="trailingConstraint"/>
            </constraints>
          </view>
        </viewController>
      </objects>
    </scene>
  </scenes>
</document>
`;

  fs.writeFileSync(storyboardPath, storyboardContent, 'utf8');
  console.log('LaunchScreen.storyboard updated successfully.');
}

module.exports = updateStoryboard;

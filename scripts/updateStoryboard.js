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

  // Assets ve splash image için dizinler oluşturuluyor
  if (!fs.existsSync(assetsPath)) {
    fs.mkdirSync(assetsPath, { recursive: true });
  }
  if (!fs.existsSync(splashImagePath)) {
    fs.mkdirSync(splashImagePath, { recursive: true });
  }

  // Splash görseli kopyalanıyor
  const splashImageSource = path.resolve(iosConfig.splashImage);
  const splashImageTarget = path.join(splashImagePath, 'splash_image.png');
  fs.copyFileSync(splashImageSource, splashImageTarget);

  // Contents.json dosyasını oluştur
  const contentsJson = {
    images: [
      { idiom: 'universal', filename: 'splash_image.png', scale: '1x' },
      { idiom: 'universal', filename: 'splash_image.png', scale: '2x' },
      { idiom: 'universal', filename: 'splash_image.png', scale: '3x' },
    ],
    info: { version: 1, author: 'xcode' },
  };
  fs.writeFileSync(
      path.join(splashImagePath, 'Contents.json'),
      JSON.stringify(contentsJson, null, 2),
      'utf8'
  );

  // Storyboard içeriği
  const storyboardContent = `<?xml version="1.0" encoding="UTF-8"?>
<document type="com.apple.InterfaceBuilder3.CocoaTouch.Storyboard.XIB" version="3.0" toolsVersion="23504" targetRuntime="iOS.CocoaTouch" propertyAccessControl="none" useAutolayout="YES" launchScreen="YES" useTraitCollections="YES" useSafeAreas="YES" colorMatched="YES" initialViewController="01J-lp-oVM">
    <device id="retina4_7" orientation="portrait" appearance="light"/>
    <dependencies>
        <deployment identifier="iOS"/>
        <plugIn identifier="com.apple.InterfaceBuilder.IBCocoaTouchPlugin" version="23506"/>
        <capability name="Safe area layout guides" minToolsVersion="9.0"/>
        <capability name="System colors in document resources" minToolsVersion="11.0"/>
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
                            <imageView userInteractionEnabled="NO" contentMode="scaleAspectFill" image="splash_image" translatesAutoresizingMaskIntoConstraints="NO" id="img-splash">
                                <rect key="frame" x="0.0" y="0.0" width="375" height="667"/>
                            </imageView>
                        </subviews>
                        <viewLayoutGuide key="safeArea" id="jCx-lo-f50"/>
                        <color key="backgroundColor" systemColor="systemBackgroundColor"/>
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
        <image name="splash_image" width="645" height="1398"/>
        <systemColor name="systemBackgroundColor">
            <color white="1" alpha="1" colorSpace="custom" customColorSpace="genericGamma22GrayColorSpace"/>
        </systemColor>
    </resources>
</document>`;

  fs.writeFileSync(storyboardPath, storyboardContent, 'utf8');
  console.log('LaunchScreen.storyboard updated successfully.');
}

module.exports = updateStoryboard;

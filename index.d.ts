declare namespace ReactNativeSplashHelper {
  type ResizeMode = 'cover' | 'contain' | 'fill';

  interface PlatformSplashConfig {
    /** Path to the splash image (png, jpg, jpeg, or webp), relative to project root. */
    splashImage: string;
    /** Background color in hex (#FFF, #FFFFFF, or #RRGGBBAA). Defaults to #FFFFFF. */
    backgroundColor?: string;
    /** Optional dark-mode background (Android values-night). */
    darkBackgroundColor?: string;
    /** Optional dark-mode splash image. */
    darkSplashImage?: string;
    /** How the image is scaled. Defaults to "cover". */
    resizeMode?: ResizeMode;
    /**
     * Android only. When true (default), write values-v31 SplashScreen attributes.
     * Set false to skip Android 12+ attrs.
     */
    android12?: boolean;
    /**
     * Android only. When true (default), auto-add core-splashscreen to
     * android/app/build.gradle and wire installSplashScreen() into MainActivity
     * (full-bleed cover overlay when resizeMode is cover/fill).
     */
    wireNative?: boolean;
    /**
     * Android only. When true, generate mdpi–xxxhdpi drawables via sharp (optionalDependency).
     * Defaults to false.
     */
    generateDensities?: boolean;
  }

  interface SplashConfig {
    android?: PlatformSplashConfig;
    ios?: PlatformSplashConfig;
  }

  interface Command {
    name: string;
    description: string;
    func: (...args: unknown[]) => void | Promise<void>;
  }

  interface Module {
    commands: Command[];
  }
}

declare const splashHelper: ReactNativeSplashHelper.Module;

export = splashHelper;

package com.splashhelperexample

// <splash-helper-imports>
import android.os.Bundle
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
// </splash-helper-imports>

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
  // <splash-helper>
  val splashScreen = installSplashScreen()
  // Dismiss Android 12 color/icon splash; show full-bleed cover instead.
  splashScreen.setKeepOnScreenCondition { false }
  splashScreen.setOnExitAnimationListener { provider ->
    val host = provider.view
    val parent = host.parent as? android.view.ViewGroup
    val cover = android.widget.ImageView(this).apply {
      setImageResource(R.drawable.splash_image)
      scaleType = android.widget.ImageView.ScaleType.CENTER_CROP
      layoutParams = android.view.ViewGroup.LayoutParams(
        android.view.ViewGroup.LayoutParams.MATCH_PARENT,
        android.view.ViewGroup.LayoutParams.MATCH_PARENT,
      )
      tag = "splash_helper_cover"
    }
    parent?.addView(cover)
    provider.remove()
    android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
      (cover.parent as? android.view.ViewGroup)?.removeView(cover)
    }, 1500)
  }
  // </splash-helper>
    super.onCreate(savedInstanceState)
  }


  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "SplashHelperExample"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}

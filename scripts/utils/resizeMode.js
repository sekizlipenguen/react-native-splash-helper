const RESIZE_MODES = ['cover', 'contain', 'fill'];

/**
 * Android BitmapDrawable gravity.
 * Note: layer-list bitmaps cannot do true CSS "cover" (uniform scale + crop).
 * - cover → fill ONLY after the image is pre-cropped to screen aspect (see density.js)
 * - contain → center (no stretch)
 * - fill → fill (intentional non-uniform stretch)
 * @type {Record<string, string>}
 */
const ANDROID_GRAVITY = {
  cover: 'fill',
  contain: 'center',
  fill: 'fill',
};

/** Fallback when cover preprocess is unavailable — never stretch. */
const ANDROID_GRAVITY_COVER_FALLBACK = 'center';

/** @type {Record<string, string>} */
const IOS_CONTENT_MODE = {
  cover: 'scaleAspectFill',
  contain: 'scaleAspectFit',
  fill: 'scaleToFill',
};

/**
 * @param {string} [value]
 * @returns {'cover'|'contain'|'fill'}
 */
function normalizeResizeMode(value) {
  const mode = (value || 'cover').toLowerCase();
  if (!RESIZE_MODES.includes(mode)) {
    throw new Error(
      `Invalid resizeMode "${value}". Expected one of: ${RESIZE_MODES.join(', ')}.`
    );
  }
  return mode;
}

/**
 * @param {string} [resizeMode]
 * @param {{ coverPrepared?: boolean }} [opts]
 */
function androidGravityFor(resizeMode, opts = {}) {
  const mode = normalizeResizeMode(resizeMode);
  if (mode === 'cover' && !opts.coverPrepared) {
    return ANDROID_GRAVITY_COVER_FALLBACK;
  }
  return ANDROID_GRAVITY[mode];
}

function iosContentModeFor(resizeMode) {
  return IOS_CONTENT_MODE[normalizeResizeMode(resizeMode)];
}

/** Full-bleed modes use windowBackground image; logo-style uses centered icon. */
function isFullBleedMode(resizeMode) {
  const mode = normalizeResizeMode(resizeMode);
  return mode === 'cover' || mode === 'fill';
}

module.exports = {
  RESIZE_MODES,
  ANDROID_GRAVITY_COVER_FALLBACK,
  normalizeResizeMode,
  androidGravityFor,
  iosContentModeFor,
  isFullBleedMode,
};

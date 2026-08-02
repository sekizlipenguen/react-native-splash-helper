const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/**
 * Normalize and validate a hex color. Returns #RRGGBB (or #RRGGBBAA).
 * @param {string} value
 * @param {string} [fallback='#FFFFFF']
 * @returns {string}
 */
function normalizeHexColor(value, fallback = '#FFFFFF') {
  const input = (value == null || value === '' ? fallback : String(value)).trim();

  if (!HEX_RE.test(input)) {
    throw new Error(
      `Invalid backgroundColor "${value}". Expected hex like #FFF, #FFFFFF, or #FFFFFFFF.`
    );
  }

  let hex = input.slice(1);

  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }

  return `#${hex.toUpperCase()}`;
}

/**
 * Parse hex (#RRGGBB or #RRGGBBAA) to RGB components 0–1 for iOS storyboard.
 * @param {string} hex
 * @returns {{ red: string, green: string, blue: string, alpha: string }}
 */
function hexToRgbComponents(hex) {
  const normalized = normalizeHexColor(hex);
  const raw = normalized.slice(1);
  const hasAlpha = raw.length === 8;
  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;
  const a = hasAlpha ? parseInt(raw.slice(6, 8), 16) / 255 : 1;

  const fmt = (n) => {
    const s = n.toFixed(3);
    return s.replace(/\.?0+$/, '') || '0';
  };

  return {
    red: fmt(r),
    green: fmt(g),
    blue: fmt(b),
    alpha: fmt(a),
  };
}

/**
 * Android color xml value (keeps #RRGGBB or #AARRGGBB).
 * If input is #RRGGBBAA, convert to Android #AARRGGBB.
 * @param {string} hex
 * @returns {string}
 */
function toAndroidColor(hex) {
  const normalized = normalizeHexColor(hex);
  const raw = normalized.slice(1);

  if (raw.length === 8) {
    const rrggbb = raw.slice(0, 6);
    const aa = raw.slice(6, 8);
    return `#${aa}${rrggbb}`.toUpperCase();
  }

  return normalized;
}

module.exports = {
  normalizeHexColor,
  hexToRgbComponents,
  toAndroidColor,
  HEX_RE,
};

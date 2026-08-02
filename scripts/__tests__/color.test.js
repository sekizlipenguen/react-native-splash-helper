const assert = require('assert');
const {
  normalizeHexColor,
  hexToRgbComponents,
  toAndroidColor,
} = require('../utils/color');

assert.strictEqual(normalizeHexColor('#fff'), '#FFFFFF');
assert.strictEqual(normalizeHexColor('#AABBCC'), '#AABBCC');
assert.strictEqual(normalizeHexColor(undefined), '#FFFFFF');
assert.strictEqual(normalizeHexColor(''), '#FFFFFF');

assert.throws(() => normalizeHexColor('red'), /Invalid backgroundColor/);
assert.throws(() => normalizeHexColor('#GG0000'), /Invalid backgroundColor/);

const rgb = hexToRgbComponents('#000000');
assert.strictEqual(rgb.red, '0');
assert.strictEqual(rgb.green, '0');
assert.strictEqual(rgb.blue, '0');
assert.strictEqual(rgb.alpha, '1');

const white = hexToRgbComponents('#FFFFFF');
assert.strictEqual(white.red, '1');
assert.strictEqual(white.green, '1');
assert.strictEqual(white.blue, '1');

assert.strictEqual(toAndroidColor('#112233'), '#112233');
assert.strictEqual(toAndroidColor('#11223380'), '#80112233');

console.log('color.test.js passed');

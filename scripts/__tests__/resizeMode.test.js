const assert = require('assert');
const {
  normalizeResizeMode,
  androidGravityFor,
  iosContentModeFor,
  isFullBleedMode,
} = require('../utils/resizeMode');

assert.strictEqual(normalizeResizeMode(), 'cover');
assert.strictEqual(normalizeResizeMode('contain'), 'contain');
assert.throws(() => normalizeResizeMode('stretch'), /Invalid resizeMode/);

// cover without baked image must NOT stretch
assert.strictEqual(androidGravityFor('cover'), 'center');
assert.strictEqual(androidGravityFor('cover', { coverPrepared: true }), 'fill');
assert.strictEqual(androidGravityFor('contain'), 'center');
assert.strictEqual(androidGravityFor('fill'), 'fill');

assert.strictEqual(iosContentModeFor('cover'), 'scaleAspectFill');
assert.strictEqual(iosContentModeFor('contain'), 'scaleAspectFit');
assert.strictEqual(iosContentModeFor('fill'), 'scaleToFill');

assert.strictEqual(isFullBleedMode('cover'), true);
assert.strictEqual(isFullBleedMode('fill'), true);
assert.strictEqual(isFullBleedMode('contain'), false);

console.log('resizeMode.test.js passed');

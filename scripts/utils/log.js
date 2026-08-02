const PREFIX = '[splash-helper]';

function info(message) {
  console.log(`${PREFIX} ${message}`);
}

function success(message) {
  console.log(`${PREFIX} ✓ ${message}`);
}

function warn(message) {
  console.warn(`${PREFIX} ⚠ ${message}`);
}

function error(message) {
  console.error(`${PREFIX} ✗ ${message}`);
}

module.exports = {
  info,
  success,
  warn,
  error,
};

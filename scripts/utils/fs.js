const fs = require('fs');
const path = require('path');

const SUPPORTED_IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

function resolveProjectRoot(cwd = process.cwd()) {
  return path.resolve(cwd);
}

function assertFile(filePath, label = 'File') {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    throw new Error(`${label} not found: ${resolved}`);
  }
  return resolved;
}

function assertImageFile(filePath, label = 'Splash image') {
  const resolved = assertFile(filePath, label);
  const ext = path.extname(resolved).toLowerCase();
  if (!SUPPORTED_IMAGE_EXTS.has(ext)) {
    throw new Error(
      `${label} must be png, jpg, jpeg, or webp. Got "${ext || '(none)'}" for ${resolved}`
    );
  }
  return resolved;
}

function ensureDir(dirPath, { dryRun = false } = {}) {
  if (dryRun) {
    return;
  }
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function writeFile(filePath, content, { dryRun = false, log } = {}) {
  if (dryRun) {
    if (log) log(`dry-run: would write ${filePath}`);
    return;
  }
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
}

function copyFile(src, dest, { dryRun = false, log } = {}) {
  if (dryRun) {
    if (log) log(`dry-run: would copy ${src} → ${dest}`);
    return;
  }
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function removeFile(filePath, { dryRun = false, log } = {}) {
  if (!fs.existsSync(filePath)) return;
  if (dryRun) {
    if (log) log(`dry-run: would remove ${filePath}`);
    return;
  }
  fs.unlinkSync(filePath);
}

module.exports = {
  SUPPORTED_IMAGE_EXTS,
  resolveProjectRoot,
  assertFile,
  assertImageFile,
  ensureDir,
  writeFile,
  copyFile,
  removeFile,
};

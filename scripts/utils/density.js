const path = require('path');
const { copyFile, ensureDir } = require('./fs');
const log = require('./log');

/** mdpi baseline width used when generating density buckets from a single source. */
const DENSITY_SCALE = {
  mdpi: 1,
  hdpi: 1.5,
  xhdpi: 2,
  xxhdpi: 3,
  xxxhdpi: 4,
};

/** Tall phone canvas used to bake CSS-like cover into the bitmap itself. */
const COVER_TARGET = { width: 1080, height: 2400 };

/**
 * Try to load sharp; returns null if unavailable.
 */
function tryLoadSharp() {
  try {
    return require('sharp');
  } catch {
    return null;
  }
}

/**
 * Bake cover (uniform scale + crop) into a portrait PNG so layer-list
 * android:gravity="fill" does not distort the image.
 *
 * @param {string} sourcePath
 * @param {string} destPath
 * @param {{ dryRun?: boolean }} [opts]
 * @returns {Promise<boolean>} true if cover was prepared
 */
async function writeCoverPreparedImage(sourcePath, destPath, { dryRun = false } = {}) {
  const sharp = tryLoadSharp();
  if (!sharp) {
    return false;
  }

  if (dryRun) {
    log.info(
      `dry-run: would cover-crop ${sourcePath} → ${destPath} (${COVER_TARGET.width}x${COVER_TARGET.height})`
    );
    return true;
  }

  ensureDir(path.dirname(destPath));
  await sharp(sourcePath)
    .resize(COVER_TARGET.width, COVER_TARGET.height, {
      fit: 'cover',
      position: 'centre',
    })
    .png()
    .toFile(destPath);

  log.info(
    `Prepared cover splash ${COVER_TARGET.width}x${COVER_TARGET.height} (aspect-fill, no stretch)`
  );
  return true;
}

/**
 * Copy or generate density-specific drawables.
 * When generateDensities is false (default), copies once into drawable/.
 * When resizeMode is cover, prefers a cover-cropped PNG via sharp.
 *
 * @param {object} opts
 * @param {string} opts.sourcePath
 * @param {string} opts.resDir - .../res
 * @param {string} opts.fileName - e.g. splash_image.png
 * @param {boolean} [opts.generateDensities]
 * @param {'cover'|'contain'|'fill'} [opts.resizeMode]
 * @param {boolean} [opts.dryRun]
 */
async function writeAndroidImageAssets({
  sourcePath,
  resDir,
  fileName,
  generateDensities = false,
  resizeMode = 'cover',
  dryRun = false,
}) {
  const drawableDir = path.join(resDir, 'drawable');
  let coverPrepared = false;
  let effectiveFileName = fileName;

  if (resizeMode === 'cover') {
    // Always emit PNG for cover bake so aspect is locked
    effectiveFileName = 'splash_image.png';
    const dest = path.join(drawableDir, effectiveFileName);
    coverPrepared = await writeCoverPreparedImage(sourcePath, dest, { dryRun });
    if (!coverPrepared) {
      log.warn(
        'resizeMode "cover" needs sharp for true aspect-fill on Android. Falling back to centered image (no stretch). Install sharp for proper cover.'
      );
      copyFile(sourcePath, path.join(drawableDir, fileName), { dryRun, log: log.info });
      effectiveFileName = fileName;
    } else if (fileName !== effectiveFileName) {
      // Remove stale non-png copy if we switched extension
      // (caller may clean separately)
    }

    if (!generateDensities || !coverPrepared) {
      return {
        usedDensities: false,
        destinations: [path.join(drawableDir, effectiveFileName)],
        coverPrepared,
        fileName: effectiveFileName,
      };
    }
  }

  if (!generateDensities) {
    const dest = path.join(drawableDir, effectiveFileName);
    if (resizeMode !== 'cover' || !coverPrepared) {
      copyFile(sourcePath, dest, { dryRun, log: log.info });
    }
    return {
      usedDensities: false,
      destinations: [dest],
      coverPrepared,
      fileName: effectiveFileName,
    };
  }

  const sharp = tryLoadSharp();
  if (!sharp) {
    log.warn(
      'generateDensities is enabled but sharp is not installed. Falling back to a single drawable/ copy. Install sharp to enable density generation.'
    );
    const dest = path.join(drawableDir, effectiveFileName);
    if (!(resizeMode === 'cover' && coverPrepared)) {
      copyFile(sourcePath, dest, { dryRun, log: log.info });
    }
    return {
      usedDensities: false,
      destinations: [dest],
      coverPrepared,
      fileName: effectiveFileName,
    };
  }

  const pipelineSource =
    resizeMode === 'cover' && coverPrepared
      ? path.join(drawableDir, effectiveFileName)
      : sourcePath;

  const meta = await sharp(pipelineSource).metadata();
  const width = meta.width;
  if (!width) {
    throw new Error(`Could not read image dimensions from ${pipelineSource}`);
  }

  const baseName = path.basename(effectiveFileName, path.extname(effectiveFileName));
  const outExt = path.extname(effectiveFileName).toLowerCase() || '.png';
  const baseWidth = width / DENSITY_SCALE.xxxhdpi;
  const destinations = [];

  for (const [bucket, scale] of Object.entries(DENSITY_SCALE)) {
    const destDir = path.join(resDir, `drawable-${bucket}`);
    const dest = path.join(destDir, `${baseName}${outExt}`);
    const targetWidth = Math.max(1, Math.round(baseWidth * scale));
    const targetHeight =
      resizeMode === 'cover' && coverPrepared
        ? Math.max(1, Math.round((COVER_TARGET.height / COVER_TARGET.width) * targetWidth))
        : undefined;

    destinations.push(dest);

    if (dryRun) {
      log.info(`dry-run: would write ${dest} (width=${targetWidth})`);
      continue;
    }

    ensureDir(destDir);
    const resizeOpts = targetHeight
      ? { width: targetWidth, height: targetHeight, fit: 'fill' }
      : { width: targetWidth };
    await sharp(pipelineSource).resize(resizeOpts).toFile(dest);
  }

  return {
    usedDensities: true,
    destinations,
    coverPrepared,
    fileName: effectiveFileName,
  };
}

module.exports = {
  DENSITY_SCALE,
  COVER_TARGET,
  tryLoadSharp,
  writeCoverPreparedImage,
  writeAndroidImageAssets,
};

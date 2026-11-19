/**
 * imageNormalizer.js — Shared Image Preprocessing Utility
 * AMIGOS JUGONES — PixelBG, PuzzleBG & VersusBG
 *
 * Normalizes any uploaded image to a consistent quality and resolution
 * before it is processed by the game engines. Runs 100% in the browser.
 *
 * What it does:
 *   1. Detects actual image dimensions.
 *   2. Upscales images smaller than MIN_SIDE (1200px on longest side).
 *   3. Downscales images larger than MAX_SIDE (2500px) for performance.
 *   4. Preserves the original aspect ratio at all times.
 *   5. Applies bicubic-quality smoothing (imageSmoothingQuality = 'high').
 *   6. Applies a 3×3 sharpening convolution to recover crispness after upscale.
 *   7. Returns a new HTMLImageElement ready to replace the raw loadedImage.
 */

const IMAGE_NORMALIZER = (() => {

  const MIN_SIDE = 1200;  // Upscale target for smallest images
  const MAX_SIDE = 2500;  // Downscale cap for very large images

  const SHARPEN_KERNEL = [
     0, -1,  0,
    -1,  5, -1,
     0, -1,  0
  ];

  async function normalizeImage(img) {
    try {
      const origW = img.naturalWidth  || img.width;
      const origH = img.naturalHeight || img.height;

      if (!origW || !origH) return img;

      const { targetW, targetH } = calcTargetDimensions(origW, origH);
      const needsResize = (targetW !== origW || targetH !== origH);

      const canvas = document.createElement('canvas');
      canvas.width  = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetW, targetH);

      if (needsResize && targetW >= origW) {
        applyConvolution(ctx, targetW, targetH, SHARPEN_KERNEL);
      }

      const outImg = await canvasToImage(canvas);
      return outImg || img;
    } catch (err) {
      console.warn('Normalización de imagen omitida por restricción de canvas:', err);
      return img;
    }
  }

  function calcTargetDimensions(w, h) {
    const longestSide = Math.max(w, h);
    let scale = 1;

    if (longestSide < MIN_SIDE) {
      scale = MIN_SIDE / longestSide;
    } else if (longestSide > MAX_SIDE) {
      scale = MAX_SIDE / longestSide;
    }

    return {
      targetW: Math.round(w * scale),
      targetH: Math.round(h * scale)
    };
  }

  function applyConvolution(ctx, w, h, kernel) {
    const srcData  = ctx.getImageData(0, 0, w, h);
    const dstData  = ctx.createImageData(w, h);
    const src = srcData.data;
    const dst = dstData.data;
    const kSize = 3;
    const kHalf = Math.floor(kSize / 2);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let r = 0, g = 0, b = 0;

        for (let ky = 0; ky < kSize; ky++) {
          for (let kx = 0; kx < kSize; kx++) {
            const py = Math.min(h - 1, Math.max(0, y + ky - kHalf));
            const px = Math.min(w - 1, Math.max(0, x + kx - kHalf));
            const idx = (py * w + px) * 4;
            const kVal = kernel[ky * kSize + kx];
            r += src[idx]     * kVal;
            g += src[idx + 1] * kVal;
            b += src[idx + 2] * kVal;
          }
        }

        const dstIdx = (y * w + x) * 4;
        dst[dstIdx]     = Math.min(255, Math.max(0, r));
        dst[dstIdx + 1] = Math.min(255, Math.max(0, g));
        dst[dstIdx + 2] = Math.min(255, Math.max(0, b));
        dst[dstIdx + 3] = src[dstIdx + 3];
      }
    }

    ctx.putImageData(dstData, 0, 0);
  }

  function canvasToImage(canvas) {
    return new Promise((resolve) => {
      try {
        const dataUrl = canvas.toDataURL('image/png');
        const out = new Image();
        out.onload = () => resolve(out);
        out.onerror = () => resolve(null);
        out.src = dataUrl;
      } catch (e) {
        console.warn('canvasToImage export failed:', e);
        resolve(null);
      }
    });
  }

  return { normalizeImage };

})();

if (typeof window !== 'undefined') {
  window.IMAGE_NORMALIZER = IMAGE_NORMALIZER;
}

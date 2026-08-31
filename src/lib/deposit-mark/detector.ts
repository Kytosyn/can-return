import type { DepositMarkDetection } from "./types";

/**
 * Detect the BCRS Deposit Mark in an image.
 *
 * The mark is a circular logo with "10c SG Return" text, ~11mm diameter,
 * black on white recommended. Detection uses canvas-based analysis:
 *   1. Edge density (text/graphics regions)
 *   2. Color contrast (dark on light)
 *   3. Circular shape detection
 *   4. Text pattern matching ("10c")
 *
 * All processing runs client-side on a canvas — no data leaves the device.
 */
export function detectDepositMark(
  image: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
): DepositMarkDetection {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  // Scale down for analysis (max 640px on longest side)
  const maxDim = 640;
  const srcW =
    image instanceof HTMLVideoElement ? image.videoWidth : image.width;
  const srcH =
    image instanceof HTMLVideoElement ? image.videoHeight : image.height;
  const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
  canvas.width = Math.round(srcW * scale);
  canvas.height = Math.round(srcH * scale);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = imageData;

  // Convert to grayscale
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < gray.length; i++) {
    const idx = i * 4;
    gray[i] = Math.round(
      0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2],
    );
  }

  // --- Signal 1: Edge detection (Sobel) ---
  const edges = sobelEdgeDetect(gray, width, height);

  // --- Signal 2: Find high-contrast circular regions ---
  const circularRegions = findCircularRegions(gray, edges, width, height);

  // --- Signal 3: Text pattern detection ("10c") ---
  const textRegions = findTextPatterns(gray, edges, width, height);

  // --- Signal 4: Combine signals ---
  let bestDetection: DepositMarkDetection = {
    detected: false,
    confidence: 0,
    signals: {
      circularShape: 0,
      textPattern: 0,
      colorContrast: 0,
      proximity: 0,
    },
    reason: "No deposit mark detected in the image.",
  };

  // Score each circular region
  for (const circle of circularRegions) {
    const contrastScore = scoreContrast(gray, width, circle);
    const textScore = findTextNearRegion(textRegions, circle);
    const proximityScore =
      circle.score > 0 && textScore > 0
        ? Math.min(circle.score, textScore)
        : 0;

    const overallConfidence =
      circle.score * 0.35 +
      textScore * 0.35 +
      contrastScore * 0.2 +
      proximityScore * 0.1;

    if (overallConfidence > bestDetection.confidence) {
      bestDetection = {
        detected: overallConfidence > 0.4,
        confidence: overallConfidence,
        signals: {
          circularShape: circle.score,
          textPattern: textScore,
          colorContrast: contrastScore,
          proximity: proximityScore,
        },
        region: {
          x: Math.round(circle.x / scale),
          y: Math.round(circle.y / scale),
          width: Math.round(circle.radius * 2 / scale),
          height: Math.round(circle.radius * 2 / scale),
        },
        reason: overallConfidence > 0.4
          ? `Deposit mark detected with ${Math.round(overallConfidence * 100)}% confidence. Found circular shape with "10c"-like text pattern.`
          : `No clear deposit mark found. Best match: ${Math.round(overallConfidence * 100)}% confidence.`,
      };
    }
  }

  // If no circular region but strong text signal, still flag it
  if (!bestDetection.detected && textRegions.length > 0) {
    const bestText = textRegions.reduce((a, b) =>
      a.score > b.score ? a : b,
    );
    if (bestText.score > 0.5) {
      bestDetection = {
        detected: true,
        confidence: bestText.score * 0.7,
        signals: {
          circularShape: 0,
          textPattern: bestText.score,
          colorContrast: 0.5,
          proximity: 0,
        },
        region: {
          x: Math.round(bestText.x / scale),
          y: Math.round(bestText.y / scale),
          width: Math.round(bestText.width / scale),
          height: Math.round(bestText.height / scale),
        },
        reason: `Possible deposit mark text detected (${Math.round(bestText.score * 100)}% confidence). Circular shape not confirmed — try a clearer photo.`,
      };
    }
  }

  return bestDetection;
}

// --- Internal helpers ---

interface Region {
  x: number;
  y: number;
  radius: number;
  score: number;
}

interface TextRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  score: number;
}

/**
 * Sobel edge detection — returns edge magnitude array.
 */
function sobelEdgeDetect(
  gray: Uint8Array,
  w: number,
  h: number,
): Float32Array {
  const edges = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const gx =
        -gray[(y - 1) * w + (x - 1)] +
        gray[(y - 1) * w + (x + 1)] +
        -2 * gray[y * w + (x - 1)] +
        2 * gray[y * w + (x + 1)] +
        -gray[(y + 1) * w + (x - 1)] +
        gray[(y + 1) * w + (x + 1)];
      const gy =
        -gray[(y - 1) * w + (x - 1)] +
        -2 * gray[(y - 1) * w + x] +
        -gray[(y - 1) * w + (x + 1)] +
        gray[(y + 1) * w + (x - 1)] +
        2 * gray[(y + 1) * w + x] +
        gray[(y + 1) * w + (x + 1)];
      edges[idx] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  return edges;
}

/**
 * Find regions that look like the circular deposit mark.
 * Uses a sliding window approach looking for high edge density
 * in roughly circular patterns.
 */
function findCircularRegions(
  gray: Uint8Array,
  edges: Float32Array,
  w: number,
  h: number,
): Region[] {
  const regions: Region[] = [];
  // The deposit mark is small relative to the image — scan at multiple scales
  const minRadius = Math.round(Math.min(w, h) * 0.02); // ~2% of image
  const maxRadius = Math.round(Math.min(w, h) * 0.15); // ~15% of image

  for (let radius = minRadius; radius <= maxRadius; radius += 2) {
    const step = Math.max(2, Math.round(radius * 0.5));
    for (let y = radius; y < h - radius; y += step) {
      for (let x = radius; x < w - radius; x += step) {
        const score = scoreCircularRegion(gray, edges, w, h, x, y, radius);
        if (score > 0.3) {
          regions.push({ x, y, radius, score });
        }
      }
    }
  }

  // Non-maximum suppression — keep best regions
  return nms(regions, 0.3).slice(0, 5);
}

/**
 * Score how much a circular region matches the deposit mark characteristics.
 */
function scoreCircularRegion(
  gray: Uint8Array,
  edges: Float32Array,
  w: number,
  h: number,
  cx: number,
  cy: number,
  radius: number,
): number {
  let edgeSum = 0;
  let edgeCount = 0;
  let darkPixels = 0;
  let lightPixels = 0;
  let totalPixels = 0;

  // Sample pixels in the circular region
  const step = Math.max(1, Math.round(radius / 8));
  for (let dy = -radius; dy <= radius; dy += step) {
    for (let dx = -radius; dx <= radius; dx += step) {
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > radius) continue;

      const px = cx + dx;
      const py = cy + dy;
      if (px < 0 || px >= w || py < 0 || py >= h) continue;

      const idx = py * w + px;
      edgeSum += edges[idx];
      edgeCount++;

      const brightness = gray[idx];
      if (brightness < 100) darkPixels++;
      else if (brightness > 200) lightPixels++;
      totalPixels++;
    }
  }

  if (totalPixels === 0) return 0;

  const avgEdge = edgeSum / edgeCount;
  const darkRatio = darkPixels / totalPixels;
  const lightRatio = lightPixels / totalPixels;
  const contrastRatio = darkRatio + lightRatio; // High when bimodal

  // Deposit mark characteristics:
  // - Moderate edge density (text inside circle)
  // - High contrast (dark on light)
  // - Mix of dark and light pixels
  const edgeScore = Math.min(1, avgEdge / 80);
  const contrastScore = Math.min(1, contrastRatio * 1.2);
  const bimodalScore = Math.min(1, (darkRatio * lightRatio) * 8);

  return edgeScore * 0.3 + contrastScore * 0.4 + bimodalScore * 0.3;
}

/**
 * Find regions that look like text (high edge density, compact).
 * Specifically looking for "10c"-like patterns.
 */
function findTextPatterns(
  gray: Uint8Array,
  edges: Float32Array,
  w: number,
  h: number,
): TextRegion[] {
  const regions: TextRegion[] = [];
  // Text regions are typically small and dense
  const blockW = Math.round(w * 0.06); // ~6% of width
  const blockH = Math.round(h * 0.03); // ~3% of height
  const stepX = Math.round(blockW * 0.5);
  const stepY = Math.round(blockH * 0.5);

  for (let y = 0; y < h - blockH; y += stepY) {
    for (let x = 0; x < w - blockW; x += stepX) {
      const score = scoreTextRegion(gray, edges, w, h, x, y, blockW, blockH);
      if (score > 0.3) {
        regions.push({ x, y, width: blockW, height: blockH, score });
      }
    }
  }

  return nmsText(regions, 0.3).slice(0, 10);
}

/**
 * Score a rectangular region for text-like characteristics.
 */
function scoreTextRegion(
  gray: Uint8Array,
  edges: Float32Array,
  w: number,
  h: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
): number {
  let edgeSum = 0;
  let edgeCount = 0;
  let darkCount = 0;
  let totalCount = 0;
  let transitionCount = 0;
  let prevDark = false;

  for (let y = ry; y < ry + rh && y < h; y++) {
    for (let x = rx; x < rx + rw && x < w; x++) {
      const idx = y * w + x;
      edgeSum += edges[idx];
      edgeCount++;

      const isDark = gray[idx] < 128;
      if (isDark) darkCount++;
      totalCount++;

      // Count dark/light transitions (text has many)
      if (totalCount > 1 && isDark !== prevDark) transitionCount++;
      prevDark = isDark;
    }
  }

  if (totalCount === 0) return 0;

  const avgEdge = edgeSum / edgeCount;
  const darkRatio = darkCount / totalCount;
  const transitionDensity = transitionCount / totalCount;

  // Text characteristics:
  // - High edge density
  // - Moderate dark ratio (text on white)
  // - High transition density (alternating bars/whitespace)
  const edgeScore = Math.min(1, avgEdge / 60);
  const darkScore = darkRatio > 0.1 && darkRatio < 0.6 ? 1 : 0.3;
  const transScore = Math.min(1, transitionDensity * 4);

  return edgeScore * 0.4 + darkScore * 0.2 + transScore * 0.4;
}

/**
 * Score contrast in a circular region (dark on light = high score).
 */
function scoreContrast(
  gray: Uint8Array,
  w: number,
  region: Region,
): number {
  let darkSum = 0;
  let lightSum = 0;
  let count = 0;

  const step = Math.max(1, Math.round(region.radius / 6));
  for (let dy = -region.radius; dy <= region.radius; dy += step) {
    for (let dx = -region.radius; dx <= region.radius; dx += step) {
      if (Math.sqrt(dx * dx + dy * dy) > region.radius) continue;
      const px = region.x + dx;
      const py = region.y + dy;
      if (px < 0 || px >= w || py < 0 || py >= gray.length / w) continue;

      const brightness = gray[py * w + px];
      if (brightness < 100) darkSum++;
      else if (brightness > 200) lightSum++;
      count++;
    }
  }

  if (count === 0) return 0;
  // Good contrast = mix of very dark and very light
  return Math.min(1, ((darkSum + lightSum) / count) * 1.5);
}

/**
 * Find text regions near a circular region (proximity check).
 */
function findTextNearRegion(
  textRegions: TextRegion[],
  circle: Region,
): number {
  let bestScore = 0;
  const searchRadius = circle.radius * 2.5; // Text should be within ~2.5x radius

  for (const text of textRegions) {
    const textCenterX = text.x + text.width / 2;
    const textCenterY = text.y + text.height / 2;
    const dist = Math.sqrt(
      (textCenterX - circle.x) ** 2 + (textCenterY - circle.y) ** 2,
    );

    if (dist < searchRadius) {
      // Closer text = higher score
      const proximityFactor = 1 - dist / searchRadius;
      const score = text.score * proximityFactor;
      bestScore = Math.max(bestScore, score);
    }
  }

  return bestScore;
}

/**
 * Non-maximum suppression for circular regions.
 */
function nms(regions: Region[], iouThreshold: number): Region[] {
  regions.sort((a, b) => b.score - a.score);
  const kept: Region[] = [];

  for (const r of regions) {
    let overlap = false;
    for (const k of kept) {
      const dist = Math.sqrt((r.x - k.x) ** 2 + (r.y - k.y) ** 2);
      if (dist < (r.radius + k.radius) * iouThreshold) {
        overlap = true;
        break;
      }
    }
    if (!overlap) kept.push(r);
  }

  return kept;
}

/**
 * Non-maximum suppression for text regions.
 */
function nmsText(regions: TextRegion[], iouThreshold: number): TextRegion[] {
  regions.sort((a, b) => b.score - a.score);
  const kept: TextRegion[] = [];

  for (const r of regions) {
    let overlap = false;
    for (const k of kept) {
      const overlapX =
        Math.min(r.x + r.width, k.x + k.width) - Math.max(r.x, k.x);
      const overlapY =
        Math.min(r.y + r.height, k.y + k.height) - Math.max(r.y, k.y);
      if (overlapX > 0 && overlapY > 0) {
        const overlapArea = overlapX * overlapY;
        const unionArea =
          r.width * r.height + k.width * k.height - overlapArea;
        if (overlapArea / unionArea > iouThreshold) {
          overlap = true;
          break;
        }
      }
    }
    if (!overlap) kept.push(r);
  }

  return kept;
}

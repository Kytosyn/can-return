import { BarcodeResult, ScanError, ScanOptions } from "./types";

type BarcodeDetectorInstance = {
  detect: (
    source: HTMLVideoElement | HTMLCanvasElement | ImageBitmap,
  ) => Promise<Array<{ rawValue: string; format: string }>>;
};

let detector: BarcodeDetectorInstance | null = null;

async function getDetector(): Promise<BarcodeDetectorInstance> {
  if (detector) return detector;

  // Try native BarcodeDetector (Chrome 83+, Edge 83+)
  if ("BarcodeDetector" in globalThis) {
    const native = new (globalThis as any).BarcodeDetector({
      formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
    });
    detector = native;
    return detector!;
  }

  // Polyfill via barcode-detector package (uses zxing-wasm)
  const { BarcodeDetector: Polyfill } = await import("barcode-detector");
  detector = new Polyfill({
    formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
  }) as unknown as BarcodeDetectorInstance;
  return detector!;
}

function mapFormat(native: string): BarcodeResult["format"] {
  const map: Record<string, BarcodeResult["format"]> = {
    "ean-13": "ean_13",
    ean_13: "ean_13",
    "ean-8": "ean_8",
    ean_8: "ean_8",
    "upc-a": "upc_a",
    upc_a: "upc_a",
    "upc-e": "upc_e",
    upc_e: "upc_e",
    code_128: "code_128",
    code_39: "code_39",
  };
  return map[native] ?? "unknown";
}

/**
 * Scan a barcode from a live camera stream. Resolves with the first
 * detected barcode, or rejects with a ScanError.
 */
export async function scanFromCamera(
  video: HTMLVideoElement,
  opts: ScanOptions = {},
): Promise<BarcodeResult> {
  const { facingMode = "environment", timeoutMs = 30_000 } = opts;

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new ScanError(
      "Camera API not available in this browser.",
      "NOT_SUPPORTED",
    );
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
  } catch (err: any) {
    if (err.name === "NotAllowedError") {
      throw new ScanError("Camera permission denied.", "CAMERA_DENIED");
    }
    throw new ScanError(
      "Could not access camera: " + err.message,
      "CAMERA_UNAVAILABLE",
    );
  }

  video.srcObject = stream;
  video.setAttribute("playsinline", "true");
  await video.play();

  const det = await getDetector();

  return new Promise<BarcodeResult>((resolve, reject) => {
    let animFrame: number;
    let timeout: ReturnType<typeof setTimeout>;
    let settled = false;

    const cleanup = () => {
      settled = true;
      cancelAnimationFrame(animFrame);
      clearTimeout(timeout);
      stream.getTracks().forEach((t) => t.stop());
    };

    const tick = async () => {
      if (settled) return;
      try {
        const results = await det.detect(video);
        if (results.length > 0) {
          cleanup();
          resolve({
            rawValue: results[0].rawValue,
            format: mapFormat(results[0].format),
          });
          return;
        }
      } catch {
        // detection frame error — skip
      }
      animFrame = requestAnimationFrame(tick);
    };

    timeout = setTimeout(() => {
      cleanup();
      reject(new ScanError("Scan timed out — no barcode detected.", "TIMEOUT"));
    }, timeoutMs);

    tick();
  });
}

/**
 * Scan a barcode from a still image (e.g. from a file input or photo).
 */
export async function scanFromImage(
  image: HTMLImageElement | HTMLCanvasElement | ImageBitmap,
): Promise<BarcodeResult | null> {
  const det = await getDetector();
  const results = await det.detect(image as any);
  if (results.length === 0) return null;
  return {
    rawValue: results[0].rawValue,
    format: mapFormat(results[0].format),
  };
}

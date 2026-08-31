import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { scanFromCamera } from "../../lib/barcode/scanner";
import { classifyPackaging, videoToCanvas, initClassifier, subscribeClassifier } from "../../lib/classifier/packaging-classifier";
import { detectDepositMark } from "../../lib/deposit-mark/detector";
import type { BarcodeResult } from "../../lib/barcode/types";
import type { ClassificationResult, ClassifierState } from "../../lib/classifier/types";
import type { DepositMarkDetection } from "../../lib/deposit-mark/types";
import type { EligibilityResult } from "../../lib/eligibility/types";
import { Button } from "../ui/Button";

// Detection intervals (ms)
const BARCODE_INTERVAL = 100;    // every frame-ish
const CLASSIFY_INTERVAL = 800;   // every 800ms
const DEPOSIT_INTERVAL = 1200;   // every 1.2s
const BLUR_THRESHOLD = 30;       // Laplacian variance threshold

interface LiveResults {
  barcode: string | null;
  eligibility: EligibilityResult | null;
  classification: ClassificationResult | null;
  depositMark: DepositMarkDetection | null;
}

interface Props {
  onEligibilityResult: (barcode: string, result: EligibilityResult) => void;
}

export function UnifiedScanner({ onEligibilityResult }: Props) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastClassifyRef = useRef(0);
  const lastDepositRef = useRef(0);
  const lastBarcodeRef = useRef(0);
  const barcodeLockRef = useRef(false);

  const [cameraActive, setCameraActive] = useState(false);
  const [classifierState, setClassifierState] = useState<ClassifierState>({
    ready: false, loadingMessage: null, error: null,
  });
  const [results, setResults] = useState<LiveResults>({
    barcode: null, eligibility: null, classification: null, depositMark: null,
  });
  const [processing, setProcessing] = useState({ classify: false, deposit: false });

  // Init classifier on mount
  useEffect(() => {
    const unsub = subscribeClassifier(setClassifierState);
    initClassifier().catch(() => {});
    return unsub;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera();
  }, []);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        setCameraActive(true);
        startDetectionLoop();
      }
    } catch (err: any) {
      const msg = err.name === "NotAllowedError"
        ? t("barcode.cameraDenied")
        : t("barcode.cameraUnavailable");
      setResults((r) => ({ ...r, barcode: null }));
    }
  }, [t]);

  // --- Blur detection ---
  const isFrameClear = useCallback((video: HTMLVideoElement): boolean => {
    const canvas = canvasRef.current;
    if (!canvas) return true;
    const ctx = canvas.getContext("2d");
    if (!ctx) return true;

    // Downsample for speed
    const w = 160, h = 120;
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(video, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;

    // Convert to grayscale
    const gray = new Float32Array(w * h);
    for (let i = 0; i < gray.length; i++) {
      const idx = i * 4;
      gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    }

    // Laplacian variance
    let sum = 0, sumSq = 0, count = 0;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const lap = -4 * gray[y * w + x]
          + gray[(y - 1) * w + x] + gray[(y + 1) * w + x]
          + gray[y * w + (x - 1)] + gray[y * w + (x + 1)];
        sum += lap;
        sumSq += lap * lap;
        count++;
      }
    }
    const mean = sum / count;
    const variance = sumSq / count - mean * mean;
    return variance > BLUR_THRESHOLD;
  }, []);

  // --- Detection loop ---
  const startDetectionLoop = useCallback(() => {
    const loop = async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(loop);
        return;
      }

      const now = performance.now();

      // 1. Barcode detection (every BARCODE_INTERVAL)
      if (now - lastBarcodeRef.current > BARCODE_INTERVAL && !barcodeLockRef.current) {
        lastBarcodeRef.current = now;
        try {
          // Use native BarcodeDetector directly for speed
          if ("BarcodeDetector" in globalThis) {
            const detector = new (globalThis as any).BarcodeDetector({
              formats: ["ean_13", "ean_8", "upc_a", "upc_e"],
            });
            const detected = await detector.detect(video);
            if (detected.length > 0) {
              const raw = detected[0].rawValue;
              barcodeLockRef.current = true;
              setResults((r) => ({ ...r, barcode: raw }));
              // Dispatch eligibility check
              const { checkEligibility } = await import("../../lib/eligibility/matcher");
              const { useAppStore } = await import("../../store");
              const db = useAppStore.getState().eligibilityDb;
              const eligibility = checkEligibility(raw, db);
              setResults((r) => ({ ...r, eligibility }));
              onEligibilityResult(raw, eligibility);
            }
          }
        } catch {
          // No barcode in frame — normal
        }
      }

      // 2. Packaging classification (every CLASSIFY_INTERVAL, on clear frames)
      if (
        now - lastClassifyRef.current > CLASSIFY_INTERVAL
        && classifierState.ready
        && !processing.classify
        && isFrameClear(video)
      ) {
        lastClassifyRef.current = now;
        setProcessing((p) => ({ ...p, classify: true }));
        try {
          const canvas = videoToCanvas(video);
          const classification = await classifyPackaging(canvas);
          setResults((r) => ({ ...r, classification }));
        } catch {
          // Skip frame
        }
        setProcessing((p) => ({ ...p, classify: false }));
      }

      // 3. Deposit mark detection (every DEPOSIT_INTERVAL, on clear frames)
      if (
        now - lastDepositRef.current > DEPOSIT_INTERVAL
        && !processing.deposit
        && isFrameClear(video)
      ) {
        lastDepositRef.current = now;
        setProcessing((p) => ({ ...p, deposit: true }));
        try {
          const depositMark = detectDepositMark(video);
          setResults((r) => ({ ...r, depositMark }));
        } catch {
          // Skip frame
        }
        setProcessing((p) => ({ ...p, deposit: false }));
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
  }, [classifierState.ready, processing.classify, processing.deposit, isFrameClear, onEligibilityResult]);

  const handleReset = useCallback(() => {
    barcodeLockRef.current = false;
    setResults({ barcode: null, eligibility: null, classification: null, depositMark: null });
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {/* Camera feed with overlay */}
      <div className="relative w-full aspect-[4/3] bg-gray-900 rounded-2xl overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Scanning guide overlay */}
        {cameraActive && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Corner brackets */}
            <div className="absolute top-6 left-6 w-12 h-12 border-l-2 border-t-2 border-white/40 rounded-tl-lg" />
            <div className="absolute top-6 right-6 w-12 h-12 border-r-2 border-t-2 border-white/40 rounded-tr-lg" />
            <div className="absolute bottom-6 left-6 w-12 h-12 border-l-2 border-b-2 border-white/40 rounded-bl-lg" />
            <div className="absolute bottom-6 right-6 w-12 h-12 border-r-2 border-b-2 border-white/40 rounded-br-lg" />

            {/* Live results overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-12">
              <LiveResultsOverlay results={results} processing={processing} classifierReady={classifierState.ready} />
            </div>

            {/* Status indicators */}
            <div className="absolute top-3 left-3 flex gap-1.5">
              <StatusDot active={cameraActive} label="Camera" />
              <StatusDot active={classifierState.ready} label="AI" loading={!classifierState.ready} />
              {processing.classify && <StatusDot active label="Scanning" pulse />}
              {processing.deposit && <StatusDot active label="Checking" pulse />}
            </div>
          </div>
        )}

        {/* Idle state */}
        {!cameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <span className="text-5xl">📷</span>
            <p className="text-white/70 text-sm text-center px-6">
              {t("barcode.tapToScan")}
            </p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        {!cameraActive ? (
          <Button onClick={startCamera} className="flex-1" size="lg">
            {t("barcode.startScanning")}
          </Button>
        ) : (
          <>
            <Button onClick={stopCamera} variant="secondary" className="flex-1">
              Stop
            </Button>
            {results.barcode && (
              <Button onClick={handleReset} variant="ghost" className="flex-1">
                Reset
              </Button>
            )}
          </>
        )}
      </div>

      <p className="text-xs text-center text-gray-500">
        {t("scan.privacyNote")}
      </p>
    </div>
  );
}

// --- Sub-components ---

function StatusDot({ active, label, loading, pulse }: {
  active: boolean; label: string; loading?: boolean; pulse?: boolean;
}) {
  return (
    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
      active ? "bg-green-900/80 text-green-300" : "bg-gray-800/80 text-gray-400"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        active ? "bg-green-400" : "bg-gray-500"
      } ${pulse ? "animate-pulse" : ""}`} />
      {loading ? "Loading…" : label}
    </div>
  );
}

function LiveResultsOverlay({ results, processing, classifierReady }: {
  results: LiveResults;
  processing: { classify: boolean; deposit: boolean };
  classifierReady: boolean;
}) {
  const { t } = useTranslation();
  const hasAny = results.barcode || results.classification || results.depositMark;

  if (!hasAny && !processing.classify && !processing.deposit) {
    return (
      <p className="text-white/50 text-xs text-center">
        Point at a beverage container…
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {/* Barcode + eligibility */}
      {results.barcode && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
          results.eligibility?.verdict === "eligible"
            ? "bg-green-900/90 text-green-200"
            : results.eligibility?.verdict === "not_eligible"
              ? "bg-red-900/90 text-red-200"
              : "bg-amber-900/90 text-amber-200"
        }`}>
          <span className="text-lg">
            {results.eligibility?.verdict === "eligible" ? "✅"
              : results.eligibility?.verdict === "not_eligible" ? "❌" : "⚠️"}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">
              {results.eligibility?.verdict === "eligible"
                ? t("eligibility.eligible")
                : results.eligibility?.verdict === "not_eligible"
                  ? t("eligibility.notEligible")
                  : t("eligibility.uncertain")}
            </p>
            <p className="text-xs opacity-75 font-mono">{results.barcode}</p>
          </div>
        </div>
      )}

      {/* Classification + deposit mark row */}
      <div className="flex gap-2">
        {/* Container type */}
        {results.classification && (
          <div className="flex-1 bg-gray-800/90 rounded-lg px-3 py-2 text-xs">
            <p className="text-gray-400 mb-0.5">Container</p>
            <p className="text-white font-medium">{results.classification.label}</p>
            <p className="text-gray-500">{Math.round(results.classification.confidence * 100)}%</p>
          </div>
        )}

        {/* Deposit mark */}
        {results.depositMark && (
          <div className={`flex-1 rounded-lg px-3 py-2 text-xs ${
            results.depositMark.detected ? "bg-green-900/90" : "bg-gray-800/90"
          }`}>
            <p className="text-gray-400 mb-0.5">10c Mark</p>
            <p className={`font-medium ${results.depositMark.detected ? "text-green-300" : "text-gray-300"}`}>
              {results.depositMark.detected ? "Detected" : "Not found"}
            </p>
            <p className="text-gray-500">{Math.round(results.depositMark.confidence * 100)}%</p>
          </div>
        )}

        {/* Loading placeholders */}
        {!results.classification && classifierReady && (
          <div className="flex-1 bg-gray-800/60 rounded-lg px-3 py-2 text-xs animate-pulse">
            <p className="text-gray-500">Container</p>
            <p className="text-gray-600">Scanning…</p>
          </div>
        )}
        {!results.depositMark && (
          <div className="flex-1 bg-gray-800/60 rounded-lg px-3 py-2 text-xs animate-pulse">
            <p className="text-gray-500">10c Mark</p>
            <p className="text-gray-600">Scanning…</p>
          </div>
        )}
      </div>
    </div>
  );
}

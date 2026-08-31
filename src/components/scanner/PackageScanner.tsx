import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { initClassifier, classifyPackaging, videoToCanvas, fileToImage, subscribeClassifier } from "../../lib/classifier/packaging-classifier";
import type { ClassificationResult, ClassifierState } from "../../lib/classifier/types";
import { Button } from "../ui/Button";

interface Props {
  onClassified: (result: ClassificationResult) => void;
  onError?: (message: string) => void;
}

export function PackageScanner({ onClassified, onError }: Props) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [classifierState, setClassifierState] = useState<ClassifierState>({ ready: false, loadingMessage: null, error: null });
  const [cameraActive, setCameraActive] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const unsub = subscribeClassifier(setClassifierState);
    initClassifier().catch(() => {});
    return unsub;
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.setAttribute("playsinline", "true"); await videoRef.current.play(); setCameraActive(true); }
    } catch (err: any) { onError?.(err.name === "NotAllowedError" ? t("barcode.cameraDenied") : t("barcode.cameraUnavailable")); }
  }, [onError, t]);

  const stopCamera = useCallback(() => { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; setCameraActive(false); }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const handleCapture = useCallback(async () => {
    if (!videoRef.current || !classifierState.ready) return;
    setAnalysing(true);
    try { const canvas = videoToCanvas(videoRef.current); const result = await classifyPackaging(canvas); stopCamera(); onClassified(result); }
    catch (err: any) { onError?.(err.message ?? "Classification failed"); }
    finally { setAnalysing(false); }
  }, [classifierState.ready, onClassified, onError, stopCamera]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !classifierState.ready) return;
    setAnalysing(true);
    try { const img = await fileToImage(file); const result = await classifyPackaging(img); onClassified(result); }
    catch (err: any) { onError?.(err.message ?? "Classification failed"); }
    finally { setAnalysing(false); }
  }, [classifierState.ready, onClassified, onError]);

  return (
    <div className="flex flex-col items-center gap-4">
      {!classifierState.ready && (
        <div className="w-full bg-blue-950 border border-blue-800 rounded-xl p-3 text-sm text-blue-300 text-center">
          {classifierState.loadingMessage ?? t("package.preparing")}
          {classifierState.error && <p className="text-red-400 mt-1">{classifierState.error}</p>}
        </div>
      )}

      <div className="relative w-full aspect-[4/3] bg-gray-900 rounded-2xl overflow-hidden">
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
        {!cameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <span className="text-4xl">📦</span>
            <p className="text-white/70 text-sm text-center px-4">{t("package.takePhoto")}</p>
          </div>
        )}
        {analysing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <p className="text-white font-medium">{t("package.analysing")}</p>
          </div>
        )}
      </div>

      <div className="w-full flex gap-3">
        {!cameraActive ? (
          <>
            <Button onClick={startCamera} disabled={!classifierState.ready} className="flex-1">{t("package.openCamera")}</Button>
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={!classifierState.ready} className="flex-1">{t("package.uploadPhoto")}</Button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
          </>
        ) : (
          <Button onClick={handleCapture} disabled={analysing} className="flex-1" size="lg">
            {analysing ? t("package.analysing") : t("package.identifyContainer")}
          </Button>
        )}
      </div>

      <p className="text-xs text-center text-gray-500">{t("package.privacyNote")}</p>
    </div>
  );
}

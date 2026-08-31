import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { detectDepositMark } from "../../lib/deposit-mark/detector";
import type { DepositMarkDetection } from "../../lib/deposit-mark/types";
import { Button } from "../ui/Button";

interface Props {
  onDetected: (result: DepositMarkDetection) => void;
  onError?: (message: string) => void;
}

export function DepositMarkScanner({ onDetected, onError }: Props) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.setAttribute("playsinline", "true"); await videoRef.current.play(); setCameraActive(true); }
    } catch (err: any) { onError?.(err.name === "NotAllowedError" ? t("barcode.cameraDenied") : t("barcode.cameraUnavailable")); }
  }, [onError, t]);

  const stopCamera = useCallback(() => { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; setCameraActive(false); }, []);

  const handleCapture = useCallback(() => {
    if (!videoRef.current) return;
    setAnalysing(true);
    try { const result = detectDepositMark(videoRef.current); stopCamera(); onDetected(result); }
    catch (err: any) { onError?.(err.message ?? "Detection failed"); }
    finally { setAnalysing(false); }
  }, [onDetected, onError, stopCamera]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAnalysing(true);
    try {
      const img = new Image();
      const url = URL.createObjectURL(file);
      await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error("Failed to load image")); img.src = url; });
      URL.revokeObjectURL(url);
      const result = detectDepositMark(img);
      onDetected(result);
    } catch (err: any) { onError?.(err.message ?? "Detection failed"); }
    finally { setAnalysing(false); }
  }, [onDetected, onError]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full aspect-[4/3] bg-gray-900 rounded-2xl overflow-hidden">
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
        {!cameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <span className="text-4xl">🔍</span>
            <p className="text-white/70 text-sm text-center px-6" dangerouslySetInnerHTML={{ __html: t("depositMark.pointCamera") }} />
          </div>
        )}
        {cameraActive && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-40 h-40 border-2 border-white/50 rounded-full" />
            <p className="absolute bottom-4 text-white/60 text-xs">{t("depositMark.centreCircle")}</p>
          </div>
        )}
        {analysing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <p className="text-white font-medium">{t("depositMark.analysing")}</p>
          </div>
        )}
      </div>

      <div className="w-full flex gap-3">
        {!cameraActive ? (
          <>
            <Button onClick={startCamera} className="flex-1">{t("depositMark.openCamera")}</Button>
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="flex-1">{t("depositMark.uploadPhoto")}</Button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
          </>
        ) : (
          <Button onClick={handleCapture} disabled={analysing} className="flex-1" size="lg">
            {analysing ? t("depositMark.analysing") : t("depositMark.checkForMark")}
          </Button>
        )}
      </div>

      <div className="text-xs text-center text-gray-500 space-y-1">
        <p>{t("depositMark.aboutMark")}</p>
        <p>{t("depositMark.privacyNote")}</p>
      </div>
    </div>
  );
}

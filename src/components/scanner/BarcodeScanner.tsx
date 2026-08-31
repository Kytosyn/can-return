import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { scanFromCamera } from "../../lib/barcode/scanner";
import type { BarcodeResult, ScanStatus } from "../../lib/barcode/types";
import { Button } from "../ui/Button";

interface Props {
  onDetected: (result: BarcodeResult) => void;
  onError?: (message: string) => void;
}

export function BarcodeScanner({ onDetected, onError }: Props) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [lastError, setLastError] = useState<string | null>(null);

  // Stop camera stream on unmount
  useEffect(() => {
    return () => {
      const video = videoRef.current;
      if (video?.srcObject) {
        (video.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
        video.srcObject = null;
      }
    };
  }, []);

  const startScan = useCallback(async () => {
    if (!videoRef.current) return;
    setStatus("requesting-camera");
    setLastError(null);
    try {
      const result = await scanFromCamera(videoRef.current, {
        facingMode: "environment",
        timeoutMs: 30_000,
      });
      setStatus("detected");
      onDetected(result);
    } catch (err: any) {
      setStatus("error");
      const msg = err.message ?? "Scan failed";
      setLastError(msg);
      onError?.(msg);
    }
  }, [onDetected, onError]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full aspect-[4/3] bg-gray-900 rounded-2xl overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
        />
        {status === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-white/70 text-sm">{t("barcode.tapToScan")}</p>
          </div>
        )}
        {status === "requesting-camera" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-white/70 text-sm">{t("barcode.requestingCamera")}</p>
          </div>
        )}
      </div>

      {lastError && (
        <p className="text-red-600 text-sm text-center">{lastError}</p>
      )}

      <Button
        onClick={startScan}
        disabled={status === "requesting-camera"}
        size="lg"
        className="w-full"
      >
        {status === "error" ? t("barcode.tryAgain") : t("barcode.startScanning")}
      </Button>
    </div>
  );
}

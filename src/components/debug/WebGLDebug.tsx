import { useEffect, useState } from "react";

interface DebugInfo {
  webgl: boolean;
  webgl2: boolean;
  renderer: string;
  vendor: string;
  mapboxToken: boolean;
  mapboxTokenPreview: string;
  userAgent: string;
  screenSize: string;
  pixelRatio: number;
}

function getWebGLInfo(): DebugInfo {
  const info: DebugInfo = {
    webgl: false,
    webgl2: false,
    renderer: "unknown",
    vendor: "unknown",
    mapboxToken: false,
    mapboxTokenPreview: "",
    userAgent: navigator.userAgent.slice(0, 80) + "…",
    screenSize: `${window.innerWidth}x${window.innerHeight}`,
    pixelRatio: window.devicePixelRatio || 1,
  };

  // Check WebGL 1
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl");
    if (gl) {
      info.webgl = true;
      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
      if (debugInfo) {
        info.renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "unknown";
        info.vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || "unknown";
      }
    }
  } catch {}

  // Check WebGL 2
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    if (gl) info.webgl2 = true;
  } catch {}

  // Check Mapbox token
  const token = (import.meta.env.VITE_MAPBOX_TOKEN as string) || "";
  info.mapboxToken = token.length > 0;
  info.mapboxTokenPreview = token ? `${token.slice(0, 10)}…${token.slice(-4)}` : "NOT SET";

  return info;
}

export function WebGLDebug() {
  const [info, setInfo] = useState<DebugInfo | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setInfo(getWebGLInfo());
  }, []);

  if (!info) return null;

  const allGood = info.webgl && info.mapboxToken;

  return (
    <div className="fixed top-2 right-2 z-[9999] max-w-xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`text-xs px-2 py-1 rounded-lg font-mono border ${
          allGood
            ? "bg-green-900/90 border-green-700 text-green-300"
            : "bg-red-900/90 border-red-700 text-red-300"
        }`}
      >
        {allGood ? "✅ WebGL OK" : "❌ WebGL Issue"}
      </button>

      {expanded && info && (
        <div className="mt-1 bg-gray-900 border border-gray-700 rounded-xl p-3 text-xs font-mono space-y-1.5 shadow-xl">
          <Row label="WebGL 1" value={info.webgl ? "✅ Yes" : "❌ No"} ok={info.webgl} />
          <Row label="WebGL 2" value={info.webgl2 ? "✅ Yes" : "⚠️ No"} ok={info.webgl2} />
          <Row label="GPU" value={info.renderer} ok={info.renderer !== "unknown"} />
          <Row label="Vendor" value={info.vendor} ok={info.vendor !== "unknown"} />
          <Row label="Mapbox Token" value={info.mapboxTokenPreview} ok={info.mapboxToken} />
          <Row label="Screen" value={info.screenSize} ok />
          <Row label="DPR" value={String(info.pixelRatio)} ok />
          <div className="pt-1 text-gray-500 text-[10px] break-all">{info.userAgent}</div>

          <button
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(info, null, 2));
            }}
            className="w-full mt-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-gray-300 text-[10px]"
          >
            Copy debug info
          </button>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-gray-400 shrink-0">{label}</span>
      <span className={ok ? "text-green-400 text-right truncate" : "text-red-400 text-right truncate"}>
        {value}
      </span>
    </div>
  );
}

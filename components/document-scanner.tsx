"use client";

/**
 * DocumentScanner — kamera tabanlı belge tarayıcı
 *
 * Akış:
 *  idle → opening (getUserMedia) → scanning (canlı kamera + edge highlight) →
 *  captured (önizleme) → done (blob döner)
 *
 * jscanify + OpenCV.js yüklendiyse belge kenarlarını otomatik tespit eder;
 * yüklenmediyse ham kare kullanılır (progressive enhancement).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Camera, Check, RefreshCw, ScanSearch, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// OpenCV ve jscanify global tipleri
declare global {
  interface Window {
    cv?: unknown;
    jscanify?: new () => JscanifyInstance;
  }
}

interface JscanifyInstance {
  highlightPaper(img: HTMLCanvasElement): HTMLCanvasElement;
  extractPaper(img: HTMLCanvasElement, w: number, h: number): HTMLCanvasElement;
}

type ScannerState = "idle" | "opening" | "scanning" | "captured" | "error";

interface Props {
  /** Tarama tamamlandığında Blob döner */
  onCapture: (blob: Blob) => void;
  /** Modal kapandığında çağrılır */
  onClose: () => void;
}

const OPENCV_CDN = "https://docs.opencv.org/4.8.0/opencv.js";
const JSCANIFY_CDN =
  "https://cdn.jsdelivr.net/npm/jscanify@1.2.0/src/jscanify.js";

export function DocumentScanner({ onCapture, onClose }: Props) {
  const t = useTranslations("Scanner");

  const videoRef = useRef<HTMLVideoElement>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannerRef = useRef<JscanifyInstance | null>(null);
  const rafRef = useRef<number>(0);
  const loadedRef = useRef(false);

  const [state, setState] = useState<ScannerState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [scannerReady, setScannerReady] = useState(false);

  // OpenCV + jscanify CDN'den yükle (bir kez)
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    function tryInitScanner() {
      if (window.cv && window.jscanify) {
        try {
          scannerRef.current = new window.jscanify();
          setScannerReady(true);
        } catch {
          // CDN yüklenemedi veya API değişti — fallback ile devam
        }
      }
    }

    function loadScript(src: string, cb: () => void) {
      if (document.querySelector(`script[src="${src}"]`)) {
        cb();
        return;
      }
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = cb;
      s.onerror = () => {}; // sessiz başarısızlık — ham kare fallback
      document.head.appendChild(s);
    }

    loadScript(OPENCV_CDN, () => {
      // OpenCV yüklendi; jscanify yükle
      loadScript(JSCANIFY_CDN, () => {
        // Her ikisi yüklendi; cv.onRuntimeInitialized bekle
        const checkCv = setInterval(() => {
          if (window.cv && (window.cv as { Mat?: unknown }).Mat !== undefined) {
            clearInterval(checkCv);
            tryInitScanner();
          }
        }, 200);
        // 10 saniye sonra vazgeç
        setTimeout(() => clearInterval(checkCv), 10_000);
      });
    });
  }, []);

  // Kamerayı başlat
  const openCamera = useCallback(async () => {
    setState("opening");
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setState("scanning");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Kamera açılamadı";
      setError(msg);
      setState("error");
    }
  }, []);

  // Kamerayı kapat
  const closeCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // Canlı kenar tespiti — her kare
  useEffect(() => {
    if (state !== "scanning") return;

    let running = true;

    function drawFrame() {
      if (!running) return;
      const video = videoRef.current;
      const canvas = liveCanvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(drawFrame);
        return;
      }

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (vw === 0 || vh === 0) {
        rafRef.current = requestAnimationFrame(drawFrame);
        return;
      }

      canvas.width = vw;
      canvas.height = vh;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        rafRef.current = requestAnimationFrame(drawFrame);
        return;
      }

      ctx.drawImage(video, 0, 0, vw, vh);

      // jscanify hazırsa belge kenarlarını vurgula
      if (scannerRef.current) {
        try {
          const highlighted = scannerRef.current.highlightPaper(canvas);
          ctx.drawImage(highlighted, 0, 0);
        } catch {
          // Hata sessizce yoksay (cv işlemi başarısız)
        }
      }

      rafRef.current = requestAnimationFrame(drawFrame);
    }

    rafRef.current = requestAnimationFrame(drawFrame);

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [state]);

  // Kapat
  useEffect(() => {
    return () => closeCamera();
  }, [closeCamera]);

  // Fotoğraf çek
  function capture() {
    const video = videoRef.current;
    const preview = previewCanvasRef.current;
    if (!video || !preview) return;

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    // Önce ham kareyi geçici canvas'a al
    const tmp = document.createElement("canvas");
    tmp.width = vw;
    tmp.height = vh;
    const tctx = tmp.getContext("2d");
    if (!tctx) return;
    tctx.drawImage(video, 0, 0);

    // jscanify varsa belgeyi kenar tespiti ile kes
    if (scannerRef.current) {
      try {
        const extracted = scannerRef.current.extractPaper(tmp, vw, vh);
        preview.width = extracted.width;
        preview.height = extracted.height;
        const pctx = preview.getContext("2d");
        pctx?.drawImage(extracted, 0, 0);
      } catch {
        // Fallback: ham kare
        preview.width = vw;
        preview.height = vh;
        preview.getContext("2d")?.drawImage(tmp, 0, 0);
      }
    } else {
      preview.width = vw;
      preview.height = vh;
      preview.getContext("2d")?.drawImage(tmp, 0, 0);
    }

    cancelAnimationFrame(rafRef.current);
    setState("captured");
  }

  // Onayla → blob oluştur ve döndür
  function confirm() {
    const preview = previewCanvasRef.current;
    if (!preview) return;
    preview.toBlob(
      (blob) => {
        if (blob) {
          closeCamera();
          onCapture(blob);
          onClose();
        }
      },
      "image/jpeg",
      0.9,
    );
  }

  // Yeniden dene
  function retry() {
    setState("scanning");
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("ariaLabel")}
      className="fixed inset-0 z-50 flex flex-col bg-black"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 text-white">
        <span className="flex items-center gap-2 text-sm font-medium">
          <ScanSearch className="size-4" />
          {scannerReady ? t("titleWithScan") : t("title")}
        </span>
        <button
          onClick={() => {
            closeCamera();
            onClose();
          }}
          aria-label={t("close")}
          className="rounded-full p-1 hover:bg-white/10"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* Main area */}
      <div className="relative flex-1 overflow-hidden">
        {/* Video stream (scanning state) */}
        <video
          ref={videoRef}
          playsInline
          muted
          className={`absolute inset-0 h-full w-full object-cover ${
            state === "scanning" ? "opacity-0" : "hidden"
          }`}
        />

        {/* Live canvas with edge highlight */}
        <canvas
          ref={liveCanvasRef}
          className={`absolute inset-0 h-full w-full object-contain ${
            state === "scanning" ? "" : "hidden"
          }`}
        />

        {/* Preview canvas after capture */}
        <canvas
          ref={previewCanvasRef}
          className={`absolute inset-0 h-full w-full object-contain ${
            state === "captured" ? "" : "hidden"
          }`}
        />

        {/* Idle / Opening */}
        {(state === "idle" || state === "opening") && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-white">
            {state === "idle" ? (
              <>
                <Camera className="size-12 opacity-60" />
                <Button onClick={openCamera} size="lg">
                  {t("openCamera")}
                </Button>
              </>
            ) : (
              <>
                <Camera className="size-12 animate-pulse opacity-60" />
                <p className="text-sm opacity-70">{t("opening")}</p>
              </>
            )}
          </div>
        )}

        {/* Error */}
        {state === "error" && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-white">
            <p className="text-sm text-red-400">{error ?? t("cameraError")}</p>
            <Button variant="outline" onClick={openCamera}>
              {t("retry")}
            </Button>
          </div>
        )}

        {/* Scanning guide overlay */}
        {state === "scanning" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-3/4 w-11/12 rounded-lg border-2 border-white/40 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" />
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="flex items-center justify-center gap-4 p-6">
        {state === "scanning" && (
          <button
            onClick={capture}
            aria-label={t("capture")}
            className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-white/20 transition-transform active:scale-95"
          >
            <div className="h-12 w-12 rounded-full bg-white" />
          </button>
        )}

        {state === "captured" && (
          <>
            <Button
              variant="outline"
              size="lg"
              onClick={retry}
              className="border-white/30 text-white hover:bg-white/10"
            >
              <RefreshCw className="size-4" />
              {t("retake")}
            </Button>
            <Button size="lg" onClick={confirm}>
              <Check className="size-4" />
              {t("use")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";

function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState("");
  const [facing, setFacing] = useState("user");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewBlob, setPreviewBlob] = useState(null);

  useEffect(() => {
    if (previewBlob) return; // Não rearma a câmera enquanto está em preview
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing, previewBlob]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Câmera não suportada neste navegador");
      return;
    }
    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error(err);
      setError(
        "Não foi possível acessar a câmera. Verifique as permissões do navegador."
      );
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    // Espelha se for câmera frontal (mais natural)
    if (facing === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setPreviewBlob(blob);
        setPreviewUrl(URL.createObjectURL(blob));
        stopCamera();
      },
      "image/jpeg",
      0.92
    );
  };

  const handleRetake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewBlob(null);
    setPreviewUrl(null);
  };

  const handleSend = () => {
    if (!previewBlob) return;
    const file = new File([previewBlob], `photo-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });
    onCapture(file);
  };

  const handleFlip = () => {
    setFacing((f) => (f === "user" ? "environment" : "user"));
  };

  return (
    <div className="fixed inset-0 bg-black z-[70] flex flex-col">
      <header className="flex items-center justify-between p-3 text-white">
        <button
          type="button"
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-full transition"
          aria-label="Fechar câmera"
          title="Fechar"
        >
          <CloseIcon />
        </button>
        {!previewBlob && !error && (
          <button
            type="button"
            onClick={handleFlip}
            className="p-2 hover:bg-white/10 rounded-full transition"
            aria-label="Trocar câmera"
            title="Trocar câmera"
          >
            <FlipIcon />
          </button>
        )}
        {previewBlob && <div className="w-10" />}
      </header>

      <div className="flex-1 flex items-center justify-center overflow-hidden">
        {error ? (
          <div className="text-center text-white p-6">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg"
            >
              Fechar
            </button>
          </div>
        ) : previewUrl ? (
          <img
            src={previewUrl}
            alt="Foto capturada"
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`max-w-full max-h-full object-contain ${
              facing === "user" ? "scale-x-[-1]" : ""
            }`}
          />
        )}
      </div>

      <footer className="p-6 flex items-center justify-center gap-8">
        {previewBlob ? (
          <>
            <button
              type="button"
              onClick={handleRetake}
              className="px-5 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-full font-semibold transition"
            >
              Refazer
            </button>
            <button
              type="button"
              onClick={handleSend}
              className="px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-full font-semibold transition flex items-center gap-2"
            >
              <SendIcon /> Enviar
            </button>
          </>
        ) : !error ? (
          <button
            type="button"
            onClick={handleCapture}
            className="w-16 h-16 rounded-full bg-white hover:bg-slate-200 transition flex items-center justify-center"
            aria-label="Capturar foto"
            title="Capturar foto"
          >
            <span className="w-12 h-12 rounded-full border-4 border-slate-900" />
          </button>
        ) : null}
      </footer>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function FlipIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 4v6h-6" />
      <path d="M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
      <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

export default CameraCapture;

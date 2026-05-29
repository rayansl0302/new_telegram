import { useEffect } from "react";
import { createPortal } from "react-dom";

function MediaLightbox({ src, onClose }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);

    // trava scroll do body enquanto o lightbox está aberto
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const handleDownload = async (e) => {
    e.stopPropagation();
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const filename =
        src.split("/").pop()?.split("?")[0] || `imagem-${Date.now()}.jpg`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download falhou, abrindo em nova aba:", err);
      window.open(src, "_blank", "noopener,noreferrer");
    }
  };

  const handleOpenNewTab = (e) => {
    e.stopPropagation();
    window.open(src, "_blank", "noopener,noreferrer");
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Visualizar imagem"
    >
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <button
          type="button"
          onClick={handleOpenNewTab}
          className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition"
          title="Abrir em nova aba"
          aria-label="Abrir em nova aba"
        >
          <ExternalIcon />
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition"
          title="Baixar"
          aria-label="Baixar imagem"
        >
          <DownloadIcon />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition"
          title="Fechar (Esc)"
          aria-label="Fechar"
        >
          <CloseIcon />
        </button>
      </div>

      <img
        src={src}
        alt=""
        className="max-w-full max-h-full object-contain select-none"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body
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

function DownloadIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export default MediaLightbox;

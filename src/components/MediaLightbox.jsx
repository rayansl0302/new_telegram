import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

function MediaLightbox({ src, images, initialIndex = 0, onClose }) {
  const items = useMemo(() => {
    if (Array.isArray(images) && images.length > 0) return images;
    if (src) return [src];
    return [];
  }, [images, src]);

  const [index, setIndex] = useState(() =>
    Math.min(Math.max(initialIndex || 0, 0), Math.max(items.length - 1, 0))
  );

  const current = items[index];
  const canPrev = index > 0;
  const canNext = index < items.length - 1;

  const goPrev = () => canPrev && setIndex((i) => i - 1);
  const goNext = () => canNext && setIndex((i) => i + 1);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") {
        if (canPrev) setIndex((i) => i - 1);
      } else if (e.key === "ArrowRight") {
        if (canNext) setIndex((i) => i + 1);
      }
    };
    document.addEventListener("keydown", handler);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, canPrev, canNext]);

  const handleDownload = async (e) => {
    e.stopPropagation();
    try {
      const response = await fetch(current);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const filename =
        current.split("/").pop()?.split("?")[0] || `imagem-${Date.now()}.jpg`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download falhou, abrindo em nova aba:", err);
      window.open(current, "_blank", "noopener,noreferrer");
    }
  };

  const handleOpenNewTab = (e) => {
    e.stopPropagation();
    window.open(current, "_blank", "noopener,noreferrer");
  };

  if (!current) return null;

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

      {items.length > 1 && (
        <div className="absolute top-4 left-4 bg-white/10 text-white rounded-full px-3 py-1.5 text-sm z-10 tabular-nums">
          {index + 1} / {items.length}
        </div>
      )}

      {canPrev && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition z-10"
          title="Anterior (←)"
          aria-label="Imagem anterior"
        >
          <ChevronLeftIcon />
        </button>
      )}
      {canNext && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition z-10"
          title="Próxima (→)"
          aria-label="Próxima imagem"
        >
          <ChevronRightIcon />
        </button>
      )}

      <img
        src={current}
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

function ChevronLeftIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export default MediaLightbox;

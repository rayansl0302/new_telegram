import { useEffect, useRef } from "react";

const FAVICON_SIZE = 64;

export function useFaviconBadge(count) {
  const originalHrefRef = useRef(null);

  useEffect(() => {
    // 1) App Badge para PWA instalado (Windows taskbar, macOS dock, Android home).
    //    Esse é o "badge" que aparece no ícone do app.
    if ("setAppBadge" in navigator) {
      if (count > 0) {
        navigator.setAppBadge(count).catch(() => {});
      } else if ("clearAppBadge" in navigator) {
        navigator.clearAppBadge().catch(() => {});
      }
    }

    // 2) Favicon badge (aba do navegador).
    const link = ensureFaviconLink();
    if (originalHrefRef.current === null) {
      originalHrefRef.current =
        link.href || `${window.location.origin}/favicon.svg`;
    }

    if (count <= 0) {
      link.href = originalHrefRef.current;
      return;
    }

    let cancelled = false;

    overlayBadge(originalHrefRef.current, count)
      .then((dataUrl) => {
        if (!cancelled) link.href = dataUrl;
      })
      .catch(() => {
        if (!cancelled) link.href = generateFallbackBadge(count);
      });

    return () => {
      cancelled = true;
    };
  }, [count]);
}

function ensureFaviconLink() {
  let link = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  return link;
}

function overlayBadge(originalHref, count) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = FAVICON_SIZE;
        canvas.height = FAVICON_SIZE;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, FAVICON_SIZE, FAVICON_SIZE);
        drawBadge(ctx, count);
        resolve(canvas.toDataURL("image/png"));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error("Falha ao carregar favicon original"));
    img.src = originalHref;
  });
}

function generateFallbackBadge(count) {
  const canvas = document.createElement("canvas");
  canvas.width = FAVICON_SIZE;
  canvas.height = FAVICON_SIZE;
  const ctx = canvas.getContext("2d");

  // Fundo arredondado azul
  ctx.fillStyle = "#0ea5e9";
  ctx.beginPath();
  ctx.arc(
    FAVICON_SIZE / 2,
    FAVICON_SIZE / 2,
    FAVICON_SIZE / 2 - 2,
    0,
    2 * Math.PI
  );
  ctx.fill();

  // Letra "T"
  ctx.fillStyle = "white";
  ctx.font = "bold 36px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("T", FAVICON_SIZE / 2, FAVICON_SIZE / 2 + 1);

  drawBadge(ctx, count);
  return canvas.toDataURL("image/png");
}

function drawBadge(ctx, count) {
  // Círculo vermelho
  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.arc(48, 16, 18, 0, 2 * Math.PI);
  ctx.fill();

  // Borda branca para destacar contra qualquer fundo
  ctx.strokeStyle = "white";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(48, 16, 18, 0, 2 * Math.PI);
  ctx.stroke();

  // Número
  ctx.fillStyle = "white";
  ctx.font = "bold 20px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(count > 9 ? "9+" : String(count), 48, 17);
}

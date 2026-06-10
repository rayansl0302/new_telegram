// Formata mensagens copiadas no estilo WhatsApp:
//   [HH:MM, DD/MM/YYYY] Nome: texto
//
// Lê os data attributes que MessageBubble grava no wrapper de cada
// mensagem (data-message-id / sender / timestamp / text) e formata.

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatLine(el) {
  const sender = el.dataset.messageSender || "Alguém";
  const text = el.dataset.messageText || "";
  const tsRaw = el.dataset.messageTimestamp;
  const ts = tsRaw ? Number(tsRaw) : NaN;

  let timeBlock = "";
  if (Number.isFinite(ts) && ts > 0) {
    const dt = new Date(ts);
    timeBlock = `[${pad2(dt.getHours())}:${pad2(dt.getMinutes())}, ${pad2(
      dt.getDate()
    )}/${pad2(dt.getMonth() + 1)}/${dt.getFullYear()}] `;
  }

  return `${timeBlock}${sender}: ${text}`;
}

/**
 * Retorna os elementos `[data-message-id]` dentro de `container` que estão
 * (mesmo parcialmente) cobertos pela seleção atual do navegador.
 */
export function getSelectedMessageElements(container) {
  const selection = typeof window !== "undefined" ? window.getSelection() : null;
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return [];
  }
  const nodes = container.querySelectorAll("[data-message-id]");
  return Array.from(nodes).filter((el) => {
    try {
      return selection.containsNode(el, true);
    } catch {
      return false;
    }
  });
}

/**
 * Junta as mensagens em um bloco de texto estilo WhatsApp, uma por linha,
 * na ordem em que aparecem no DOM (já é cronológica).
 */
export function formatMessagesAsWhatsApp(elements) {
  return elements
    .map(formatLine)
    .filter((line) => line.trim().length > 0)
    .join("\n");
}

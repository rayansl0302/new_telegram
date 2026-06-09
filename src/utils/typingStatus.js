// Quão antiga (ms) uma marcação de typing pode estar antes de ser considerada
// stale. Tem que ser maior que o timeout client-side de typing (5s) + um buffer.
const TYPING_FRESH_MS = 7000;

/**
 * Devolve uma string tipo "digitando..." ou "Alguém está gravando áudio..."
 * pra ser exibida em ChatHeader/ChatListItem. Retorna null quando ninguém
 * está digitando (ou só o próprio usuário está).
 */
export function getTypingLabel(chat, currentUserId, isGroup) {
  if (!chat || !chat.typing) return null;
  const map = chat.typing;
  const now = Date.now();

  const active = Object.entries(map).filter(([uid, info]) => {
    if (!info || !info.state) return false;
    if (uid === currentUserId) return false;
    const updatedMs = info.updatedAt?.toMillis?.() || 0;
    if (updatedMs && now - updatedMs > TYPING_FRESH_MS) return false;
    return true;
  });

  if (active.length === 0) return null;

  if (active.length === 1) {
    const [uid, info] = active[0];
    const verb = info.state === "recording" ? "gravando áudio" : "digitando";
    if (isGroup) {
      const fullName =
        chat.participantInfo?.[uid]?.displayName ||
        chat.participantInfo?.[uid]?.email ||
        "Alguém";
      const firstName = fullName.split(" ")[0];
      return `${firstName} está ${verb}...`;
    }
    return `${verb}...`;
  }

  // Vários ao mesmo tempo
  const allRecording = active.every(([, i]) => i.state === "recording");
  if (allRecording) {
    return `${active.length} pessoas gravando áudio...`;
  }
  return `${active.length} pessoas digitando...`;
}

import { useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useChats } from "../hooks/useChats";
import { useFaviconBadge } from "../hooks/useFaviconBadge";

const BASE_TITLE = "Telegram Clone";

/**
 * Atualiza title da aba e favicon badge globalmente, em qualquer rota,
 * enquanto o usuário estiver autenticado. Renderiza nada visualmente.
 */
function GlobalNotifications() {
  const { user } = useAuth();
  const { chats } = useChats(user?.uid);

  const unreadCount = useMemo(() => {
    if (!user) return 0;
    let count = 0;
    for (const chat of chats) {
      if (!chat.lastMessage) continue;
      if (chat.lastMessage.senderId === user.uid) continue;
      const lastReadMs = chat.lastRead?.[user.uid]?.toMillis?.() || 0;
      const lastMsgMs = chat.lastMessage.createdAt?.toMillis?.() || 0;
      if (lastMsgMs > lastReadMs) count++;
    }
    return count;
  }, [chats, user]);

  useEffect(() => {
    document.title =
      unreadCount > 0 ? `(${unreadCount}) ${BASE_TITLE}` : BASE_TITLE;
    return () => {
      document.title = BASE_TITLE;
    };
  }, [unreadCount]);

  useFaviconBadge(unreadCount);

  return null;
}

export default GlobalNotifications;

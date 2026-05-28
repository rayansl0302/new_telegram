import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useChats } from "../hooks/useChats";
import { useNotifications } from "../hooks/useNotifications";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";

function ChatPage() {
  const { user } = useAuth();
  const [selectedChatId, setSelectedChatId] = useState(null);
  const { chats, loading } = useChats(user?.uid);

  const selectedChat = useMemo(
    () => chats.find((c) => c.id === selectedChatId) || null,
    [chats, selectedChatId]
  );

  const unreadChatIds = useMemo(() => {
    const set = new Set();
    for (const chat of chats) {
      if (!chat.lastMessage) continue;
      if (chat.lastMessage.senderId === user?.uid) continue;
      const lastReadMs = chat.lastRead?.[user?.uid]?.toMillis?.() || 0;
      const lastMsgMs = chat.lastMessage.createdAt?.toMillis?.() || 0;
      if (lastMsgMs > lastReadMs) set.add(chat.id);
    }
    return set;
  }, [chats, user?.uid]);

  useEffect(() => {
    const count = unreadChatIds.size;
    document.title = count > 0 ? `(${count}) Telegram Clone` : "Telegram Clone";
    return () => {
      document.title = "Telegram Clone";
    };
  }, [unreadChatIds.size]);

  useNotifications({
    chats,
    currentUserId: user?.uid,
    selectedChatId,
  });

  const showChatOnMobile = Boolean(selectedChatId);

  return (
    <div className="h-dvh flex bg-slate-900 text-white overflow-hidden">
      <Sidebar
        chats={chats}
        loading={loading}
        unreadChatIds={unreadChatIds}
        selectedChatId={selectedChatId}
        onSelectChatId={setSelectedChatId}
        className={`w-full md:w-80 ${showChatOnMobile ? "hidden md:flex" : "flex"}`}
      />
      <div
        className={`flex-1 flex flex-col min-w-0 min-h-0 ${
          showChatOnMobile ? "flex" : "hidden md:flex"
        }`}
      >
        <ChatWindow
          chat={selectedChat}
          onBack={() => setSelectedChatId(null)}
          onGroupLeft={() => setSelectedChatId(null)}
        />
      </div>
    </div>
  );
}

export default ChatPage;

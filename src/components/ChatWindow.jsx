import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useMessages } from "../hooks/useMessages";
import { markChatAsRead } from "../services/chatService";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import MessageSearchBar from "./MessageSearchBar";
import EmptyChat from "./EmptyChat";
import ChatInfoPanel from "./ChatInfoPanel";

function ChatWindow({ chat, onBack, onGroupLeft }) {
  const { user } = useAuth();
  const { messages, loading } = useMessages(chat?.id);
  const [showInfo, setShowInfo] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Reset estados quando troca de chat
  useEffect(() => {
    setShowInfo(false);
    setReplyingTo(null);
    setSearchOpen(false);
    setSearchQuery("");
    setCurrentMatchIndex(0);
  }, [chat?.id]);

  // Marca como lido sempre que abre o chat ou chega mensagem nova
  useEffect(() => {
    if (!chat?.id || !user?.uid) return;
    markChatAsRead(chat.id, user.uid).catch((err) =>
      console.error("markChatAsRead:", err)
    );
  }, [chat?.id, user?.uid, messages.length]);

  // Calcula matches da busca (case + diacritic insensitive)
  const matchIds = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return [];
    const norm = normalize(q);
    return messages
      .filter((m) => m.text && normalize(m.text).includes(norm))
      .map((m) => m.id);
  }, [searchQuery, messages]);

  const matchedIdsSet = useMemo(() => new Set(matchIds), [matchIds]);
  const currentMatchId = matchIds[currentMatchIndex] || null;

  // Quando a query muda, posiciona no ÚLTIMO match (mais recente, como WhatsApp)
  useEffect(() => {
    if (matchIds.length > 0) {
      setCurrentMatchIndex(matchIds.length - 1);
    } else {
      setCurrentMatchIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Scroll para o match atual
  useEffect(() => {
    if (!currentMatchId) return;
    const el = document.getElementById(`msg-${currentMatchId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentMatchId]);

  if (!chat) return <EmptyChat />;

  const handleReply = (message) => {
    const isOwn = message.senderId === user.uid;
    const senderInfo = chat.participantInfo?.[message.senderId] || {};
    const senderName = isOwn
      ? "Você"
      : senderInfo.displayName || senderInfo.email || "Alguém";
    setReplyingTo({
      messageId: message.id,
      senderId: message.senderId,
      senderName,
      text: message.text || "",
      imageUrl: message.imageUrl || null,
    });
  };

  const handleNextMatch = () => {
    if (matchIds.length === 0) return;
    setCurrentMatchIndex((i) => (i + 1) % matchIds.length);
  };

  const handlePrevMatch = () => {
    if (matchIds.length === 0) return;
    setCurrentMatchIndex((i) => (i - 1 + matchIds.length) % matchIds.length);
  };

  const handleCloseSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
    setCurrentMatchIndex(0);
  };

  return (
    <main className="flex-1 flex min-h-0 bg-slate-900">
      <div
        className={`flex-1 flex-col min-h-0 bg-slate-900 ${
          showInfo ? "hidden md:flex" : "flex"
        }`}
      >
        <ChatHeader
          chat={chat}
          currentUserId={user.uid}
          onBack={onBack}
          onOpenInfo={() => setShowInfo(true)}
          onToggleSearch={() => setSearchOpen((s) => !s)}
          searchActive={searchOpen}
        />

        {searchOpen && (
          <MessageSearchBar
            query={searchQuery}
            onChange={setSearchQuery}
            matchCount={matchIds.length}
            currentIndex={
              matchIds.length > 0 ? currentMatchIndex + 1 : 0
            }
            onPrev={handlePrevMatch}
            onNext={handleNextMatch}
            onClose={handleCloseSearch}
          />
        )}

        <MessageList
          messages={messages}
          currentUserId={user.uid}
          loading={loading}
          chat={chat}
          onReply={handleReply}
          matchedIds={matchedIdsSet}
          currentMatchId={currentMatchId}
        />

        <MessageInput
          chatId={chat.id}
          senderId={user.uid}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
        />
      </div>

      {showInfo && (
        <ChatInfoPanel
          chat={chat}
          messages={messages}
          onClose={() => setShowInfo(false)}
          onLeftGroup={onGroupLeft}
        />
      )}
    </main>
  );
}

function normalize(str) {
  return str.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export default ChatWindow;

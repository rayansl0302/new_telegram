import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Avatar from "./Avatar";
import ChatListItem from "./ChatListItem";
import NewChatDialog from "./NewChatDialog";
import NewGroupDialog from "./NewGroupDialog";

function Sidebar({
  chats,
  loading,
  unreadChatIds,
  selectedChatId,
  onSelectChatId,
  className = "",
}) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);

  const filteredChats = chats.filter((chat) => {
    const isGroup = chat.type === "group";
    let name;
    if (isGroup) {
      name = chat.name || "";
    } else {
      const otherId = chat.participants.find((p) => p !== user.uid);
      const info = chat.participantInfo?.[otherId];
      name = info?.displayName || info?.email || "";
    }
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const contacts = useMemo(() => {
    const map = new Map();
    chats
      .filter((c) => c.type !== "group")
      .forEach((chat) => {
        const otherId = chat.participants.find((p) => p !== user.uid);
        const info = chat.participantInfo?.[otherId];
        if (info && otherId && !map.has(otherId)) {
          map.set(otherId, { uid: otherId, ...info });
        }
      });
    return Array.from(map.values());
  }, [chats, user?.uid]);

  return (
    <aside
      className={`bg-slate-950 border-r border-slate-800 flex flex-col min-h-0 shrink-0 ${className}`}
    >
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950 shrink-0">
        <h1 className="text-xl font-semibold">Conversas</h1>
        <Link
          to="/profile"
          className="p-2 hover:bg-slate-800 rounded-full transition"
          title="Meu perfil"
          aria-label="Meu perfil"
        >
          <Avatar
            src={user?.photoURL}
            name={user?.displayName || user?.email}
            size={36}
          />
        </Link>
      </header>

      <Link
        to="/profile"
        className="hidden md:flex p-4 border-b border-slate-800 items-center gap-3 hover:bg-slate-900 transition"
        title="Abrir perfil"
      >
        <Avatar
          src={user?.photoURL}
          name={user?.displayName || user?.email}
          size={40}
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">
            {user?.displayName || user?.email}
          </p>
          <p className="text-xs text-slate-500 truncate">{user?.email}</p>
        </div>
        <ChevronIcon />
      </Link>

      <div className="p-3 border-b border-slate-800">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar conversa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
          <SearchIcon className="absolute left-3 top-2.5 text-slate-500" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <p className="text-center text-slate-500 p-4">Carregando...</p>
        )}
        {!loading && filteredChats.length === 0 && (
          <p className="text-center text-slate-500 p-4 text-sm">
            Nenhuma conversa ainda.
          </p>
        )}
        {filteredChats.map((chat) => (
          <ChatListItem
            key={chat.id}
            chat={chat}
            currentUserId={user.uid}
            isSelected={chat.id === selectedChatId}
            isUnread={unreadChatIds?.has(chat.id)}
            onClick={() => onSelectChatId(chat.id)}
          />
        ))}
      </div>

      <div className="m-3 grid grid-cols-2 gap-2 shrink-0">
        <button
          onClick={() => setShowNewChat(true)}
          className="py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-lg transition flex items-center justify-center gap-2"
        >
          <PlusIcon /> Conversa
        </button>
        <button
          onClick={() => setShowNewGroup(true)}
          title="Criar novo grupo"
          className="py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition flex items-center justify-center gap-2"
        >
          <GroupIcon /> Grupo
        </button>
      </div>

      {showNewChat && (
        <NewChatDialog
          onClose={() => setShowNewChat(false)}
          onChatCreated={(chat) => {
            setShowNewChat(false);
            onSelectChatId(chat.id);
          }}
        />
      )}

      {showNewGroup && (
        <NewGroupDialog
          contacts={contacts}
          onClose={() => setShowNewGroup(false)}
          onGroupCreated={(groupId) => {
            setShowNewGroup(false);
            onSelectChatId(groupId);
          }}
        />
      )}
    </aside>
  );
}

function SearchIcon({ className }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function GroupIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500 flex-shrink-0">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export default Sidebar;

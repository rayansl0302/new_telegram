function EmptyChat() {
  return (
    <main className="flex-1 flex items-center justify-center bg-slate-900 min-h-0">
      <div className="text-center max-w-sm px-6">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
          <ChatIcon />
        </div>
        <h2 className="text-xl font-semibold mb-2">Selecione uma conversa</h2>
        <p className="text-slate-400 text-sm">
          Escolha um chat à esquerda ou inicie uma nova conversa.
        </p>
      </div>
    </main>
  );
}

function ChatIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-slate-500"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export default EmptyChat;

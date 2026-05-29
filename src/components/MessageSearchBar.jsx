import { useEffect, useRef } from "react";

function MessageSearchBar({
  query,
  onChange,
  matchCount,
  currentIndex,
  onPrev,
  onNext,
  onClose,
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) onPrev();
      else onNext();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="px-3 md:px-4 py-2 border-b border-slate-800 bg-slate-950/95 backdrop-blur flex items-center gap-2 shrink-0">
      <div className="flex-1 relative">
        <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Buscar nesta conversa..."
          value={query}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
        />
      </div>

      {query.trim() && (
        <>
          <span className="text-xs text-slate-400 tabular-nums whitespace-nowrap min-w-[3rem] text-center">
            {matchCount > 0 ? `${currentIndex}/${matchCount}` : "0/0"}
          </span>
          <button
            type="button"
            onClick={onPrev}
            disabled={matchCount === 0}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
            title="Anterior (Shift+Enter)"
            aria-label="Resultado anterior"
          >
            <ChevronUpIcon />
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={matchCount === 0}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
            title="Próximo (Enter)"
            aria-label="Próximo resultado"
          >
            <ChevronDownIcon />
          </button>
        </>
      )}

      <button
        type="button"
        onClick={onClose}
        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition flex-shrink-0"
        title="Fechar (Esc)"
        aria-label="Fechar busca"
      >
        <CloseIcon />
      </button>
    </div>
  );
}

function SearchIcon({ className }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function ChevronUpIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default MessageSearchBar;

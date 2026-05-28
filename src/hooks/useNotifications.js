import { useEffect, useRef } from "react";

export function useNotifications({ chats, currentUserId, selectedChatId }) {
  const lastSeenTimes = useRef(new Map());
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    if (isFirstLoad.current) {
      for (const chat of chats) {
        const t = chat.lastMessage?.createdAt?.toMillis?.() || 0;
        lastSeenTimes.current.set(chat.id, t);
      }
      isFirstLoad.current = false;
      return;
    }

    for (const chat of chats) {
      const t = chat.lastMessage?.createdAt?.toMillis?.() || 0;
      const prev = lastSeenTimes.current.get(chat.id) || 0;

      if (t > prev) {
        lastSeenTimes.current.set(chat.id, t);

        const isOwn = chat.lastMessage?.senderId === currentUserId;
        const isViewingActive =
          chat.id === selectedChatId && !document.hidden;

        if (!isOwn && !isViewingActive) {
          playBeep();
          if (document.hidden) {
            showBrowserNotification(chat);
          }
        }
      }
    }
  }, [chats, currentUserId, selectedChatId]);
}

function playBeep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);

    setTimeout(() => ctx.close().catch(() => {}), 500);
  } catch (e) {
    console.warn("Som de notificação falhou:", e);
  }
}

function showBrowserNotification(chat) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const isGroup = chat.type === "group";
  const senderId = chat.lastMessage?.senderId;
  const senderInfo = chat.participantInfo?.[senderId] || {};
  const senderName =
    senderInfo.displayName || senderInfo.email || "Alguém";

  const title = isGroup ? chat.name || "Grupo" : senderName;
  const text = chat.lastMessage?.text || "[Imagem]";
  const body = isGroup ? `${senderName}: ${text}` : text;
  const icon = isGroup ? chat.photoURL : senderInfo.photoURL;

  try {
    const notif = new Notification(title, {
      body,
      icon: icon || undefined,
      tag: chat.id,
    });
    notif.onclick = () => {
      window.focus();
      notif.close();
    };
  } catch (e) {
    console.warn("Browser notification falhou:", e);
  }
}

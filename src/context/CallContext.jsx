import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { CallSession, rejectIncomingCall } from "../services/callService";
import {
  createGroupCall,
  GroupCallSession,
} from "../services/groupCallService";
import { useAuth } from "./AuthContext";
import { useIncomingCalls } from "../hooks/useIncomingCalls";
import CallScreen from "../components/CallScreen";
import IncomingCallDialog from "../components/IncomingCallDialog";
import GroupCallScreen from "../components/GroupCallScreen";

const CallContext = createContext({
  startCall: () => {},
  startGroupCall: () => {},
  joinGroupCall: () => {},
  activeCall: null,
});

function translateError(err) {
  const name = err?.name || "";
  const code = err?.code || "";
  if (name === "NotAllowedError" || code === "permission-denied") {
    return "Permissão de microfone/câmera foi negada. Habilite nas configurações do navegador.";
  }
  if (name === "NotFoundError") {
    return "Nenhum microfone ou câmera detectado neste dispositivo.";
  }
  if (name === "NotReadableError") {
    return "O microfone/câmera está em uso por outro aplicativo.";
  }
  if (name === "OverconstrainedError") {
    return "Câmera/microfone não suporta a configuração solicitada.";
  }
  if (name === "SecurityError") {
    return "Acesso bloqueado por motivo de segurança (precisa de HTTPS).";
  }
  return err?.message || "Erro desconhecido ao iniciar a chamada.";
}

export function CallProvider({ children }) {
  const { user } = useAuth();
  const incoming = useIncomingCalls(user?.uid);

  // activeCall: { kind: "direct" | "group", session, type, peer/chat, role/_, status, error }
  const [activeCall, setActiveCall] = useState(null);
  const [ringTone, setRingTone] = useState(false);
  const ringIntervalRef = useRef(null);

  const closeActiveCall = useCallback(() => {
    setActiveCall((curr) => {
      try {
        curr?.session?.cleanup?.();
      } catch (e) {
        // ignora
      }
      return null;
    });
  }, []);

  // ─────────────────────────────────────────────────────────────
  // 1-on-1
  // ─────────────────────────────────────────────────────────────
  const startCall = useCallback(
    async (peer, type = "audio") => {
      if (!user || activeCall) return;

      const session = new CallSession();
      const initialState = {
        kind: "direct",
        session,
        type,
        peer,
        role: "caller",
        status: "connecting",
        error: null,
      };

      session.onStatusChange = (status) => {
        setActiveCall((curr) => (curr ? { ...curr, status } : null));
        if (status === "rejected") {
          setTimeout(() => closeActiveCall(), 1500);
        }
        if (status === "failed") {
          setActiveCall((curr) =>
            curr ? { ...curr, error: "A conexão falhou. Tente novamente." } : null
          );
        }
        if (status === "ended") {
          closeActiveCall();
        }
      };

      setActiveCall(initialState);
      try {
        await session.startCall(
          {
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
          },
          peer,
          type
        );
        setActiveCall((curr) => (curr ? { ...curr, status: "ringing" } : null));
      } catch (err) {
        console.error("[startCall] falhou:", err);
        const msg = translateError(err);
        setActiveCall((curr) => (curr ? { ...curr, error: msg } : null));
        try {
          session.cleanup();
        } catch (e) {
          // ignora
        }
      }
    },
    [user, activeCall, closeActiveCall]
  );

  const answerIncoming = useCallback(async () => {
    if (!incoming || activeCall) return;

    const session = new CallSession();
    const initialState = {
      kind: "direct",
      session,
      type: incoming.type,
      peer: {
        uid: incoming.callerId,
        displayName: incoming.callerInfo?.displayName,
        photoURL: incoming.callerInfo?.photoURL,
      },
      role: "callee",
      status: "connecting",
      error: null,
    };

    session.onStatusChange = (status) => {
      setActiveCall((curr) => (curr ? { ...curr, status } : null));
      if (status === "failed") {
        setActiveCall((curr) =>
          curr ? { ...curr, error: "A conexão falhou." } : null
        );
      }
      if (status === "ended" || status === "rejected") {
        closeActiveCall();
      }
    };

    setActiveCall(initialState);
    try {
      await session.answerCall(incoming.id);
    } catch (err) {
      console.error("[answerCall] falhou:", err);
      const msg = translateError(err);
      setActiveCall((curr) => (curr ? { ...curr, error: msg } : null));
      try {
        session.cleanup();
      } catch (e) {
        // ignora
      }
    }
  }, [incoming, activeCall, closeActiveCall]);

  const rejectIncoming = useCallback(async () => {
    if (!incoming) return;
    try {
      await rejectIncomingCall(incoming.id);
    } catch (err) {
      console.error("rejectIncoming falhou:", err);
    }
  }, [incoming]);

  // ─────────────────────────────────────────────────────────────
  // Grupos
  // ─────────────────────────────────────────────────────────────

  const _joinGroupSession = useCallback(
    async (callId, chat, type) => {
      if (!user || activeCall) return;

      const session = new GroupCallSession(callId, type, {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
      });
      // Anexa info do user pro tile local
      session.currentUser = {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
      };

      const initialState = {
        kind: "group",
        session,
        type,
        chat,
        status: "connecting",
        error: null,
      };

      session.onStatusChange = (status) => {
        setActiveCall((curr) => (curr ? { ...curr, status } : null));
        if (status === "failed") {
          setActiveCall((curr) =>
            curr ? { ...curr, error: "A conexão falhou." } : null
          );
        }
        if (status === "ended") {
          closeActiveCall();
        }
      };

      setActiveCall(initialState);
      try {
        await session.start();
      } catch (err) {
        console.error("[groupCall] start falhou:", err);
        const msg = translateError(err);
        setActiveCall((curr) => (curr ? { ...curr, error: msg } : null));
        try {
          session.cleanup();
        } catch (e) {
          // ignora
        }
      }
    },
    [user, activeCall, closeActiveCall]
  );

  const startGroupCall = useCallback(
    async (chat, type = "audio") => {
      if (!user || activeCall) return;
      try {
        const callId = await createGroupCall(chat.id, type, {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
        });
        await _joinGroupSession(callId, chat, type);
      } catch (err) {
        console.error("[startGroupCall] falhou:", err);
        alert("Erro ao iniciar chamada em grupo");
      }
    },
    [user, activeCall, _joinGroupSession]
  );

  const joinGroupCall = useCallback(
    async (callId, chat, type) => {
      await _joinGroupSession(callId, chat, type);
    },
    [_joinGroupSession]
  );

  const handleLeave = useCallback(async () => {
    if (!activeCall) return;
    if (activeCall.kind === "group") {
      try {
        await activeCall.session?.leave();
      } catch (e) {
        // ignora
      }
    } else {
      try {
        await activeCall.session?.endCall();
      } catch (e) {
        // ignora
      }
    }
    closeActiveCall();
  }, [activeCall, closeActiveCall]);

  // ─────────────────────────────────────────────────────────────
  // Ringtone para chamadas 1-on-1 recebidas
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    setRingTone(Boolean(incoming) && !activeCall);
  }, [incoming, activeCall]);

  useEffect(() => {
    if (!ringTone) {
      if (ringIntervalRef.current) {
        clearInterval(ringIntervalRef.current);
        ringIntervalRef.current = null;
      }
      return;
    }
    const playBeep = () => {
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
        osc.frequency.setValueAtTime(660, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
        setTimeout(() => ctx.close().catch(() => {}), 800);
      } catch (e) {
        // ignora
      }
    };
    playBeep();
    ringIntervalRef.current = setInterval(playBeep, 1500);
    return () => {
      if (ringIntervalRef.current) {
        clearInterval(ringIntervalRef.current);
        ringIntervalRef.current = null;
      }
    };
  }, [ringTone]);

  return (
    <CallContext.Provider
      value={{ startCall, startGroupCall, joinGroupCall, activeCall }}
    >
      {children}
      {ringTone && incoming && (
        <IncomingCallDialog
          incoming={incoming}
          onAccept={answerIncoming}
          onReject={rejectIncoming}
        />
      )}
      {activeCall?.kind === "direct" && (
        <CallScreen callState={activeCall} onEnd={handleLeave} />
      )}
      {activeCall?.kind === "group" && (
        <GroupCallScreen callState={activeCall} onLeave={handleLeave} />
      )}
    </CallContext.Provider>
  );
}

export function useCall() {
  return useContext(CallContext);
}

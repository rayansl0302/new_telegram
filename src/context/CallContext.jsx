import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { CallSession, rejectIncomingCall } from "../services/callService";
import { useAuth } from "./AuthContext";
import { useIncomingCalls } from "../hooks/useIncomingCalls";
import CallScreen from "../components/CallScreen";
import IncomingCallDialog from "../components/IncomingCallDialog";

const CallContext = createContext({
  startCall: () => {},
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

  // activeCall: { session, type, peer, role, status, error }
  const [activeCall, setActiveCall] = useState(null);
  const [ringTone, setRingTone] = useState(false);
  const ringIntervalRef = useRef(null);

  const closeActiveCall = useCallback(() => {
    setActiveCall((curr) => {
      try {
        curr?.session?.cleanup();
      } catch (e) {
        // ignora
      }
      return null;
    });
  }, []);

  const startCall = useCallback(
    async (peer, type = "audio") => {
      if (!user) return;
      if (activeCall) return;

      const session = new CallSession();
      const initialState = {
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
            curr
              ? { ...curr, error: "A conexão falhou. Tente novamente." }
              : null
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
        setActiveCall((curr) =>
          curr ? { ...curr, status: "ringing" } : null
        );
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

  // Toca ringtone enquanto há chamada recebida não atendida
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

  const handleEndCall = useCallback(async () => {
    if (!activeCall) return;
    try {
      await activeCall.session?.endCall();
    } catch (e) {
      // ignora
    }
    closeActiveCall();
  }, [activeCall, closeActiveCall]);

  return (
    <CallContext.Provider value={{ startCall, activeCall }}>
      {children}
      {ringTone && incoming && (
        <IncomingCallDialog
          incoming={incoming}
          onAccept={answerIncoming}
          onReject={rejectIncoming}
        />
      )}
      {activeCall && (
        <CallScreen callState={activeCall} onEnd={handleEndCall} />
      )}
    </CallContext.Provider>
  );
}

export function useCall() {
  return useContext(CallContext);
}

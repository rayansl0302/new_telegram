import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { CallSession, rejectIncomingCall } from "../services/callService";
import { useAuth } from "./AuthContext";
import { useIncomingCalls } from "../hooks/useIncomingCalls";
import CallScreen from "../components/CallScreen";
import IncomingCallDialog from "../components/IncomingCallDialog";

const CallContext = createContext({
  startCall: () => {},
  activeCall: null,
});

export function CallProvider({ children }) {
  const { user } = useAuth();
  const incoming = useIncomingCalls(user?.uid);

  // activeCall: { session, type, peer, role, status }
  const [activeCall, setActiveCall] = useState(null);
  const [ringTone, setRingTone] = useState(false);
  const ringIntervalRef = useRef(null);

  const startCall = useCallback(
    async (peer, type = "audio") => {
      if (!user) return;
      if (activeCall) return; // já em chamada

      const session = new CallSession();
      const callState = {
        session,
        type,
        peer,
        role: "caller",
        status: "ringing",
      };
      session.onStatusChange = (status) => {
        setActiveCall((curr) => (curr ? { ...curr, status } : null));
        if (
          status === "ended" ||
          status === "rejected" ||
          status === "failed"
        ) {
          setActiveCall(null);
        }
      };

      setActiveCall(callState);
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
      } catch (err) {
        console.error("startCall falhou:", err);
        session.cleanup();
        setActiveCall(null);
        alert(
          "Não foi possível iniciar a chamada. Verifique permissões de microfone/câmera."
        );
      }
    },
    [user, activeCall]
  );

  const answerIncoming = useCallback(async () => {
    if (!incoming || activeCall) return;
    const session = new CallSession();
    const callState = {
      session,
      type: incoming.type,
      peer: {
        uid: incoming.callerId,
        displayName: incoming.callerInfo?.displayName,
        photoURL: incoming.callerInfo?.photoURL,
      },
      role: "callee",
      status: "connecting",
    };
    session.onStatusChange = (status) => {
      setActiveCall((curr) => (curr ? { ...curr, status } : null));
      if (
        status === "ended" ||
        status === "rejected" ||
        status === "failed"
      ) {
        setActiveCall(null);
      }
    };

    setActiveCall(callState);
    try {
      await session.answerCall(incoming.id);
    } catch (err) {
      console.error("answerCall falhou:", err);
      session.cleanup();
      setActiveCall(null);
      alert(
        "Não foi possível atender a chamada. Verifique permissões de microfone/câmera."
      );
    }
  }, [incoming, activeCall]);

  const rejectIncoming = useCallback(async () => {
    if (!incoming) return;
    try {
      await rejectIncomingCall(incoming.id);
    } catch (err) {
      console.error("rejectIncoming falhou:", err);
    }
  }, [incoming]);

  // Toca ringtone enquanto há chamada recebida
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
        <CallScreen
          callState={activeCall}
          onEnd={() => {
            activeCall.session?.endCall();
            setActiveCall(null);
          }}
        />
      )}
    </CallContext.Provider>
  );
}

export function useCall() {
  return useContext(CallContext);
}

// Utilitário para componentes que querem só o portal
export function CallPortal({ children }) {
  return createPortal(children, document.body);
}

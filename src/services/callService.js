import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

const ICE_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
  iceCandidatePoolSize: 10,
};

/**
 * Gerencia uma sessão WebRTC 1-on-1 com sinalização via Firestore.
 *
 * Uso:
 *   const session = new CallSession();
 *   session.onRemoteStream = (stream) => { ... };
 *   session.onStatusChange = (status) => { ... };
 *
 *   // Lado que liga:
 *   const callId = await session.startCall(caller, callee, "audio");
 *
 *   // Lado que recebe:
 *   await session.answerCall(callId);
 */
export class CallSession {
  constructor() {
    this.pc = new RTCPeerConnection(ICE_CONFIG);
    this.localStream = null;
    this.remoteStream = new MediaStream();
    this.callDocRef = null;
    this.callId = null;
    this.role = null; // "caller" | "callee"
    this.unsubscribers = [];

    // Callbacks
    this.onLocalStream = null;
    this.onRemoteStream = null;
    this.onStatusChange = null; // "connecting" | "connected" | "ended" | "rejected" | "failed"

    this.pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        this.remoteStream.addTrack(track);
      });
      this.onRemoteStream?.(this.remoteStream);
    };

    this.pc.onconnectionstatechange = () => {
      const s = this.pc.connectionState;
      if (s === "connected") this.onStatusChange?.("connected");
      else if (s === "failed") this.onStatusChange?.("failed");
      else if (s === "disconnected") this.onStatusChange?.("ended");
    };
  }

  async _setupLocalMedia(video) {
    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: video,
    });
    this.localStream.getTracks().forEach((track) => {
      this.pc.addTrack(track, this.localStream);
    });
    this.onLocalStream?.(this.localStream);
  }

  async startCall(caller, callee, callType = "audio") {
    this.role = "caller";
    this.onStatusChange?.("connecting");

    await this._setupLocalMedia(callType === "video");

    const callsRef = collection(db, "calls");
    this.callDocRef = doc(callsRef);
    this.callId = this.callDocRef.id;

    const callerCandidatesRef = collection(
      this.callDocRef,
      "callerCandidates"
    );
    const calleeCandidatesRef = collection(
      this.callDocRef,
      "calleeCandidates"
    );

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(callerCandidatesRef, event.candidate.toJSON()).catch(() => {});
      }
    };

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    await setDoc(this.callDocRef, {
      callerId: caller.uid,
      callerInfo: {
        displayName: caller.displayName || caller.email,
        photoURL: caller.photoURL || null,
      },
      calleeId: callee.uid,
      calleeInfo: {
        displayName: callee.displayName || callee.email,
        photoURL: callee.photoURL || null,
      },
      type: callType,
      status: "ringing",
      offer: { sdp: offer.sdp, type: offer.type },
      createdAt: serverTimestamp(),
    });

    // Escuta resposta
    this.unsubscribers.push(
      onSnapshot(this.callDocRef, async (snapshot) => {
        const data = snapshot.data();
        if (!data) return;

        if (!this.pc.currentRemoteDescription && data.answer) {
          try {
            const answer = new RTCSessionDescription(data.answer);
            await this.pc.setRemoteDescription(answer);
          } catch (err) {
            console.error("setRemoteDescription falhou:", err);
          }
        }

        if (data.status === "ended" || data.status === "rejected") {
          this.cleanup();
          this.onStatusChange?.(data.status);
        }
      })
    );

    // Escuta candidates do destinatário
    this.unsubscribers.push(
      onSnapshot(calleeCandidatesRef, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            this.pc
              .addIceCandidate(new RTCIceCandidate(change.doc.data()))
              .catch(() => {});
          }
        });
      })
    );

    return this.callId;
  }

  async answerCall(callId) {
    this.role = "callee";
    this.callId = callId;
    this.callDocRef = doc(db, "calls", callId);
    this.onStatusChange?.("connecting");

    const callSnap = await getDoc(this.callDocRef);
    if (!callSnap.exists()) throw new Error("Chamada não encontrada");
    const data = callSnap.data();

    await this._setupLocalMedia(data.type === "video");

    const callerCandidatesRef = collection(
      this.callDocRef,
      "callerCandidates"
    );
    const calleeCandidatesRef = collection(
      this.callDocRef,
      "calleeCandidates"
    );

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(calleeCandidatesRef, event.candidate.toJSON()).catch(() => {});
      }
    };

    await this.pc.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    await updateDoc(this.callDocRef, {
      answer: { sdp: answer.sdp, type: answer.type },
      status: "answered",
    });

    this.unsubscribers.push(
      onSnapshot(callerCandidatesRef, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            this.pc
              .addIceCandidate(new RTCIceCandidate(change.doc.data()))
              .catch(() => {});
          }
        });
      })
    );

    this.unsubscribers.push(
      onSnapshot(this.callDocRef, (snapshot) => {
        const data = snapshot.data();
        if (data?.status === "ended" || data?.status === "rejected") {
          this.cleanup();
          this.onStatusChange?.(data.status);
        }
      })
    );
  }

  async endCall() {
    if (this.callDocRef) {
      try {
        await updateDoc(this.callDocRef, {
          status: "ended",
          endedAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn("update endCall falhou:", err);
      }
    }
    this.cleanup();
    this.onStatusChange?.("ended");
  }

  async rejectCall() {
    if (this.callDocRef) {
      try {
        await updateDoc(this.callDocRef, {
          status: "rejected",
          endedAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn("update rejectCall falhou:", err);
      }
    }
    this.cleanup();
    this.onStatusChange?.("rejected");
  }

  toggleMute() {
    if (!this.localStream) return false;
    const audioTracks = this.localStream.getAudioTracks();
    if (audioTracks.length === 0) return false;
    audioTracks.forEach((t) => (t.enabled = !t.enabled));
    return !audioTracks[0].enabled;
  }

  toggleVideo() {
    if (!this.localStream) return false;
    const videoTracks = this.localStream.getVideoTracks();
    if (videoTracks.length === 0) return false;
    videoTracks.forEach((t) => (t.enabled = !t.enabled));
    return !videoTracks[0].enabled;
  }

  cleanup() {
    this.unsubscribers.forEach((unsub) => {
      try {
        unsub();
      } catch (e) {
        // ignora
      }
    });
    this.unsubscribers = [];
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    try {
      this.pc?.close();
    } catch (e) {
      // ignora
    }
  }
}

export const rejectIncomingCall = async (callId) => {
  await updateDoc(doc(db, "calls", callId), {
    status: "rejected",
    endedAt: serverTimestamp(),
  });
};

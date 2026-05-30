import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  deleteField,
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
 * Cria um novo doc de chamada em grupo. Não adiciona o criador ainda —
 * isso é responsabilidade do GroupCallSession.start().
 */
export const createGroupCall = async (chatId, type, currentUser) => {
  const callsRef = collection(db, "groupCalls");
  const callDocRef = doc(callsRef);
  await setDoc(callDocRef, {
    chatId,
    type,
    startedBy: currentUser.uid,
    status: "active",
    participants: {},
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return callDocRef.id;
};

/**
 * Gerencia uma sessão de chamada em grupo (mesh).
 *
 * Mantém uma RTCPeerConnection por outro participante. O uid menor de cada
 * par cria o offer. Ao sair, fecha todas as PCs e remove-se do doc.
 */
export class GroupCallSession {
  constructor(callId, type, currentUser) {
    this.callId = callId;
    this.type = type; // "audio" | "video"
    this.currentUser = currentUser;
    this.localStream = null;
    this.peerLinks = new Map(); // uid -> { pc, remoteStream, peerInfo, unsubscribers }
    this.unsubscribers = [];

    // Callbacks (definidos por GroupCallScreen)
    this.onLocalStream = null;
    this.onParticipantStream = null; // (uid, stream, peerInfo)
    this.onParticipantLeft = null; // (uid)
    this.onStatusChange = null; // "connecting" | "joined" | "ended" | "failed"
  }

  async start() {
    this.onStatusChange?.("connecting");

    // 1) getUserMedia
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: this.type === "video",
      });
      this.onLocalStream?.(this.localStream);
    } catch (err) {
      this.onStatusChange?.("failed");
      throw err;
    }

    const callDocRef = doc(db, "groupCalls", this.callId);

    // 2) Adiciona o próprio uid em participants
    await updateDoc(callDocRef, {
      [`participants.${this.currentUser.uid}`]: {
        uid: this.currentUser.uid,
        displayName:
          this.currentUser.displayName || this.currentUser.email || "Alguém",
        photoURL: this.currentUser.photoURL || null,
        joinedAt: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
    });

    this.onStatusChange?.("joined");

    // 3) Escuta mudanças em participants pra abrir/fechar peer links
    this.unsubscribers.push(
      onSnapshot(callDocRef, (snap) => {
        const data = snap.data();
        if (!data) return;
        if (data.status === "ended") {
          this.cleanup();
          this.onStatusChange?.("ended");
          return;
        }
        this._handleParticipants(data.participants || {});
      })
    );
  }

  _handleParticipants(participants) {
    const myUid = this.currentUser.uid;
    const otherUids = Object.keys(participants).filter((uid) => uid !== myUid);

    // Adiciona links pra novos participantes
    for (const uid of otherUids) {
      if (!this.peerLinks.has(uid)) {
        const link = this._createPeerLink(uid, participants[uid]);
        this.peerLinks.set(uid, link);
      }
    }

    // Remove links de quem saiu
    for (const [uid, link] of this.peerLinks.entries()) {
      if (!otherUids.includes(uid)) {
        try {
          link.close();
        } catch (e) {
          // ignora
        }
        this.peerLinks.delete(uid);
        this.onParticipantLeft?.(uid);
      }
    }
  }

  _createPeerLink(otherUid, peerInfo) {
    const myUid = this.currentUser.uid;
    const isCaller = myUid < otherUid;
    const pairId = [myUid, otherUid].sort().join("_");
    const callDocRef = doc(db, "groupCalls", this.callId);
    const pairRef = doc(callDocRef, "pairs", pairId);

    const pc = new RTCPeerConnection(ICE_CONFIG);
    const remoteStream = new MediaStream();
    const unsubscribers = [];

    this.localStream.getTracks().forEach((track) => {
      pc.addTrack(track, this.localStream);
    });

    pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        remoteStream.addTrack(track);
      });
      this.onParticipantStream?.(otherUid, remoteStream, peerInfo);
    };

    if (isCaller) {
      this._setupCaller(pc, pairRef, unsubscribers);
    } else {
      this._setupCallee(pc, pairRef, unsubscribers);
    }

    return {
      pc,
      remoteStream,
      peerInfo,
      unsubscribers,
      close: () => {
        unsubscribers.forEach((u) => {
          try {
            u();
          } catch (e) {
            // ignora
          }
        });
        try {
          pc.close();
        } catch (e) {
          // ignora
        }
      },
    };
  }

  async _setupCaller(pc, pairRef, unsubscribers) {
    const callerCandidatesRef = collection(pairRef, "callerCandidates");
    const calleeCandidatesRef = collection(pairRef, "calleeCandidates");

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(callerCandidatesRef, event.candidate.toJSON()).catch(() => {});
      }
    };

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await setDoc(pairRef, {
        offer: { sdp: offer.sdp, type: offer.type },
      });
    } catch (err) {
      console.error("[group caller] offer falhou:", err);
    }

    unsubscribers.push(
      onSnapshot(pairRef, async (snap) => {
        const data = snap.data();
        if (data?.answer && !pc.currentRemoteDescription) {
          try {
            await pc.setRemoteDescription(
              new RTCSessionDescription(data.answer)
            );
          } catch (err) {
            console.error("[group caller] setRemote falhou:", err);
          }
        }
      })
    );

    unsubscribers.push(
      onSnapshot(calleeCandidatesRef, (snap) => {
        snap.docChanges().forEach((change) => {
          if (change.type === "added") {
            pc.addIceCandidate(new RTCIceCandidate(change.doc.data())).catch(
              () => {}
            );
          }
        });
      })
    );
  }

  async _setupCallee(pc, pairRef, unsubscribers) {
    const callerCandidatesRef = collection(pairRef, "callerCandidates");
    const calleeCandidatesRef = collection(pairRef, "calleeCandidates");

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(calleeCandidatesRef, event.candidate.toJSON()).catch(() => {});
      }
    };

    unsubscribers.push(
      onSnapshot(pairRef, async (snap) => {
        const data = snap.data();
        if (data?.offer && !pc.currentRemoteDescription) {
          try {
            await pc.setRemoteDescription(
              new RTCSessionDescription(data.offer)
            );
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await updateDoc(pairRef, {
              answer: { sdp: answer.sdp, type: answer.type },
            });
          } catch (err) {
            console.error("[group callee] setup falhou:", err);
          }
        }
      })
    );

    unsubscribers.push(
      onSnapshot(callerCandidatesRef, (snap) => {
        snap.docChanges().forEach((change) => {
          if (change.type === "added") {
            pc.addIceCandidate(new RTCIceCandidate(change.doc.data())).catch(
              () => {}
            );
          }
        });
      })
    );
  }

  toggleMute() {
    const audioTracks = this.localStream?.getAudioTracks() || [];
    audioTracks.forEach((t) => (t.enabled = !t.enabled));
    return audioTracks.length > 0 && !audioTracks[0].enabled;
  }

  toggleVideo() {
    const videoTracks = this.localStream?.getVideoTracks() || [];
    videoTracks.forEach((t) => (t.enabled = !t.enabled));
    return videoTracks.length > 0 && !videoTracks[0].enabled;
  }

  async leave() {
    const callDocRef = doc(db, "groupCalls", this.callId);
    try {
      await updateDoc(callDocRef, {
        [`participants.${this.currentUser.uid}`]: deleteField(),
        updatedAt: serverTimestamp(),
      });
      // Se eu fui o último, encerra a chamada
      const snap = await getDoc(callDocRef);
      const remaining = Object.keys(snap.data()?.participants || {});
      if (remaining.length === 0) {
        await updateDoc(callDocRef, {
          status: "ended",
          endedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.warn("leave() falhou:", err);
    }
    this.cleanup();
    this.onStatusChange?.("ended");
  }

  cleanup() {
    this.unsubscribers.forEach((u) => {
      try {
        u();
      } catch (e) {
        // ignora
      }
    });
    this.unsubscribers = [];
    for (const link of this.peerLinks.values()) {
      try {
        link.close();
      } catch (e) {
        // ignora
      }
    }
    this.peerLinks.clear();
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
  }
}

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  query,
  where,
  serverTimestamp,
  updateDoc,
  arrayUnion,
  arrayRemove,
  deleteField,
} from "firebase/firestore";
import { auth, db } from "./firebase";

export const getChatId = (uid1, uid2) => [uid1, uid2].sort().join("_");

export const findUserByEmail = async (email) => {
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("email", "==", email.toLowerCase()));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data();
};

// --- Helpers internos ---

function getActorName() {
  const u = auth.currentUser;
  if (!u) return "Alguém";
  return u.displayName || u.email?.split("@")[0] || "Alguém";
}

async function addSystemMessage(chatId, text) {
  const u = auth.currentUser;
  if (!u || !text) return;
  const messagesRef = collection(db, "chats", chatId, "messages");
  await addDoc(messagesRef, {
    system: true,
    senderId: u.uid,
    text,
    createdAt: serverTimestamp(),
  });
  const chatRef = doc(db, "chats", chatId);
  await updateDoc(chatRef, {
    lastMessage: {
      text,
      senderId: u.uid,
      system: true,
      createdAt: serverTimestamp(),
    },
    updatedAt: serverTimestamp(),
  });
}

// --- API pública ---

export const createOrGetChat = async (currentUser, otherUser) => {
  const chatId = getChatId(currentUser.uid, otherUser.uid);
  const chatRef = doc(db, "chats", chatId);
  const existing = await getDoc(chatRef);
  if (existing.exists()) return chatId;

  await setDoc(chatRef, {
    type: "direct",
    participants: [currentUser.uid, otherUser.uid],
    participantInfo: {
      [currentUser.uid]: {
        displayName: currentUser.displayName || currentUser.email,
        photoURL: currentUser.photoURL || null,
        email: currentUser.email,
      },
      [otherUser.uid]: {
        displayName: otherUser.displayName || otherUser.email,
        photoURL: otherUser.photoURL || null,
        email: otherUser.email,
      },
    },
    lastMessage: null,
    lastRead: {},
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return chatId;
};

export const createGroup = async (currentUser, { name, photoURL, members }) => {
  const allMembers = [currentUser, ...members];
  const participants = allMembers.map((m) => m.uid);
  const participantInfo = {};
  for (const m of allMembers) {
    participantInfo[m.uid] = {
      displayName: m.displayName || m.email,
      photoURL: m.photoURL || null,
      email: m.email,
    };
  }

  const chatsRef = collection(db, "chats");
  const newGroupRef = await addDoc(chatsRef, {
    type: "group",
    name: name.trim(),
    photoURL: photoURL || null,
    createdBy: currentUser.uid,
    admins: [currentUser.uid],
    participants,
    participantInfo,
    lastMessage: null,
    lastRead: {},
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const creator = currentUser.displayName || currentUser.email || "Alguém";
  await addSystemMessage(
    newGroupRef.id,
    `${creator} criou o grupo "${name.trim()}"`
  );

  return newGroupRef.id;
};

export const updateGroupInfo = async (chatId, { name, photoURL }) => {
  const updates = { updatedAt: serverTimestamp() };
  if (name !== undefined) updates.name = name.trim();
  if (photoURL !== undefined) updates.photoURL = photoURL || null;
  await updateDoc(doc(db, "chats", chatId), updates);
  // Notify in chat
  const actor = getActorName();
  await addSystemMessage(chatId, `${actor} atualizou os dados do grupo`);
};

export const addGroupMember = async (chatId, member) => {
  const chatRef = doc(db, "chats", chatId);
  const snap = await getDoc(chatRef);
  if (!snap.exists() || snap.data().type !== "group") {
    throw new Error("Grupo não encontrado");
  }
  if (snap.data().participants?.includes(member.uid)) {
    throw new Error("Usuário já é membro do grupo");
  }
  await updateDoc(chatRef, {
    participants: arrayUnion(member.uid),
    [`participantInfo.${member.uid}`]: {
      displayName: member.displayName || member.email,
      photoURL: member.photoURL || null,
      email: member.email,
    },
    updatedAt: serverTimestamp(),
  });

  const actor = getActorName();
  const memberName = member.displayName || member.email;
  await addSystemMessage(chatId, `${actor} adicionou ${memberName} ao grupo`);
};

export const removeGroupMember = async (chatId, uid) => {
  const chatRef = doc(db, "chats", chatId);
  const snap = await getDoc(chatRef);
  if (!snap.exists() || snap.data().type !== "group") {
    throw new Error("Grupo não encontrado");
  }
  const data = snap.data();
  const participants = data.participants || [];
  const admins = data.admins || [];

  if (!participants.includes(uid)) {
    throw new Error("Usuário não é membro do grupo");
  }
  if (participants.length <= 2) {
    throw new Error("O grupo precisa ter pelo menos 2 membros");
  }

  const isAdmin = admins.includes(uid);
  const otherAdminsExist = admins.some((a) => a !== uid);
  if (isAdmin && !otherAdminsExist) {
    throw new Error(
      "Este é o único administrador. Promova outro membro a admin antes."
    );
  }

  // Adiciona mensagem de sistema ANTES de remover o usuário,
  // senão a regra do Firestore bloqueia (senderId precisa estar em participants).
  const isSelf = uid === auth.currentUser?.uid;
  const memberInfo = data.participantInfo?.[uid] || {};
  const memberName =
    memberInfo.displayName || memberInfo.email || "um membro";
  const actor = getActorName();
  const systemText = isSelf
    ? `${actor} saiu do grupo`
    : `${actor} removeu ${memberName} do grupo`;
  await addSystemMessage(chatId, systemText);

  await updateDoc(chatRef, {
    participants: arrayRemove(uid),
    admins: arrayRemove(uid),
    [`participantInfo.${uid}`]: deleteField(),
    [`lastRead.${uid}`]: deleteField(),
    updatedAt: serverTimestamp(),
  });
};

export const promoteToAdmin = async (chatId, uid) => {
  const chatRef = doc(db, "chats", chatId);
  const snap = await getDoc(chatRef);
  if (!snap.exists() || snap.data().type !== "group") {
    throw new Error("Grupo não encontrado");
  }
  const data = snap.data();
  if (!data.participants?.includes(uid)) {
    throw new Error("Usuário não é membro do grupo");
  }
  if (data.admins?.includes(uid)) {
    throw new Error("Usuário já é administrador");
  }
  await updateDoc(chatRef, {
    admins: arrayUnion(uid),
    updatedAt: serverTimestamp(),
  });

  const memberInfo = data.participantInfo?.[uid] || {};
  const memberName =
    memberInfo.displayName || memberInfo.email || "um membro";
  const actor = getActorName();
  await addSystemMessage(chatId, `${actor} tornou ${memberName} administrador`);
};

export const demoteFromAdmin = async (chatId, uid) => {
  const chatRef = doc(db, "chats", chatId);
  const snap = await getDoc(chatRef);
  if (!snap.exists() || snap.data().type !== "group") {
    throw new Error("Grupo não encontrado");
  }
  const data = snap.data();
  const admins = data.admins || [];
  if (!admins.includes(uid)) {
    throw new Error("Usuário não é administrador");
  }
  if (admins.length <= 1) {
    throw new Error(
      "Não é possível remover o último administrador. Promova outro membro antes."
    );
  }
  await updateDoc(chatRef, {
    admins: arrayRemove(uid),
    updatedAt: serverTimestamp(),
  });

  const memberInfo = data.participantInfo?.[uid] || {};
  const memberName =
    memberInfo.displayName || memberInfo.email || "um admin";
  const actor = getActorName();
  await addSystemMessage(
    chatId,
    `${actor} removeu ${memberName} como administrador`
  );
};

export const sendMessage = async (
  chatId,
  senderId,
  { text, imageUrl, audioUrl, replyTo } = {}
) => {
  const messagesRef = collection(db, "chats", chatId, "messages");
  const messageData = {
    senderId,
    text: text || "",
    imageUrl: imageUrl || null,
    audioUrl: audioUrl || null,
    createdAt: serverTimestamp(),
  };
  if (replyTo) {
    messageData.replyTo = {
      messageId: replyTo.messageId,
      senderId: replyTo.senderId,
      senderName: replyTo.senderName || "",
      text: (replyTo.text || "").slice(0, 200),
      imageUrl: replyTo.imageUrl || null,
    };
  }
  await addDoc(messagesRef, messageData);

  const previewText =
    text ||
    (imageUrl ? "[Imagem]" : "") ||
    (audioUrl ? "[Áudio]" : "");

  const chatRef = doc(db, "chats", chatId);
  await updateDoc(chatRef, {
    lastMessage: {
      text: previewText,
      senderId,
      createdAt: serverTimestamp(),
    },
    updatedAt: serverTimestamp(),
  });
};

export const markChatAsRead = async (chatId, uid) => {
  const chatRef = doc(db, "chats", chatId);
  await updateDoc(chatRef, {
    [`lastRead.${uid}`]: serverTimestamp(),
  });
};

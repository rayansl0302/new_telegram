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
import { db } from "./firebase";

export const getChatId = (uid1, uid2) => [uid1, uid2].sort().join("_");

export const findUserByEmail = async (email) => {
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("email", "==", email.toLowerCase()));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data();
};

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
  return newGroupRef.id;
};

export const updateGroupInfo = async (chatId, { name, photoURL }) => {
  const updates = { updatedAt: serverTimestamp() };
  if (name !== undefined) updates.name = name.trim();
  if (photoURL !== undefined) updates.photoURL = photoURL || null;
  await updateDoc(doc(db, "chats", chatId), updates);
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
};

export const removeGroupMember = async (chatId, uid) => {
  const chatRef = doc(db, "chats", chatId);
  const snap = await getDoc(chatRef);
  if (!snap.exists() || snap.data().type !== "group") {
    throw new Error("Grupo não encontrado");
  }
  const participants = snap.data().participants || [];
  if (!participants.includes(uid)) {
    throw new Error("Usuário não é membro do grupo");
  }
  if (participants.length <= 2) {
    throw new Error("O grupo precisa ter pelo menos 2 membros");
  }
  await updateDoc(chatRef, {
    participants: arrayRemove(uid),
    admins: arrayRemove(uid),
    [`participantInfo.${uid}`]: deleteField(),
    [`lastRead.${uid}`]: deleteField(),
    updatedAt: serverTimestamp(),
  });
};

export const sendMessage = async (chatId, senderId, { text, imageUrl }) => {
  const messagesRef = collection(db, "chats", chatId, "messages");
  await addDoc(messagesRef, {
    senderId,
    text: text || "",
    imageUrl: imageUrl || null,
    createdAt: serverTimestamp(),
  });

  const chatRef = doc(db, "chats", chatId);
  await updateDoc(chatRef, {
    lastMessage: {
      text: text || (imageUrl ? "[Imagem]" : ""),
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

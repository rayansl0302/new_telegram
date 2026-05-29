const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

async function uploadToCloudinary(file, folder, resourceType = "image") {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error("Cloudinary não configurado (.env.local)");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Falha no upload: ${errorText}`);
  }

  const data = await res.json();
  return data.secure_url;
}

export const uploadChatImage = (chatId, file) =>
  uploadToCloudinary(file, `chats/${chatId}`, "image");

export const uploadAvatar = (uid, file) =>
  uploadToCloudinary(file, `avatars/${uid}`, "image");

export const uploadGroupPhoto = (file) =>
  uploadToCloudinary(file, `groups`, "image");

// Cloudinary trata áudio sob o resource_type "video"
export const uploadChatAudio = (chatId, file) =>
  uploadToCloudinary(file, `audio/${chatId}`, "video");

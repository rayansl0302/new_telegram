export function traduzErroAuth(code, message = "") {
  const map = {
    "auth/invalid-credential": "E-mail ou senha incorretos",
    "auth/user-not-found": "Usuário não encontrado",
    "auth/wrong-password": "Senha incorreta",
    "auth/email-already-in-use": "E-mail já cadastrado",
    "auth/weak-password": "Senha muito fraca (mínimo 6 caracteres)",
    "auth/invalid-email": "E-mail inválido",
    "auth/popup-closed-by-user": "Login cancelado",
    "auth/popup-blocked": "Popup bloqueado. Use Safari ou login por e-mail.",
    "auth/cancelled-popup-request": "Login cancelado",
    "auth/network-request-failed": "Sem conexão com a internet",
    "auth/unauthorized-domain": `Domínio não autorizado no Firebase: ${typeof window !== "undefined" ? window.location.hostname : ""}`,
    "auth/operation-not-allowed": "Login com Google não está habilitado no Firebase Console",
    "auth/operation-not-supported-in-this-environment":
      "Login com Google não suportado neste navegador. Use Safari ou e-mail/senha.",
    "auth/internal-error": "Erro interno do Firebase. Tente novamente ou use e-mail/senha.",
    "auth/web-storage-unsupported":
      "Armazenamento bloqueado. Desative modo privado ou use e-mail/senha.",
  };

  if (code && map[code]) return map[code];

  if (message.includes("missing initial state")) {
    return "Login com Google falhou no iOS. Abra no Safari, limpe dados do site e tente de novo, ou use e-mail/senha.";
  }

  if (message) return message;

  return "Erro ao autenticar. Tente novamente.";
}

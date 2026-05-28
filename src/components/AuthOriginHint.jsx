import { getGoogleClientId } from "../services/googleIdentity";
import { shouldUseGoogleIdentity } from "../utils/platform";

function AuthOriginHint() {
  if (!shouldUseGoogleIdentity()) return null;

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const clientId = getGoogleClientId();
  const clientSuffix = clientId
    ? `…${clientId.slice(-30)}`
    : "não configurado";
  const firebaseProject = import.meta.env.VITE_FIREBASE_PROJECT_ID || "—";

  return (
    <div className="text-xs text-slate-500 bg-slate-900/60 border border-slate-700 rounded-lg p-3 space-y-1.5 break-all">
      <p className="text-slate-400 font-medium">Diagnóstico (Google OAuth)</p>
      <p>
        <span className="text-slate-500">Origem: </span>
        <span className="text-sky-300">{origin || "—"}</span>
      </p>
      <p>
        <span className="text-slate-500">Projeto Firebase: </span>
        <span className="text-sky-300">{firebaseProject}</span>
      </p>
      <p>
        <span className="text-slate-500">Client ID no app: </span>
        <span className="text-sky-300">{clientSuffix}</span>
      </p>
      <p className="text-slate-500 leading-relaxed">
        O Client ID acima deve ser o mesmo de{" "}
        <strong className="text-slate-400">
          Firebase → Authentication → Google → ID do cliente Web
        </strong>
        , no projeto <strong className="text-slate-400">{firebaseProject}</strong>.
        Não use um cliente OAuth criado manualmente se for diferente.
      </p>
    </div>
  );
}

export default AuthOriginHint;

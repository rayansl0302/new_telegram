import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-400">
        Carregando...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return children;
}

export default ProtectedRoute;

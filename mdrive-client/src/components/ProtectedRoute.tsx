import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--color-surface-primary)]">
        <div className="flex flex-col items-center gap-4 animate-fade-in relative">
          <div className="w-12 h-12 border-2 border-[var(--color-accent-blue)] border-t-transparent border-r-transparent rounded-full animate-spin" />
          <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full animate-pulse z-0 hidden"></div>
          <div className="flex flex-col items-center gap-1.5 relative z-10">
            <p className="text-[var(--color-text-primary)] font-semibold text-sm tracking-wide">Secure Connection...</p>
            <p className="text-[var(--color-text-muted)] text-[11px] animate-pulse">Waking up the server, please hold on.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

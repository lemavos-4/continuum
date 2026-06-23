import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "@/lib/heroicons";
import { useAuth } from "@/contexts/AuthContext";
import { extractAuthTokensFromLocation, sanitizeAuthRedirectUrl } from "@/lib/auth-redirect";

const LoginSuccess = () => {
  const navigate = useNavigate();
  const { setTokens, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");

  useEffect(() => {
    const authTokens = extractAuthTokensFromLocation();
    sanitizeAuthRedirectUrl();

    const accessToken = authTokens?.accessToken;
    const refreshToken = authTokens?.refreshToken;
    const vaultId = authTokens?.vaultId;

    setDebugInfo(`Token: ${accessToken ? "present" : "missing"}, VaultId: ${vaultId || "none"}`);

    if (!accessToken) {
      setError("Authentication token not found in URL parameters. Please verify that the login completed correctly.");
      setTimeout(() => navigate("/", { replace: true }), 3000);
      return;
    }

    try {
      setTokens(accessToken, refreshToken || "");
      if (vaultId) {
        localStorage.setItem("vaultId", vaultId);
      }

      window.history.replaceState({}, "", "/");

      refreshUser()
        .then(() => navigate("/", { replace: true }))
        .catch(() => navigate("/", { replace: true }))
        .finally(() => setLoading(false));
    } catch (err) {
      setError("Error saving authentication data. Please check your browser permissions.");
      setTimeout(() => navigate("/", { replace: true }), 3000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="text-foreground/80 text-sm">
            <p>Error: {error}</p>
            <p className="text-xs text-muted-foreground mt-2">Debug: {debugInfo}</p>
          </div>
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Redirecting in a few seconds...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Processing authentication...</p>
          <p className="text-xs text-muted-foreground">{debugInfo}</p>
        </div>
      </div>
    );
  }

  return null;
};

export default LoginSuccess;
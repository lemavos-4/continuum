import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "@/lib/heroicons";
import { useAuth } from "@/contexts/AuthContext";
import { extractAuthTokensFromLocation, sanitizeAuthRedirectUrl } from "@/lib/auth-redirect";
import { useLanguage } from "@/contexts/LanguageContext";

const LoginSuccess = () => {
  const { t } = useLanguage();
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
      setError(t("au_auth_token_not_found"));
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
      setError(t("au_error_saving_auth_data"));
      setTimeout(() => navigate("/", { replace: true }), 3000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="text-foreground/80 text-sm">
            <p>{t("au_error_label")}: {error}</p>
            <p className="text-xs text-muted-foreground mt-2">{t("au_debug_label")}: {debugInfo}</p>
          </div>
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">{t("au_redirecting_seconds")}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">{t("au_processing_authentication")}</p>
          <p className="text-xs text-muted-foreground">{debugInfo}</p>
        </div>
      </div>
    );
  }

  return null;
};

export default LoginSuccess;

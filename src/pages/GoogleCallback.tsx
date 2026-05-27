import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/lib/api";
import { extractAuthTokensFromLocation, sanitizeAuthRedirectUrl } from "@/lib/auth-redirect";
import { Loader2 } from "@/lib/heroicons";
import { useToast } from "@/hooks/use-toast";

export default function GoogleCallback() {
  const navigate = useNavigate();
  const { setTokens, refreshUser } = useAuth();
  const { toast } = useToast();
  const hasCalled = useRef(false);

  useEffect(() => {
    const authTokens = extractAuthTokensFromLocation();
    sanitizeAuthRedirectUrl();

    const accessToken = authTokens?.accessToken;
    const refreshToken = authTokens?.refreshToken;
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const code = searchParams.get("code") ?? hashParams.get("code");
    const state = searchParams.get("state") ?? hashParams.get("state");

    // Se já existem tokens na URL (redirecionamento direto)
    if (accessToken) {
      if (hasCalled.current) return;
      hasCalled.current = true;
      
      setTokens(accessToken, refreshToken || "");
      refreshUser()
        .then(() => navigate("/"))
        .catch(() => navigate("/"));
      return;
    }

    // Se recebemos um código para trocar no backend
    if (code) {
      if (hasCalled.current) return;
      hasCalled.current = true;

      authApi
        .googleCallback(code, state || "")
        .then(async ({ data }) => {
          setTokens(data.accessToken, data.refreshToken);
          await refreshUser();
          navigate("/");
        })
        .catch((err) => {
          console.error("Google Auth Error:", err);
          toast({
            title: "Authentication error",
            description: err.response?.data?.message || "Something went wrong with Google sign-in.",
            variant: "destructive",
          });
          navigate("/");
        });
    } else {
      navigate("/");
    }
  }, [navigate, refreshUser, setTokens, toast]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        <p className="text-sm text-muted-foreground">Finishing Google sign-in...</p>
      </div>
    </div>
  );
}
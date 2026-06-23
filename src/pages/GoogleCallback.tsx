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

    const rawHash = window.location.hash.replace(/^#/, "");
    const [, hashQuery = ""] = rawHash.split("?", 2);
    const hashParams = new URLSearchParams(hashQuery);

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
      if (!state) {
        console.error("Google Auth callback missing state parameter", { code, state });
        toast({
          title: "Authentication error",
          description: "Google login redirect is missing state data. Please try again.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      if (hasCalled.current) return;
      hasCalled.current = true;

      authApi
        .googleCallback({
          code,
          state,
          redirectUri: window.location.origin + window.location.pathname,
        })
        .then(async ({ data }) => {
          setTokens(data.accessToken, data.refreshToken);
          // Only mark as new account when the backend says the user was just created
          if (data.isNewUser) {
            localStorage.setItem('newAccountCreated', 'true');
          }
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
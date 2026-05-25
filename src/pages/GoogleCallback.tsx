import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/lib/api";
import { Loader2 } from "@/lib/heroicons";
import { useToast } from "@/hooks/use-toast";

export default function GoogleCallback() {
  const navigate = useNavigate();
  const { setTokens, refreshUser } = useAuth();
  const { toast } = useToast();
  const hasCalled = useRef(false);

  useEffect(() => {
    const parseRedirectTokens = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const getValue = (key: string) => searchParams.get(key) ?? hashParams.get(key);

      return {
        accessToken: getValue("access_token") ?? getValue("token") ?? getValue("jwt"),
        refreshToken: getValue("refresh_token"),
        code: getValue("code"),
        state: getValue("state"),
      };
    };

    const { accessToken, refreshToken, code, state } = parseRedirectTokens();

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
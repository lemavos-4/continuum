import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "@/lib/heroicons";
import { useToast } from "@/hooks/use-toast";
import AuthShell from "@/components/auth/AuthShell";

// DEV_MODE toggle — when VITE_DEV_MODE=true, show the email/password
// login form alongside the Google sign-in button. In production this
// stays false and we redirect straight to Google.
const DEV_MODE = String(import.meta.env.VITE_DEV_MODE ?? "false").toLowerCase() === "true";

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Production behaviour: redirect straight to Google.
  useEffect(() => {
    if (!DEV_MODE) {
      loginWithGoogle();
    }
  }, [loginWithGoogle]);

  if (!DEV_MODE) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm text-white/70">Redirecting to Google login...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err: any) {
      toast({
        title: "Login failed",
        description: err?.response?.data?.message || "Check your email and password.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch {
      setGoogleLoading(false);
      toast({ title: "Error starting Google login", variant: "destructive" });
    }
  };

  return (
    <AuthShell
      eyebrow="Continuum · DEV"
      title="Sign in"
      subtitle="Development mode — email & password enabled."
      footer={
        <span>
          No account?{" "}
          <Link to="/register" className="text-white hover:underline">
            Create one
          </Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label-caps text-white/50">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full bg-transparent border-b border-white/15 focus:border-white/60 outline-none py-2 text-sm"
            placeholder="you@continuum.dev"
          />
        </div>
        <div>
          <label className="label-caps text-white/50">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full bg-transparent border-b border-white/15 focus:border-white/60 outline-none py-2 text-sm"
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-white text-black text-sm font-medium py-2.5 rounded-sm hover:bg-white/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Sign in
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-widest text-white/30">
        <span className="flex-1 h-px bg-white/10" />
        or
        <span className="flex-1 h-px bg-white/10" />
      </div>

      <button
        onClick={handleGoogleLogin}
        disabled={googleLoading}
        className="w-full border border-white/15 hover:border-white/40 text-sm py-2.5 rounded-sm transition flex items-center justify-center gap-2"
      >
        {googleLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        Continue with Google
      </button>
    </AuthShell>
  );
}

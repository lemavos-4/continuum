import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "@/lib/heroicons";
import { useToast } from "@/hooks/use-toast";
import AuthShell from "@/components/auth/AuthShell";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(username, email, password);
      toast({ title: "Account created", description: "Check your email to activate." });
      navigate("/login");
    } catch (err: any) {
      toast({
        title: "Could not create account",
        description: err?.response?.data?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create account."
      subtitle="Three fields. Forever yours."
      footer={
        <>
          Already with us?{" "}
          <Link to="/login" className="text-white underline underline-offset-4 hover:opacity-80">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-1.5">
          <label htmlFor="username" className="label-caps">Username</label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="johndoe"
            required
            className="w-full bg-transparent border-0 border-b border-white/15 focus:border-white pb-2 text-base outline-none transition-colors"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className="label-caps">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full bg-transparent border-0 border-b border-white/15 focus:border-white pb-2 text-base outline-none transition-colors"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="label-caps">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            required
            minLength={8}
            className="w-full bg-transparent border-0 border-b border-white/15 focus:border-white pb-2 text-base outline-none transition-colors"
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}

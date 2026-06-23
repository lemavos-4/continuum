import { useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "@/lib/api";
import { Loader2 } from "@/lib/heroicons";
import { useToast } from "@/hooks/use-toast";
import AuthShell from "@/components/auth/AuthShell";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      toast({
        title: "Could not send email",
        description: err?.response?.data?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={sent ? "Check your inbox." : "Reset password."}
      subtitle={sent ? "We sent a recovery link to your email." : "Enter your email and we'll send instructions."}
      footer={
        <>
          Remember it?{" "}
          <Link to="/login" className="text-white underline underline-offset-4 hover:opacity-80">
            Sign in
          </Link>
        </>
      }
    >
      {sent ? (
        <div className="border border-white/10 rounded-md p-6 text-sm text-white/70 leading-relaxed">
          A recovery link is on its way to <span className="text-white">{email}</span>. If it doesn't arrive in a few
          minutes, check your spam folder.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
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

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Sending…" : "Send recovery link"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}

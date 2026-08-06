import { useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "@/lib/api";
import { Loader2 } from "@/lib/heroicons";
import { useToast } from "@/hooks/use-toast";
import AuthShell from "@/components/auth/AuthShell";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ForgotPassword() {
  const { t } = useLanguage();
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
        title: t("au_could_not_send_email"),
        description: err?.response?.data?.message || t("au_please_try_again"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={sent ? t("au_check_inbox") : t("au_reset_password_dot")}
      subtitle={sent ? t("au_recovery_link_email_sent") : t("au_enter_email_instructions")}
      footer={
        <>
          {t("au_remember_it")}{" "}
          <Link to="/login" className="text-white underline underline-offset-4 hover:opacity-80">
            {t("au_sign_in")}
          </Link>
        </>
      }
    >
      {sent ? (
        <div className="border border-white/10 rounded-md p-6 text-sm text-white/70 leading-relaxed">
          {t("au_recovery_link_on_way")} <span className="text-white">{email}</span>. {t("au_if_not_arrive_check_spam")}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <label htmlFor="email" className="label-caps">{t("au_email")}</label>
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
            {loading ? t("au_sending") : t("au_send_recovery_link")}
          </button>
        </form>
      )}
    </AuthShell>
  );
}

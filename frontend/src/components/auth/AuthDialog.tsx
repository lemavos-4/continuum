import { FormEvent, useEffect, useState } from "react";
import { EMAIL_AUTH_ENABLED as DEV_MODE } from "@/lib/dev-mode";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "@/lib/heroicons";
import { useLanguage } from "@/contexts/LanguageContext";

type AuthTab = "login" | "register" | "forgot";


interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: AuthTab;
}

export default function AuthDialog({ open, onOpenChange, initialTab = "login" }: AuthDialogProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<AuthTab>(initialTab);
  const showGoogleAuthOption = (!DEV_MODE || activeTab === "register") && activeTab !== "forgot";

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [initialTab, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-md p-0 overflow-hidden rounded-2xl border-[hsl(var(--popup-border))] bg-[hsl(var(--popup-background))] text-[hsl(var(--popup-foreground))] shadow-2xl">
        <div className="relative">
          {/* Subtle top accent */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />

          <div className="p-6 sm:p-8 space-y-6">
            {/* Header */}
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="text-2xl sm:text-3xl font-serif tracking-tight">
                {activeTab === "register" ? t("au_create_account") : activeTab === "forgot" ? t("au_reset_password") : t("au_welcome_back")}
              </DialogTitle>
              <DialogDescription className="text-sm text-[hsl(var(--popup-muted))]">
                {DEV_MODE
                  ? t("au_dev_mode_desc")
                  : t("au_google_only_desc")}
              </DialogDescription>
            </DialogHeader>

            {/* Tabs - only in DEV_MODE */}
            {DEV_MODE && activeTab !== "forgot" && (
              <div className="grid grid-cols-2 rounded-xl border border-[hsl(var(--popup-border))] bg-white/[0.03] p-1">
                {(["login", "register"] as AuthTab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={
                      "rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition-all " +
                      (activeTab === tab
                        ? "bg-white text-black shadow-sm"
                        : "text-[hsl(var(--popup-muted))] hover:text-white")
                    }
                  >
                    {tab === "login" ? t("au_sign_in") : t("au_register")}
                  </button>
                ))}
              </div>
            )}

            {/* Email/Password forms - only in DEV_MODE */}
            {DEV_MODE && activeTab === "login" && <LoginForm onSuccess={() => onOpenChange(false)} onForgot={() => setActiveTab("forgot")} />}
            {DEV_MODE && activeTab === "register" && <RegisterForm onSwitchToLogin={() => setActiveTab("login")} />}
            {DEV_MODE && activeTab === "forgot" && <ForgotForm onSwitchToLogin={() => setActiveTab("login")} />}

            {DEV_MODE && activeTab !== "forgot" && activeTab === "login" && (
              <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-[hsl(var(--popup-muted))]">
                <span className="flex-1 h-px bg-white/10" />
                {t("au_or")}
                <span className="flex-1 h-px bg-white/10" />
              </div>
            )}

            {/* Google Login - visible only when it is the single auth option */}
            {showGoogleAuthOption && <GoogleOnlyForm onSuccess={() => onOpenChange(false)} />}

            {/* Footer */}
            <p className="text-[10px] text-center text-[hsl(var(--popup-muted))] opacity-70 pt-1">
              {t("au_terms_agree_prefix")}{" "}
              <a href="/terms" className="underline underline-offset-2 hover:text-white">{t("au_terms")}</a>
              {" "}{t("au_and")}{" "}
              <a href="/privacy" className="underline underline-offset-2 hover:text-white">{t("au_privacy")}</a>.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GoogleOnlyForm({ onSuccess }: { onSuccess: () => void }) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const { loginWithGoogle } = useAuth();
  const { toast } = useToast();

  const handleGoogle = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch {
      toast({
        title: t("au_could_not_start_google"),
        description: t("au_try_again_later"),
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGoogle}
      disabled={loading}
      className="w-full h-11 rounded-xl bg-white text-black text-sm font-semibold transition hover:bg-white/90 disabled:opacity-60 flex items-center justify-center gap-2"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("au_signing_in")}
        </>
      ) : (
        <>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {t("au_sign_in_with_google")}
        </>
      )}
    </button>
  );
}

// Hidden: Email/Password Login - kept for future use
function LoginForm({ onSuccess, onForgot }: { onSuccess: () => void; onForgot: () => void }) {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      onSuccess();
      navigate("/");
    } catch (err: any) {
      toast({
        title: t("au_login_failed"),
        description: err?.response?.data?.message || t("au_check_email_password"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch {
      toast({
        title: t("au_could_not_start_google"),
        description: t("au_try_again_later"),
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-[hsl(var(--popup-muted))]">{t("au_email")}</label>
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="w-full h-11 rounded-xl border border-[hsl(var(--popup-border))] bg-white/[0.03] px-3.5 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/35 focus:bg-white/[0.06]"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <label className="text-sm font-medium text-[hsl(var(--popup-muted))]">{t("au_password")}</label>
          <button
            type="button"
            onClick={onForgot}
            className="text-xs font-medium text-[hsl(var(--popup-muted))] hover:text-white hover:underline"
          >
            {t("au_forgot")}
          </button>
        </div>
        <input
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          className="w-full h-11 rounded-xl border border-[hsl(var(--popup-border))] bg-white/[0.03] px-3.5 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/35 focus:bg-white/[0.06]"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full h-11 rounded-xl bg-white text-black text-sm font-semibold transition hover:bg-white/90 disabled:opacity-60"
      >
        {loading ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{t("au_signing_in")}</span> : t("au_sign_in")}
      </button>

      <div className="text-center text-xs text-[hsl(var(--popup-muted))]">{t("au_or")}</div>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        className="w-full h-11 rounded-xl border border-[hsl(var(--popup-border))] bg-transparent text-sm font-semibold text-white transition hover:bg-white/[0.06] disabled:opacity-60"
      >
        {t("au_continue_with_google")}
      </button>
    </form>
  );
}

function RegisterForm({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const { t } = useLanguage();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      await register(username, email, password);
      toast({
        title: t("au_account_created"),
        description: t("au_please_sign_in_to_continue"),
      });
      onSwitchToLogin();
    } catch (err: any) {
      toast({
        title: t("au_registration_failed"),
        description: err?.response?.data?.message || t("au_please_try_again"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-[hsl(var(--popup-muted))]">{t("au_username")}</label>
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="johndoe"
          required
          className="w-full h-11 rounded-xl border border-[hsl(var(--popup-border))] bg-white/[0.03] px-3.5 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/35 focus:bg-white/[0.06]"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-[hsl(var(--popup-muted))]">{t("au_email")}</label>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
          className="w-full h-11 rounded-xl border border-[hsl(var(--popup-border))] bg-white/[0.03] px-3.5 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/35 focus:bg-white/[0.06]"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-[hsl(var(--popup-muted))]">{t("au_password")}</label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={t("au_at_least_8_chars")}
          required
          minLength={8}
          className="w-full h-11 rounded-xl border border-[hsl(var(--popup-border))] bg-white/[0.03] px-3.5 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/35 focus:bg-white/[0.06]"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full h-11 rounded-xl bg-white text-black text-sm font-semibold transition hover:bg-white/90 disabled:opacity-60"
      >
        {loading ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{t("au_creating")}</span> : t("au_create_account_btn")}
      </button>

      <div className="text-center text-xs text-[hsl(var(--popup-muted))]">
        {t("au_already_have_account")}{' '}
        <button type="button" onClick={onSwitchToLogin} className="font-semibold text-white hover:underline">
          {t("au_sign_in")}
        </button>
      </div>
    </form>
  );
}

function ForgotForm({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      toast({
        title: t("au_unable_to_send_recovery"),
        description: err?.response?.data?.message || t("au_try_again_later"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return sent ? (
    <div className="rounded-xl border border-[hsl(var(--popup-border))] bg-white/[0.03] p-5 text-sm text-white/80">
      {t("au_recovery_link_sent_to")} <span className="font-medium text-white">{email}</span>. {t("au_check_inbox_spam")}
    </div>
  ) : (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-[hsl(var(--popup-muted))]">{t("au_email")}</label>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
          className="w-full h-11 rounded-xl border border-[hsl(var(--popup-border))] bg-white/[0.03] px-3.5 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/35 focus:bg-white/[0.06]"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full h-11 rounded-xl bg-white text-black text-sm font-semibold transition hover:bg-white/90 disabled:opacity-60"
      >
        {loading ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{t("au_sending")}</span> : t("au_send_recovery_link")}
      </button>

      <div className="text-center text-xs text-[hsl(var(--popup-muted))]">
        {t("au_remember_it")}{' '}
        <button type="button" onClick={onSwitchToLogin} className="font-semibold text-white hover:underline">
          {t("au_sign_in")}
        </button>
      </div>
    </form>
  );
}

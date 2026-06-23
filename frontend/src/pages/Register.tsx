import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "@/lib/heroicons";

export default function Register() {
  const { loginWithGoogle } = useAuth();

  useEffect(() => {
    loginWithGoogle();
  }, [loginWithGoogle]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm text-white/70">Redirecting to Google login...</p>
      </div>
    </div>
  );
}

/*
// Hidden: Original email/password registration form - kept for future use
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "@/lib/heroicons";
import { useToast } from "@/hooks/use-toast";
import AuthShell from "@/components/auth/AuthShell";

export default function RegisterOld() {
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
*/


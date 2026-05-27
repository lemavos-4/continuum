import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { UsageProvider } from "@/contexts/UsageContext";
import { EntityProvider } from "@/contexts/EntityContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import GoogleCallback from "./pages/GoogleCallback";
import LoginSuccess from "./pages/LoginSuccess";
import Dashboard from "./pages/Dashboard";
import LandingPage from "./pages/LandingPage";
import Notes from "./pages/Notes";
import NoteEditor from "./pages/NoteEditor";
import Entities from "./pages/Entities";
import EntityDetail from "./pages/EntityDetail";
import KnowledgeGraph from "./pages/KnowledgeGraph";
import Vault from "./pages/Vault";
import VaultDownload from "./pages/VaultDownload";
import Activities from "./pages/Activities";
import Projects from "./pages/Projects";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Subscription from "./pages/Subscription";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import Insights from "./pages/Insights";
import { Loader2 } from "@/lib/heroicons";
import { extractAuthTokensFromLocation, sanitizeAuthRedirectUrl } from "@/lib/auth-redirect";

const queryClient = new QueryClient();

function HomeRoute() {
  const { user, loading } = useAuth();
  sanitizeAuthRedirectUrl();
  const authTokens = extractAuthTokensFromLocation();

  if (authTokens?.accessToken) {
    return <LoginSuccess />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (user) return <Dashboard />;
  return <LandingPage />;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<HomeRoute />} />
    <Route path="/index" element={<HomeRoute />} />
    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
    <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
    <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
    <Route path="/google-callback" element={<GoogleCallback />} />
    <Route path="/login-successful" element={<LoginSuccess />} />
    <Route path="/login-token" element={<LoginSuccess />} />
    <Route path="/terms" element={<Terms />} />
    <Route path="/privacy" element={<Privacy />} />
    <Route path="/notes" element={<ProtectedRoute><Notes /></ProtectedRoute>} />
    <Route path="/notes/:id" element={<ProtectedRoute><NoteEditor /></ProtectedRoute>} />
    <Route path="/entities" element={<ProtectedRoute><Entities /></ProtectedRoute>} />
    <Route path="/entities/:id" element={<ProtectedRoute><EntityDetail /></ProtectedRoute>} />
    {/* Activity Routes */}
    <Route path="/tracking" element={<Navigate to="/activities" replace />} />
    <Route path="/activities" element={<ProtectedRoute><Activities /></ProtectedRoute>} />
    <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
    {/* Analytics Routes */}
    <Route path="/tracking/:id" element={<ProtectedRoute><EntityDetail /></ProtectedRoute>} />
    <Route path="/activities/:id" element={<ProtectedRoute><EntityDetail /></ProtectedRoute>} />
    <Route path="/projects/:id" element={<ProtectedRoute><EntityDetail /></ProtectedRoute>} />
    <Route path="/graph" element={<ProtectedRoute><KnowledgeGraph /></ProtectedRoute>} />
    <Route path="/insights" element={<ProtectedRoute><Insights /></ProtectedRoute>} />
    <Route path="/vault" element={<ProtectedRoute><Vault /></ProtectedRoute>} />
    <Route path="/vault/download/:fileId" element={<ProtectedRoute><VaultDownload /></ProtectedRoute>} />
    <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <HashRouter>
          <LanguageProvider>
            <AuthProvider>
              <UsageProvider>
                <EntityProvider>
                  <AppRoutes />
                </EntityProvider>
              </UsageProvider>
            </AuthProvider>
          </LanguageProvider>
        </HashRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

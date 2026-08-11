import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { UsageProvider } from "@/contexts/UsageContext";
import { EntityProvider } from "@/contexts/EntityContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SkeletonPage } from "@/components/ui/skeleton";
import { PageTransition } from "@/components/motion/PageTransition";
import { GlobalProgress } from "@/components/motion/GlobalProgress";
import { extractAuthTokensFromLocation, sanitizeAuthRedirectUrl } from "@/lib/auth-redirect";
import { EMAIL_AUTH_ENABLED } from "@/lib/dev-mode";

import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

// Auth-critical screens stay eager (they gate the first paint); everything else
// is code-split and streamed in behind a skeleton.
import LoginSuccess from "./pages/LoginSuccess";
import Dashboard from "./pages/Dashboard";
import LandingPage from "./pages/LandingPage";

const Login = React.lazy(() => import("./pages/Login"));
const Register = React.lazy(() => import("./pages/Register"));
const ForgotPassword = React.lazy(() => import("./pages/ForgotPassword"));
const GoogleCallback = React.lazy(() => import("./pages/GoogleCallback"));
const Notes = React.lazy(() => import("./pages/Notes"));
const NoteEditor = React.lazy(() => import("./pages/NoteEditor"));
const Entities = React.lazy(() => import("./pages/Entities"));
const EntityDetail = React.lazy(() => import("./pages/EntityDetail"));
const KnowledgeGraph = React.lazy(() => import("./pages/KnowledgeGraph"));
const Vault = React.lazy(() => import("./pages/Vault"));
const VaultDownload = React.lazy(() => import("./pages/VaultDownload"));
const Activities = React.lazy(() => import("./pages/Activities"));
const Projects = React.lazy(() => import("./pages/Projects"));
const Terms = React.lazy(() => import("./pages/Terms"));
const Privacy = React.lazy(() => import("./pages/Privacy"));
const Support = React.lazy(() => import("./pages/Support"));
const About = React.lazy(() => import("./pages/About"));
const Pricing = React.lazy(() => import("./pages/Pricing"));
const Subscription = React.lazy(() => import("./pages/Subscription"));
const Profile = React.lazy(() => import("./pages/Profile"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const Insights = React.lazy(() => import("./pages/Insights"));

const queryClient = new QueryClient();

function RouteFallback() {
  return (
    <div className="min-h-screen bg-background">
      <SkeletonPage />
    </div>
  );
}

function HomeRoute() {
  const { user, loading } = useAuth();
  // Read tokens once per mount so we don't recompute on every render.
  const [hasIncomingToken] = React.useState(() => {
    const t = extractAuthTokensFromLocation();
    return !!t?.accessToken;
  });

  React.useEffect(() => {
    if (!hasIncomingToken) sanitizeAuthRedirectUrl();
  }, [hasIncomingToken]);

  if (hasIncomingToken) return <LoginSuccess />;

  if (loading) return <RouteFallback />;
  if (user) return <Dashboard />;
  return <LandingPage />;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <RouteFallback />;
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <RouteFallback />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const AppRoutes = () => {
  const location = useLocation();
  return (
    <React.Suspense fallback={<RouteFallback />}>
      <AnimatePresence mode="wait" initial={false}>
        <PageTransition key={location.pathname}>
          <Routes location={location}>
    <Route path="/" element={<HomeRoute />} />
    <Route path="/index" element={<HomeRoute />} />
    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
    <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
    <Route
      path="/forgot-password"
      element={EMAIL_AUTH_ENABLED ? <PublicRoute><ForgotPassword /></PublicRoute> : <Navigate to="/login" replace />}
    />

    <Route path="/google-callback" element={<GoogleCallback />} />
    <Route path="/login-successful" element={<LoginSuccess />} />
    <Route path="/login-token" element={<LoginSuccess />} />
    <Route path="/terms" element={<Terms />} />
    <Route path="/privacy" element={<Privacy />} />
    <Route path="/support" element={<Support />} />
    <Route path="/about" element={<About />} />
    <Route path="/pricing" element={<Pricing />} />
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
        </PageTransition>
      </AnimatePresence>
    </React.Suspense>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <GlobalProgress />
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
    <Analytics />
    <SpeedInsights />
  </QueryClientProvider>
);

export default App;

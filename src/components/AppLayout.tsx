import { ReactNode, useState } from "react";
import { CommandPalette } from "@/components/CommandPalette";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  LayoutDashboard,
  StickyNote,
  Tag,
  LogOut,
  User as UserIcon,
  Menu,
  GlobeAlt,
  Settings,
  Timer,
  Clock,
  Lock,
  BarChart3,
  X,
  FolderOpen,
  Squares2x2,
  ArrowLeft,
} from "@/lib/heroicons";
import {
  Squares2X2Icon as Squares2x2Solid,
  DocumentTextIcon as StickyNoteSolid,
  TagIcon as TagSolid,
  ChartBarIcon as BarChart3Solid,
} from "@heroicons/react/24/solid";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { SessionNavBar } from "@/components/ui/session-nav-bar";
import { useLanguage } from "@/contexts/LanguageContext";
import { OfflineStatus } from "@/components/offline/OfflineStatus";

const mobileItems = [
  { to: "/", icon: Squares2x2, key: "nav_dashboard", end: true },
  { to: "/notes", icon: StickyNote, key: "nav_notes" },
  { to: "/entities", icon: Tag, key: "nav_entities" },
  { to: "/insights", icon: BarChart3, key: "nav_insights" },
  { to: "/vault", icon: Lock, key: "nav_vault" },
  { to: "/projects", icon: FolderOpen, key: "nav_projects" },
  { to: "/activities", icon: Clock, key: "nav_activities" },
  { to: "/graph", icon: GlobeAlt, key: "nav_graph" },
];

// Primary tabs shown in the bottom navigation bar on mobile.
const mobileTabs = [
  { to: "/", icon: Squares2x2, iconSolid: Squares2x2Solid, key: "nav_dashboard", end: true },
  { to: "/notes", icon: StickyNote, iconSolid: StickyNoteSolid, key: "nav_notes" },
  { to: "/entities", icon: Tag, iconSolid: TagSolid, key: "nav_entities" },
  { to: "/insights", icon: BarChart3, iconSolid: BarChart3Solid, key: "nav_insights" },
];


export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const isGraphPage = location.pathname.startsWith("/graph");
  
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);


  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleLogoutRequest = () => {
    setConfirmLogoutOpen(true);
  };

  const initial = (user?.username || user?.email || "U").trim().charAt(0).toUpperCase();
  const display = user?.username || user?.email?.split("@")[0] || "Guest";

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <CommandPalette />

      {/* Mobile top bar */}
      <div className="fixed left-0 right-0 top-0 z-40 flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-2">
          <img src="/favicon.ico" alt="Continuum" className="h-7 w-7 rounded-lg object-contain" />
          <span className="text-base font-serif tracking-tight">Continuum</span>
        </div>

        <div className="flex-1" />

        <OfflineStatus compact />

        {isGraphPage && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("common_back") || "Back"}
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirmLogoutOpen}
        onOpenChange={setConfirmLogoutOpen}
        title={t("auth_signOut")}
        description={t("auth_signOutDesc")}
        confirmText={t("nav_logout")}
        destructive
        onConfirm={async () => {
          setConfirmLogoutOpen(false);
          await handleLogout();
        }}
      />

      {/* Desktop hover-expand sidebar */}
      <SessionNavBar />

      <main className="min-w-0 flex-1 overflow-auto bg-background lg:ml-[3.25rem]">
        <div className="h-14 lg:hidden" />
        {children}
        {/* Spacer so content isn't hidden behind the floating mobile bottom nav */}
        <div className="h-[calc(5.5rem+env(safe-area-inset-bottom))] lg:hidden" />
      </main>

      {/* Desktop offline / sync indicator — floating top-right pill */}
      <div className="pointer-events-none fixed right-4 top-4 z-40 hidden lg:block">
        <div className="pointer-events-auto rounded-full border border-border bg-background/80 px-1 py-0.5 shadow-sm backdrop-blur">
          <OfflineStatus compact />
        </div>
      </div>

      {/* Mobile bottom tab bar — floating, rounded */}
      {!isGraphPage && (
        <nav
          className="fixed inset-x-3 z-40 lg:hidden"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
        >
          <div className="flex items-stretch justify-around gap-1 rounded-2xl border border-white/15 bg-background/75 px-2 py-1.5 shadow-[0_8px_28px_rgba(0,0,0,0.45)] backdrop-blur-md supports-[backdrop-filter]:bg-background/65">
            {mobileTabs.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.end}
                className={({ isActive }) =>
                  cn(
                    "flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium transition-colors active:scale-95",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )
                }
              >
                {({ isActive }) => {
                  const IconEl = isActive && it.iconSolid ? it.iconSolid : it.icon;
                  return (
                    <>
                      <span className="grid h-7 w-10 place-items-center rounded-lg">
                        <IconEl className="h-5 w-5" />
                      </span>
                      <span className="leading-none">{t(it.key)}</span>
                    </>
                  );
                }}
              </NavLink>
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium text-muted-foreground transition-colors active:scale-95 data-[state=open]:text-primary"
                >
                  <span className="grid h-7 w-10 place-items-center rounded-lg">
                    <Menu className="h-5 w-5" />
                  </span>
                  <span className="leading-none">{t("nav_more")}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="end" className="mb-2 w-56">
                <DropdownMenuItem onClick={() => navigate("/projects")}>
                  <FolderOpen className="mr-2 h-4 w-4" /> {t("nav_projects")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/activities")}>
                  <Clock className="mr-2 h-4 w-4" /> {t("nav_activities")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/graph")}>
                  <GlobeAlt className="mr-2 h-4 w-4" /> {t("nav_graph")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/vault")}>
                  <Lock className="mr-2 h-4 w-4" /> {t("nav_vault")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-zinc-500">{user?.email}</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <UserIcon className="mr-2 h-4 w-4" /> {t("nav_profile")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogoutRequest}>
                  <LogOut className="mr-2 h-4 w-4" /> {t("nav_logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </nav>
      )}


    </div>
  );
}

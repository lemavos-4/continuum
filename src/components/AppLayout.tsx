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
  Layers,
  Settings,
  Timer,
  Clock,
  Lock,
  Sparkles,
  X,
  FolderOpen,
} from "@/lib/heroicons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MobileSidebar } from "@/components/sidebar/MobileSidebar";
import { SessionNavBar } from "@/components/ui/session-nav-bar";

const mobileItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/notes", icon: StickyNote, label: "Notes" },
  { to: "/entities", icon: Tag, label: "Entities" },
  { to: "/insights", icon: Sparkles, label: "Insights" },
  { to: "/vault", icon: Lock, label: "Vault" },
  { to: "/projects", icon: FolderOpen, label: "Projects" },
  { to: "/activities", icon: Clock, label: "Activities" },
  { to: "/graph", icon: Layers, label: "Graph" },
];


export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isGraphPage = location.pathname.startsWith("/graph");
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
      <div className="fixed left-0 right-0 top-0 z-40 flex items-center justify-between gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur-xl lg:hidden">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-md bg-muted text-foreground transition-colors hover:bg-accent"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex-1" />

        <div className="h-10 w-10" />
      </div>

      {/* Mobile drawer */}
      <MobileSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)}>
        <div className="flex h-full flex-col bg-sidebar backdrop-blur-xl">
          <div className="flex h-[54px] items-center justify-between border-b border-sidebar-border px-4">
            <div className="flex items-center gap-2">
              <img src="/favicon.ico" alt="Continuum" className="h-6 w-6 rounded object-contain" />
              <span className="text-sm font-semibold">Continuum</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="grid h-8 w-8 place-items-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto p-2">
            {mobileItems.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex h-10 items-center gap-3 rounded-md px-3 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
                  )
                }
              >
                <it.icon className="h-4 w-4" />
                <span>{it.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="border-t border-sidebar-border p-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-sidebar-accent">
                  <div className="grid h-7 w-7 place-items-center rounded-full bg-sidebar-primary text-[11px] font-bold text-sidebar-primary-foreground">
                    {initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-sidebar-accent-foreground">{display}</p>
                    <p className="truncate text-[11px] text-sidebar-foreground/70">{user?.plan || "FREE"}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuLabel className="text-xs text-zinc-500">{user?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { navigate("/profile"); setSidebarOpen(false); }}>
                  <UserIcon className="mr-2 h-4 w-4" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { navigate("/subscription"); setSidebarOpen(false); }}>
                  <Settings className="mr-2 h-4 w-4" /> Subscription
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogoutRequest}>
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </MobileSidebar>
      <ConfirmDialog
        open={confirmLogoutOpen}
        onOpenChange={setConfirmLogoutOpen}
        title="Sign out?"
        description="You will be signed out of your account continue?"
        confirmText="Logout"
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
      </main>
    </div>
  );
}

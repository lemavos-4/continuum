"use client";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import {
  Activity,
  ChevronsUpDown,
  HardDrive,
  LayoutDashboard,
  LogOut,
  Search,
  Settings,
  Sparkles,
  StickyNote,
  Tag,
  Timer,
  UserCircle,
  Lock,
  Clock,
  FolderOpen,
  Layers,
} from "@/lib/heroicons";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";

const sidebarVariants = {
  open: { width: "15rem" },
  closed: { width: "3.25rem" },
};

const labelVariants = {
  open: { opacity: 1, x: 0, transition: { duration: 0.15 } },
  closed: { opacity: 0, x: -8, transition: { duration: 0.1 } },
};

const transitionProps = {
  type: "tween" as const,
  ease: "easeOut" as const,
  duration: 0.2,
};

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
}

const primaryNav: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/notes", label: "Notes", icon: StickyNote },
  { to: "/entities", label: "Entities", icon: Tag },
  { to: "/vault", label: "Vault", icon: Lock },
];

const trackingNav: NavItem[] = [
  { to: "/projects", label: "Projects", icon: FolderOpen },
  { to: "/activities", label: "Activities", icon: Clock },
];

const exploreNav: NavItem[] = [
  { to: "/insights", label: "Insights", icon: Sparkles },
  { to: "/graph", label: "Graph", icon: Layers },
];

function SidebarLink({
  item,
  collapsed,
  pathname,
}: {
  item: NavItem;
  collapsed: boolean;
  pathname: string;
}) {
  const active = item.end
    ? pathname === item.to
    : pathname === item.to || pathname.startsWith(item.to + "/");
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      title={collapsed ? item.label : undefined}
      className={cn(
        "flex h-9 w-full flex-row items-center rounded-md px-2 text-sidebar-foreground transition-colors",
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        active && "bg-sidebar-accent text-sidebar-accent-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <motion.span
        variants={labelVariants}
        className="ml-2 truncate text-sm font-medium"
      >
        {!collapsed && item.label}
      </motion.span>
    </NavLink>
  );
}

export function SessionNavBar() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const initial = (user?.username || user?.email || "U").trim().charAt(0).toUpperCase();
  const display = user?.username || user?.email?.split("@")[0] || "Guest";

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleLogoutRequest = () => setConfirmLogoutOpen(true);

  return (
    <motion.aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden h-full shrink-0 lg:flex",
        "border-r border-sidebar-border bg-sidebar/85 backdrop-blur-xl",
      )}
      initial={false}
      animate={isCollapsed ? "closed" : "open"}
      variants={sidebarVariants}
      transition={transitionProps}
      onMouseEnter={() => setIsCollapsed(false)}
      onMouseLeave={() => setIsCollapsed(true)}
    >
      <div className="relative z-40 flex h-full w-full flex-col text-sidebar-foreground">
        {/* Brand / search trigger */}
        <div className="flex h-[54px] w-full shrink-0 items-center border-b border-sidebar-border px-2">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-sidebar-accent"
          >
            <img
              src="/favicon.ico"
              alt="Continuum"
              className="h-6 w-6 shrink-0 rounded object-contain"
            />
            <motion.span
              variants={labelVariants}
              className="truncate text-sm font-semibold tracking-tight text-sidebar-accent-foreground"
            >
              {!isCollapsed && "Continuum"}
            </motion.span>
          </button>
        </div>

        <div className="flex h-full w-full flex-col">
          <ScrollArea className="grow">
            <div className="flex flex-col gap-1 p-2">
              <button
                type="button"
                onClick={() => {
                  // Trigger Ctrl+K command palette (dispatch on document so listeners on document receive it)
                  document.dispatchEvent(
                    new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true, cancelable: true }),
                  );
                }}
                className="flex h-9 w-full items-center rounded-md px-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                title="Search"
              >
                <Search className="h-4 w-4 shrink-0" />
                <motion.span variants={labelVariants} className="ml-2 truncate text-sm font-medium">
                  {!isCollapsed && "Search"}
                </motion.span>
                <motion.span
                  variants={labelVariants}
                  className="ml-auto rounded border border-sidebar-border px-1.5 py-0.5 font-mono text-[10px] text-sidebar-foreground/70"
                >
                  {!isCollapsed && "Ctrl+K"}
                </motion.span>
              </button>

              <Separator className="my-2 bg-sidebar-border" />

              {primaryNav.map((it) => (
                <SidebarLink key={it.to} item={it} collapsed={isCollapsed} pathname={pathname} />
              ))}

              <Separator className="my-2 bg-sidebar-border" />

              {trackingNav.map((it) => (
                <SidebarLink key={it.to} item={it} collapsed={isCollapsed} pathname={pathname} />
              ))}

              <Separator className="my-2 bg-sidebar-border" />

              {exploreNav.map((it) => (
                <SidebarLink key={it.to} item={it} collapsed={isCollapsed} pathname={pathname} />
              ))}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="flex flex-col gap-1 border-t border-sidebar-border p-2">
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex h-9 w-full items-center justify-start gap-2 rounded-md px-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <div className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-sidebar-primary text-[10px] font-bold text-sidebar-primary-foreground">
                    {initial}
                  </div>
                  <motion.span
                    variants={labelVariants}
                    className="flex w-full items-center gap-2 overflow-hidden"
                  >
                    {!isCollapsed && (
                      <>
                        <span className="truncate text-sm font-medium">{display}</span>
                        <ChevronsUpDown className="ml-auto h-3.5 w-3.5 text-sidebar-foreground/70" />
                      </>
                    )}
                  </motion.span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="right"
                align="end"
                sideOffset={8}
                className="w-56"
              >
                <div className="flex flex-col gap-0.5 px-2 py-1.5">
                  <span className="truncate text-sm font-medium text-[hsl(var(--popup-foreground))]">{display}</span>
                  <span className="truncate text-xs text-[hsl(var(--popup-muted))]">{user?.email}</span>
                  <span className="mt-1 inline-flex w-fit items-center rounded border border-[hsl(var(--popup-border))] px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-[hsl(var(--popup-muted))]">
                    {user?.plan || "FREE"}
                  </span>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <UserCircle className="mr-2 h-4 w-4" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/subscription")}>
                  <Settings className="mr-2 h-4 w-4" /> Subscription
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogoutRequest}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={confirmLogoutOpen}
        onOpenChange={setConfirmLogoutOpen}
        title="Sign out?"
        description="You will be signed out of your account and returned to the landing page."
        confirmText="Logout"
        destructive
        onConfirm={async () => {
          setConfirmLogoutOpen(false);
          await handleLogout();
        }}
      />
    </motion.aside>
  );
}

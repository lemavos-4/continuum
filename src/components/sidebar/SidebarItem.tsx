import { NavLink } from "react-router-dom";
import { LucideIcon } from "@/lib/heroicons";
import { cn } from "@/lib/utils";
import { SidebarTooltip } from "@/components/sidebar/SidebarTooltip";

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  to?: string;
  badge?: string | number;
  collapsed?: boolean;
  onClick?: () => void;
}

export function SidebarItem({ icon: Icon, label, to, badge, collapsed = false, onClick }: SidebarItemProps) {
  const item = (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-2xl px-3 py-3 transition-all duration-250 ease-out",
        "bg-white/0 text-slate-100 hover:bg-white/5 hover:text-white",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        "shadow-none hover:shadow-[0_10px_30px_rgba(255,255,255,0.06)]",
      )}
      onClick={onClick}
    >
      <Icon className="h-5 w-5 text-slate-300 transition-colors duration-200 group-hover:text-white" />
      {!collapsed && (
        <span className="truncate text-sm font-medium text-slate-100">{label}</span>
      )}
      {badge != null && !collapsed && (
        <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200">
          {badge}
        </span>
      )}
    </div>
  );

  const link = (
    <NavLink
      to={to!}
      className={({ isActive }) =>
        cn(
          "group flex items-center gap-3 rounded-2xl px-3 py-3 transition-all duration-250 ease-out",
          "text-slate-200 hover:text-white hover:bg-white/5",
          isActive && "bg-white/7 text-white shadow-[0_12px_40px_rgba(255,255,255,0.08)]",
        )
      }
      onClick={onClick}
    >
      <Icon className="h-5 w-5 text-slate-300 transition-colors duration-200 group-hover:text-white" />
      {!collapsed && <span className="truncate text-sm font-medium">{label}</span>}
      {badge != null && !collapsed && (
        <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200">
          {badge}
        </span>
      )}
    </NavLink>
  );

  if (to) {
    return collapsed ? (
      <SidebarTooltip content={label}>{link}</SidebarTooltip>
    ) : (
      link
    );
  }

  if (collapsed) {
    return (
      <SidebarTooltip content={label}>
        <button type="button" className="w-full" onClick={onClick} aria-label={label}>
          {item}
        </button>
      </SidebarTooltip>
    );
  }

  return <button type="button" className="w-full" onClick={onClick}>{item}</button>;
}

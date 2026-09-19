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
  // Item renderizado quando NÃO possui um link (apenas clique/botão)
  const item = (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-2xl px-3 py-3 transition-all duration-250 ease-out",
        "bg-foreground/0 text-slate-100 hover:bg-foreground/5 hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        "shadow-none hover:shadow-[0_10px_30px_rgba(255,255,255,0.06)]",
      )}
      onClick={onClick}
    >
      <Icon className="h-5 w-5 text-slate-300 transition-colors duration-200 group-hover:text-foreground" />
      {!collapsed && (
        <span className="truncate text-sm font-medium text-slate-100">{label}</span>
      )}
      {badge != null && !collapsed && (
        <span className="ml-auto rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200">
          {badge}
        </span>
      )}
    </div>
  );

  // Item renderizado quando POSSUI um link de navegação
  const link = (
    <NavLink
      to={to!}
      className={({ isActive }) =>
        cn(
          // REMOVIDO: overflow-hidden para permitir que a sombra (glow) apareça para fora do container
          "group relative flex items-center gap-3 rounded-2xl px-3 py-3 transition-all duration-250 ease-out",
          "text-slate-200 hover:text-foreground hover:bg-foreground/5",
          // CORRIGIDO: bg-foreground/[0.07] com colchetes e um shadow com raio centralizado e maior opacidade para o glow
          isActive && "bg-foreground/[0.07] text-foreground shadow-[0_0_20px_rgba(255,255,255,0.18)] before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-r before:from-transparent before:via-foreground/5 before:to-foreground/15 before:pointer-events-none",
        )
      }
      onClick={onClick}
    >
      <Icon className="h-5 w-5 text-slate-300 transition-colors duration-200 group-hover:text-foreground relative z-10" />
      {!collapsed && <span className="truncate text-sm font-medium relative z-10">{label}</span>}
      {badge != null && !collapsed && (
        <span className="ml-auto rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200 relative z-10">
          {badge}
        </span>
      )}
    </NavLink>
  );

  // Retorno condicional baseado no estado (com link, colapsado ou botão puro)
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
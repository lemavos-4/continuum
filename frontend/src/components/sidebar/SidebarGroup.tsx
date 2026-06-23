import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LucideIcon, ChevronDown } from "@/lib/heroicons";
import { cn } from "@/lib/utils";
import { SidebarTooltip } from "@/components/sidebar/SidebarTooltip";
import { SidebarItem } from "@/components/sidebar/SidebarItem";

export interface SidebarGroupItem {
  label: string;
  to: string;
  icon: LucideIcon;
  badge?: string | number;
}

interface SidebarGroupProps {
  title: string;
  icon: LucideIcon;
  items: SidebarGroupItem[];
  collapsed?: boolean;
  activePath?: string;
  onItemClick?: () => void;
}

export function SidebarGroup({ title, icon: Icon, items, collapsed = false, activePath, onItemClick }: SidebarGroupProps) {
  const [open, setOpen] = React.useState(() =>
    Boolean(activePath && items.some((item) => activePath.startsWith(item.to))),
  );
  const [hovering, setHovering] = React.useState(false);

  React.useEffect(() => {
    if (activePath && items.some((item) => activePath.startsWith(item.to))) {
      setOpen(true);
    }
  }, [activePath, items]);

  const groupButton = (
    <button
      type="button"
      className={cn(
        "group flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium transition-all duration-250 ease-out",
        "text-slate-200 hover:text-white hover:bg-white/5",
        open && "bg-white/7 text-white shadow-[0_12px_40px_rgba(255,255,255,0.08)]",
      )}
      onClick={() => setOpen((value) => !value)}
      aria-expanded={open}
    >
      <span className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-slate-300 transition-colors duration-200 group-hover:text-white" />
        {!collapsed && <span>{title}</span>}
      </span>
      {!collapsed && <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", open && "rotate-180")} />}
    </button>
  );

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {collapsed ? (
        <SidebarTooltip content={title}>{groupButton}</SidebarTooltip>
      ) : (
        groupButton
      )}

      <AnimatePresence>
        {(!collapsed && open) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="mt-2 space-y-2 overflow-hidden"
          >
            {items.map((item) => (
              <SidebarItem
                key={item.to}
                icon={item.icon}
                label={item.label}
                to={item.to}
                badge={item.badge}
                collapsed={false}
                onClick={onItemClick}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {collapsed && hovering && (
          <motion.div
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 28 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute left-full top-0 z-20 min-w-[16rem] rounded-xl border border-white/8 bg-black/90 p-3 shadow-[0_30px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl"
          >
            <div className="space-y-2">
              {items.map((item) => (
                <SidebarItem
                  key={item.to}
                  icon={item.icon}
                  label={item.label}
                  to={item.to}
                  badge={item.badge}
                  collapsed={false}
                  onClick={onItemClick}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { AnimatePresence, motion } from "framer-motion";
import { ReactNode } from "react";
import { Menu, ChevronLeft, ChevronRight } from "@/lib/heroicons";
import { cn } from "@/lib/utils";

interface SidebarProps {
  expanded: boolean;
  onToggleCollapse: () => void;
  onOpenMobile?: () => void;
  mobileMode?: boolean;
  children: ReactNode;
}

export function Sidebar({ expanded, onToggleCollapse, onOpenMobile, mobileMode = false, children }: SidebarProps) {
  return (
    <div
      className={cn(
        "flex h-full flex-col bg-black/90 border-r border-white/8 shadow-[0_30px_70px_rgba(0,0,0,0.6)] backdrop-blur-xl",
        "ring-1 ring-white/5",
        "overflow-hidden",
        expanded ? "w-72" : "w-20",
        mobileMode ? "min-w-[18rem]" : "min-w-0",
      )}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-4">
        <button
          type="button"
          className="flex items-center gap-3 rounded-3xl bg-white/5 px-3 py-2 text-left transition-all duration-200 hover:bg-white/10"
          onClick={onOpenMobile}
          aria-label="Open sidebar"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white">
            <Menu className="h-5 w-5" />
          </div>
          {expanded && (
            <div className="space-y-0.5 text-left">
              <p className="text-sm font-semibold tracking-tight text-white">Continuum</p>
              <p className="text-[11px] uppercase tracking-[0.26em] text-slate-400">Workspace</p>
            </div>
          )}
        </button>

        {!mobileMode && (
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-2xl bg-white/5 text-slate-200 transition-colors duration-200 hover:bg-white/10"
            onClick={onToggleCollapse}
            aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            {expanded ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </button>
        )}
      </div>

      <motion.div
        className="flex-1 overflow-y-auto px-2 pb-4"
        initial={false}
        animate={{ paddingLeft: expanded ? 0 : 0 }}
      >
        <AnimatePresence mode="wait">{children}</AnimatePresence>
      </motion.div>
    </div>
  );
}

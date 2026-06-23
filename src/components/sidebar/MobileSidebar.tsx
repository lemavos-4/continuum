import { AnimatePresence, motion } from "framer-motion";
import { ReactNode } from "react";

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function MobileSidebar({ open, onClose, children }: MobileSidebarProps) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-label="Close mobile sidebar overlay"
          />
          <motion.aside
            className="fixed inset-y-0 left-0 z-50 w-[min(88vw,18rem)] bg-black/90 border-r border-white/8 shadow-[0_30px_70px_rgba(0,0,0,0.6)] backdrop-blur-xl"
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            aria-label="Mobile sidebar"
          >
            {children}
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

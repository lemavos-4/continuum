import { motion } from "framer-motion";
import { ReactNode } from "react";
import { pageVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Wraps a route so it animates in on mount and out on unmount. */
export function PageTransition({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={cn("min-h-screen", className)}
    >
      {children}
    </motion.div>
  );
}

export default PageTransition;
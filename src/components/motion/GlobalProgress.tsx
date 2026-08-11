import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { DURATION, EASE } from "@/lib/motion";

/**
 * Thin top-of-viewport progress bar. It eases toward 90% while any query or
 * mutation is in flight, then snaps to 100% and fades out — so slow networks
 * always have a visible, honest signal of work happening.
 */
export function GlobalProgress() {
  const fetching = useIsFetching();
  const mutating = useIsMutating();
  const active = fetching + mutating > 0;

  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];

    if (active) {
      setVisible(true);
      setProgress(12);
      const tick = window.setInterval(() => {
        setProgress((p) => (p >= 90 ? 90 : p + Math.max(0.6, (90 - p) * 0.12)));
      }, 180);
      return () => window.clearInterval(tick);
    }

    if (visible) {
      setProgress(100);
      const hide = window.setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 320);
      timers.current.push(hide);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-0.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: DURATION.base } }}
          aria-hidden
        >
          <motion.div
            className="h-full bg-primary/80 shadow-[0_0_12px_hsl(var(--primary)/0.6)]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: DURATION.slow, ease: EASE.inOut }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default GlobalProgress;
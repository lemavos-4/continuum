import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface FloatingCreateButtonProps {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

/**
 * Mobile-only floating pill action (e.g. "New note").
 * Auto-hides while the user scrolls down and returns on scroll up.
 */
export function FloatingCreateButton({
  label,
  onClick,
  icon,
  disabled,
  className,
}: FloatingCreateButtonProps) {
  const [visible, setVisible] = useState(true);
  const lastY = useRef(0);

  useEffect(() => {
    const handler = (e: Event) => {
      const target = e.target as HTMLElement | Document;
      const y =
        target instanceof HTMLElement ? target.scrollTop : window.scrollY || 0;
      const delta = y - lastY.current;
      if (Math.abs(delta) < 6) return;
      setVisible(delta < 0 || y < 40);
      lastY.current = y;
    };
    document.addEventListener("scroll", handler, true);
    window.addEventListener("scroll", handler, { passive: true });
    return () => {
      document.removeEventListener("scroll", handler, true);
      window.removeEventListener("scroll", handler);
    };
  }, []);

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 z-30 flex justify-end px-4 transition-all duration-300 lg:hidden",
        visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
        className,
      )}
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 5.25rem)" }}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-[15px] font-medium text-background shadow-[0_10px_30px_rgba(0,0,0,0.45)] transition active:scale-95 disabled:opacity-60"
      >
        {icon}
        {label}
      </button>
    </div>
  );
}

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface FitTextProps {
  children: string;
  /** Maximum font size in px. */
  max?: number;
  /** Minimum font size in px. */
  min?: number;
  className?: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";
}

/**
 * Single-line text that shrinks its font-size until it fits its container.
 * Logic-free presentational helper.
 */
export function FitText({ children, max = 20, min = 12, className, as: Tag = "span" }: FitTextProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [size, setSize] = useState(max);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fit = () => {
      let current = max;
      el.style.fontSize = `${current}px`;
      while (current > min && el.scrollWidth > el.clientWidth) {
        current -= 1;
        el.style.fontSize = `${current}px`;
      }
      setSize(current);
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [children, max, min]);

  return (
    <Tag
      ref={ref as never}
      style={{ fontSize: `${size}px` }}
      className={cn("block min-w-0 truncate", className)}
    >
      {children}
    </Tag>
  );
}

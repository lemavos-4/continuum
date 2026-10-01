import { useCallback, useRef } from "react";

type Options = {
  onLongPress: () => void;
  onClick?: () => void;
  ms?: number;
  moveTolerance?: number;
};

const INTERACTIVE_SELECTOR =
  'button, [role="button"], [role="link"], a[href], input, textarea, select, summary, [contenteditable="true"]';

/**
 * Cross-input long-press handler. Distinguishes a hold (>= ms) from a tap/click.
 * Returns props to spread on a button/div (touch + pointer + mouse).
 */
export function useLongPress({ onLongPress, onClick, ms = 500, moveTolerance = 10 }: Options) {
  const timer = useRef<number | null>(null);
  const triggered = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);

  const clear = useCallback(() => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  /**
   * True only for interactive elements *inside* the row.
   * The row itself is usually role="button", so it must be excluded —
   * otherwise every press is ignored and long-press/select never fires.
   */
  const isInteractiveChild = useCallback((e: React.SyntheticEvent) => {
    const target = e.target;
    const host = e.currentTarget as Element;
    if (!(target instanceof Element)) return false;
    const match = target.closest(INTERACTIVE_SELECTOR);
    return !!match && match !== host && host.contains(match);
  }, []);

  const move = useCallback(
    (x: number, y: number) => {
      if (!start.current) return;
      if (
        Math.abs(x - start.current.x) > moveTolerance ||
        Math.abs(y - start.current.y) > moveTolerance
      ) {
        clear();
      }
    },
    [moveTolerance, clear],
  );

  const end = useCallback(
    (e: React.PointerEvent) => {
      clear();
      // Let nested buttons (delete, favorite, …) handle their own click.
      if (isInteractiveChild(e)) {
        triggered.current = false;
        start.current = null;
        return;
      }
      if (triggered.current) {
        e.preventDefault();
        e.stopPropagation();
        triggered.current = false;
        return;
      }
      if (!start.current) return;
      start.current = null;
      onClick?.();
    },
    [onClick, clear, isInteractiveChild],
  );

  const begin = useCallback(
    (e: React.PointerEvent) => {
      if (isInteractiveChild(e)) {
        start.current = null;
        return;
      }

      triggered.current = false;
      start.current = { x: e.clientX, y: e.clientY };
      clear();
      timer.current = window.setTimeout(() => {
        triggered.current = true;
        onLongPress();
      }, ms);
    },
    [ms, onLongPress, clear, isInteractiveChild],
  );

  return {
    onPointerDown: begin,
    onPointerMove: (e: React.PointerEvent) => move(e.clientX, e.clientY),
    onPointerUp: (e: React.PointerEvent) => end(e),
    onPointerLeave: clear,
    onPointerCancel: clear,
    onContextMenu: (e: React.MouseEvent) => {
      if (triggered.current) e.preventDefault();
    },
  };
}

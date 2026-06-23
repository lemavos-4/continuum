import { useEffect, useState } from "react";
import { OFFLINE_EVENTS, getOfflineSnapshot } from "@/lib/offline/sync";
import type { OfflineStatus } from "@/lib/offline/types";

export interface OfflineState {
  status: OfflineStatus;
  pending: number;
  syncing: boolean;
}

export function useOfflineStatus(): OfflineState {
  const [state, setState] = useState<OfflineState>(() => getOfflineSnapshot());

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<OfflineState>).detail;
      if (detail) setState(detail);
      else setState(getOfflineSnapshot());
    };
    window.addEventListener(OFFLINE_EVENTS.STATUS, handler);
    window.addEventListener(OFFLINE_EVENTS.QUEUE, handler);
    const onOnline = () => setState((s) => ({ ...s, status: "online" }));
    const onOffline = () => setState((s) => ({ ...s, status: "offline" }));
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener(OFFLINE_EVENTS.STATUS, handler);
      window.removeEventListener(OFFLINE_EVENTS.QUEUE, handler);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return state;
}

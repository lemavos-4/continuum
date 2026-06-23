import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { entitiesApi, notesApi, vaultApi } from "@/lib/api";
import type { EntityType, UserUsage } from "@/types";

export type UsageDelta = Partial<Record<keyof UserUsage, number>>;

interface UsageContextValue {
  usage: UserUsage | null;
  loading: boolean;
  refresh: () => Promise<void>;
  applyUsageDelta: (delta: UsageDelta) => void;
}

const UsageContext = createContext<UsageContextValue | null>(null);

const EMPTY_USAGE: UserUsage = {
  notesCount: 0,
  entitiesCount: 0,
  activitiesCount: 0,
  vaultSizeMB: 0,
};

const toSafeNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeUsage = (value: unknown): UserUsage => {
  const raw = (value ?? {}) as Partial<UserUsage>;

  return {
    notesCount: toSafeNumber(raw.notesCount),
    entitiesCount: toSafeNumber(raw.entitiesCount),
    activitiesCount: toSafeNumber(raw.activitiesCount),
    vaultSizeMB: toSafeNumber(raw.vaultSizeMB),
  };
};

async function buildFallbackUsage(): Promise<UserUsage> {
  const [notesRes, entitiesRes, vaultRes] = await Promise.allSettled([
    notesApi.list(),
    entitiesApi.list(),
    vaultApi.list(),
  ]);

  const notes = notesRes.status === "fulfilled" && Array.isArray(notesRes.value.data)
    ? notesRes.value.data
    : [];

  const entities = entitiesRes.status === "fulfilled" && Array.isArray(entitiesRes.value.data)
    ? entitiesRes.value.data
    : [];

  const files = vaultRes.status === "fulfilled" && Array.isArray(vaultRes.value.data)
    ? vaultRes.value.data
    : [];

  const activitiesCount = entities.filter((entity: { type?: EntityType }) => entity.type === "ACTIVITY").length;
  const vaultSizeMB = files.reduce((total: number, file: { size?: number }) => total + toSafeNumber(file.size), 0) / (1024 * 1024);

  return {
    notesCount: notes.length,
    entitiesCount: entities.length,
    activitiesCount,
    vaultSizeMB: Number(vaultSizeMB.toFixed(2)),
  };
}

export function UsageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [usage, setUsage] = useState<UserUsage | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setUsage(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const fallbackUsage = await buildFallbackUsage();
      setUsage(fallbackUsage);
    } catch {
      setUsage(EMPTY_USAGE);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const applyUsageDelta = useCallback((delta: UsageDelta) => {
    setUsage((current) => {
      const base = normalizeUsage(current ?? EMPTY_USAGE);

      return {
        notesCount: Math.max(0, base.notesCount + toSafeNumber(delta.notesCount)),
        entitiesCount: Math.max(0, base.entitiesCount + toSafeNumber(delta.entitiesCount)),
        activitiesCount: Math.max(0, base.activitiesCount + toSafeNumber(delta.activitiesCount)),
        vaultSizeMB: Math.max(0, Number((base.vaultSizeMB + toSafeNumber(delta.vaultSizeMB)).toFixed(2))),
      };
    });
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(() => ({ usage, loading, refresh, applyUsageDelta }), [usage, loading, refresh, applyUsageDelta]);

  return <UsageContext.Provider value={value}>{children}</UsageContext.Provider>;
}

export function useUsage() {
  const context = useContext(UsageContext);

  if (!context) {
    throw new Error("useUsage must be used within UsageProvider");
  }

  return context;
}
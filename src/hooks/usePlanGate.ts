import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { type UserUsage } from "@/types";
import { getPlanLimits, isUnlimited } from "@/lib/plan";
import { useUsage, type UsageDelta } from "@/contexts/UsageContext";

interface PlanGateResult {
  usage: UserUsage | null;
  loading: boolean;
  canCreateNote: boolean;
  canCreateEntity: boolean;
  canCreateActivity: boolean;
  canUploadVault: (fileSizeMB: number) => boolean;
  refresh: () => Promise<void>;
  applyUsageDelta: (delta: UsageDelta) => void;
  getLimitMessage: (resource: "notes" | "entities" | "activities" | "vault") => string;
}

export function usePlanGate(): PlanGateResult {
  const { user } = useAuth();
  const { usage, loading, refresh, applyUsageDelta } = useUsage();
  const limits = getPlanLimits(user);

  const isUnlimited = (limit: number) => limit === -1;

  const canCreateNote = !usage ? true :
    isUnlimited(limits.maxNotes) || usage.notesCount < limits.maxNotes;

  const canCreateEntity = !usage ? true :
    isUnlimited(limits.maxEntities) || usage.entitiesCount < limits.maxEntities;

  const canCreateActivity = canCreateEntity;

  const canUploadVault = (fileSizeMB: number) => {
    if (!usage) return true;
    if (isUnlimited(limits.maxVaultSizeMB)) return true;
    return (usage.vaultSizeMB + fileSizeMB) <= limits.maxVaultSizeMB;
  };

  const getLimitMessage = (resource: "notes" | "entities" | "activities" | "vault") => {
    const map = {
      notes: { current: usage?.notesCount ?? 0, max: limits.maxNotes, label: "notas" },
      entities: { current: usage?.entitiesCount ?? 0, max: limits.maxEntities, label: "entidades" },
      activities: { current: usage?.entitiesCount ?? 0, max: limits.maxEntities, label: "atividades" },
      vault: { current: usage?.vaultSizeMB ?? 0, max: limits.maxVaultSizeMB, label: "MB de armazenamento" },
    };
    const r = map[resource];
    if (isUnlimited(r.max)) return "";
    return `${r.current}/${r.max} ${r.label} utilizados`;
  };

  return { usage, loading, canCreateNote, canCreateEntity, canCreateActivity, canUploadVault, refresh, applyUsageDelta, getLimitMessage };
}

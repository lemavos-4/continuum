import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { type UserUsage } from "@/types";
import { getPlanLimits, isUnlimited } from "@/lib/plan";
import { useUsage, type UsageDelta } from "@/contexts/UsageContext";
import { useLanguage } from "@/contexts/LanguageContext";

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

  const canCreateNote = !usage ? true :
    isUnlimited(limits.maxNotes) || usage.notesCount < limits.maxNotes;

  const canCreateEntity = !usage ? true :
    isUnlimited(limits.maxEntities) || usage.entitiesCount < limits.maxEntities;

  const canCreateActivity = canCreateEntity;

  const { t } = useLanguage();

  const canUploadVault = (fileSizeMB: number) => {
    if (!usage) return true;
    if (isUnlimited(limits.maxVaultSizeMB)) return true;
    return (usage.vaultSizeMB + fileSizeMB) <= limits.maxVaultSizeMB;
  };

  const getLimitMessage = (resource: "notes" | "entities" | "activities" | "vault") => {
    const map = {
      notes: { current: usage?.notesCount ?? 0, max: limits.maxNotes, label: t("notes") },
      entities: { current: usage?.entitiesCount ?? 0, max: limits.maxEntities, label: t("entities") },
      activities: { current: usage?.activitiesCount ?? 0, max: limits.maxEntities, label: t("activities") },
      vault: { current: usage?.vaultSizeMB ?? 0, max: limits.maxVaultSizeMB, label: t("vault") },
    };
    const r = map[resource];
    if (isUnlimited(r.max)) return "";
    return `${r.current}/${r.max} ${r.label} ${t("usage_used")}`;
  };

  return { usage, loading, canCreateNote, canCreateEntity, canCreateActivity, canUploadVault, refresh, applyUsageDelta, getLimitMessage };
}

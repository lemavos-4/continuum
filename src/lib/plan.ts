import type { Plan, PlanLimits, User } from "@/types";

export interface CurrentPlanLimits {
  maxEntities: number;
  maxNotes: number;
  historyDays: number;
  maxVaultSizeMB: number;
  maxMetadataSizeKb: number;
}

export function getPlanLimits(user: User | null): CurrentPlanLimits {
  return {
    maxEntities: user?.maxEntities ?? -1,
    maxNotes: user?.maxNotes ?? -1,
    historyDays: user?.historyDays ?? -1,
    maxVaultSizeMB: user?.maxVaultSizeMB ?? -1,
    maxMetadataSizeKb: user?.maxMetadataSizeKb ?? -1,
  };
}

export function isUnlimited(limit: number) {
  return limit === -1;
}

export function isPremiumPlan(user: User | null): boolean {
  return user?.plan !== "FREE";
}

export function getCurrentPlan(user: User | null): Plan {
  return (user?.plan as Plan) || "FREE";
}

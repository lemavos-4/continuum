import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { preferencesApi } from '@/lib/api';

const PREF_KEY = 'timerGoals';
const ALL_KEY = '__all__';
const DEFAULT_GOAL_MIN = 60;

type Prefs = Record<string, unknown>;
type Goals = Record<string, number>;

function safeParse(s: unknown): Prefs {
  if (s && typeof s === 'object') return s as Prefs;
  if (typeof s === 'string') {
    try {
      return JSON.parse(s) || {};
    } catch {
      return {};
    }
  }
  return {};
}

async function fetchPrefs(): Promise<Prefs> {
  try {
    const r = await preferencesApi.get();
    return safeParse(r.data);
  } catch {
    return {};
  }
}

/**
 * Hook reading/writing a daily-time goal (in minutes) per entity (or global)
 * persisted in the backend user preferences.
 */
export function useTimerGoal(entityId?: string) {
  const qc = useQueryClient();
  const key = entityId || ALL_KEY;

  const { data: prefs } = useQuery({
    queryKey: ['preferences'],
    queryFn: fetchPrefs,
    staleTime: 60_000,
  });

  const goals: Goals = (prefs?.[PREF_KEY] as Goals) || {};
  const goalMinutes = Number.isFinite(goals[key]) && goals[key] > 0 ? goals[key] : DEFAULT_GOAL_MIN;

  const saveMutation = useMutation({
    mutationFn: async (minutes: number) => {
      const current = await fetchPrefs();
      const currentGoals: Goals = (current[PREF_KEY] as Goals) || {};
      const next = {
        ...current,
        [PREF_KEY]: { ...currentGoals, [key]: minutes },
      };
      await preferencesApi.save(next);
      return next;
    },
    onSuccess: (next) => {
      qc.setQueryData(['preferences'], next);
    },
  });

  const setGoal = useCallback(
    (minutes: number) => {
      if (!Number.isFinite(minutes) || minutes <= 0) return;
      // Optimistic update
      const current = (qc.getQueryData(['preferences']) as Prefs) || {};
      const currentGoals: Goals = (current[PREF_KEY] as Goals) || {};
      qc.setQueryData(['preferences'], {
        ...current,
        [PREF_KEY]: { ...currentGoals, [key]: minutes },
      });
      saveMutation.mutate(minutes);
    },
    [qc, key, saveMutation]
  );

  return { goalMinutes, setGoal, isSaving: saveMutation.isPending };
}

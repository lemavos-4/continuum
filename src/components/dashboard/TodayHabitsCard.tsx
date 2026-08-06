import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { entitiesApi } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Check, Flame, Loader2 } from "@/lib/heroicons";

interface HabitEntity {
  id: string;
  title?: string;
  type?: string;
  trackingDates?: string[];
}

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const isTrackedToday = (trackingDates?: string[]) => {
  if (!trackingDates?.length) return false;
  const key = todayKey();
  return trackingDates.some((d) => d.split("T")[0] === key);
};

/** Activities not yet completed today, with one-tap completion. */
export function TodayHabitsCard() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [markingId, setMarkingId] = useState<string | null>(null);

  const { data: entities, isLoading: entitiesLoading } = useQuery({
    queryKey: ["entities", "activities"],
    queryFn: async () => {
      const res = await entitiesApi.list({ size: 1000 });
      const list = (res.data as HabitEntity[]) ?? [];
      return list.filter((e) => e.type === "ACTIVITY");
    },
  });

  const pending = useMemo(
    () => (entities ?? []).filter((e) => !isTrackedToday(e.trackingDates)),
    [entities],
  );

  const mark = useMutation({
    mutationFn: (id: string) => entitiesApi.track(id),
    onMutate: (id: string) => setMarkingId(id),
    onSuccess: async (_d, id) => {
      const habit = (entities ?? []).find((e) => e.id === id);
      toast({ title: t("db_habitsMarked"), description: habit?.title });
      await queryClient.invalidateQueries({ queryKey: ["entities", "activities"] });
    },
    onError: () => toast({ title: t("db_habitsMarkFailed"), variant: "destructive" }),
    onSettled: () => setMarkingId(null),
  });

  const loading = entitiesLoading;
  const total = entities?.length ?? 0;

  return (
    <Card variant="faint" className="lg:col-span-4 flex flex-col">
      <CardContent className="flex flex-1 flex-col p-4 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
              {t("db_habitsEyebrow")}
            </p>
            <h2 className="mt-1 truncate font-serif text-xl text-foreground">{t("db_habitsTitle")}</h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate("/activities")}
            className="h-auto bg-transparent p-0 font-mono text-[11px] uppercase normal-case tracking-widest text-muted-foreground hover:bg-transparent hover:text-foreground"
          >
            {t("db_viewAll")}
          </Button>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto pr-1 scrollbar-thin max-h-[280px] sm:max-h-[310px]">
          {loading ? (
            <div className="flex h-full items-center justify-center py-10">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : total === 0 ? (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              {t("db_habitsEmpty")}
            </div>
          ) : pending.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border p-6 text-center">
              <Check className="h-5 w-5 text-foreground/60" />
              <p className="text-xs text-muted-foreground">{t("db_habitsAllDone")}</p>
            </div>
          ) : (
            pending.map((habit) => (
              <div
                key={habit.id}
                className="group flex items-center gap-3 rounded-xl border border-transparent px-2.5 py-2 transition-colors hover:border-border hover:bg-accent/40"
              >
                <Flame className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <button
                  type="button"
                  onClick={() => navigate(`/entities/${habit.id}`)}
                  className="min-w-0 flex-1 truncate text-left text-xs font-medium text-foreground/80 hover:text-foreground sm:text-sm"
                >
                  {habit.title || t("db_untitled")}
                </button>
                <Button
                  type="button"
                  size="xs"
                  variant="quiet"
                  disabled={markingId === habit.id}
                  onClick={() => mark.mutate(habit.id)}
                  className="shrink-0 gap-1.5 normal-case"
                >
                  {markingId === habit.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )}
                  {t("db_habitsMarkDone")}
                </Button>
              </div>
            ))
          )}
        </div>

        {!loading && total > 0 && (
          <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {t("db_habitsRemaining", { n: pending.length })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

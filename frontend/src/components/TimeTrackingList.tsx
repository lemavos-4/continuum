import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { entitiesApi } from '@/lib/api';
import { useTimeTracking, type TimeEntitySummary } from '@/hooks/useTimeTracking';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Plus, ChevronDown, FolderOpen, Loader2, Check } from "@/lib/heroicons";
import { CreateEntityDialog } from '@/components/CreateEntityDialog';
import { ActivityCompletionCalendar } from '@/components/ActivityCompletionCalendar';
import type { Entity } from '@/types';

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const isTrackedToday = (trackingDates?: string[]) => {
  if (!trackingDates?.length) return false;
  const key = todayKey();
  return trackingDates.some((d) => d.split('T')[0] === key);
};

/**
 * Responsive list of trackable entities (projects / activities).
 * Card-based layout that works well on mobile and desktop, with a
 * one-tap "Complete today" action for activities.
 */
export function TimeTrackingList({
  filterType,
  search,
  hideInternalSearch,
  createOpen,
  onCreateOpenChange,
  onCreated,
}: {
  filterType?: string;
  search?: string;
  sortBy?: "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
  hideInternalSearch?: boolean;
  createOpen?: boolean;
  onCreateOpenChange?: (open: boolean) => void;
  onCreated?: (entity: Entity) => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [internalCreateOpen, setInternalCreateOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const createDialogOpen = onCreateOpenChange ? createOpen ?? false : internalCreateOpen;
  const setCreateDialogOpen = onCreateOpenChange ? onCreateOpenChange : setInternalCreateOpen;
  const { getAllSummaries } = useTimeTracking();

  const lower = hideInternalSearch ? (search ?? '').trim().toLowerCase() : query.trim().toLowerCase();

  const { data: trackableEntities, isLoading: entitiesLoading } = useQuery({
    queryKey: ['entities', 'trackable', filterType],
    queryFn: async () => {
      const response = await entitiesApi.list();
      const entities = response.data as Entity[];
      if (filterType) return entities.filter((e) => e.type === filterType);
      return entities.filter((e) => e.type === 'PROJECT' || e.type === 'ACTIVITY');
    },
  });

  const { data: summaries, isLoading: summariesLoading } = getAllSummaries();
  const getSummaryForEntity = (entityId: string): TimeEntitySummary | undefined =>
    summaries?.find((s: TimeEntitySummary) => s.entityId === entityId);

  const isLoading = entitiesLoading || summariesLoading;
  const typeLabels: Record<string, string> = { PROJECT: 'Project', ACTIVITY: 'Activity' };

  const all = useMemo(() => trackableEntities ?? [], [trackableEntities]);
  const visible = useMemo(() => {
    if (!lower) return all;
    return all.filter((e) =>
      [e.title, e.description, e.type].filter(Boolean).some((v) => String(v).toLowerCase().includes(lower)),
    );
  }, [lower, all]);

  const placeholder = `Search ${filterType === 'PROJECT' ? 'projects' : filterType === 'ACTIVITY' ? 'activities' : 'entities'}…`;

  const handleQuickComplete = async (entity: Entity) => {
    if (markingId) return;
    setMarkingId(entity.id);
    try {
      await entitiesApi.track(entity.id);
      await queryClient.invalidateQueries({ queryKey: ['entities'] });
      toast({ title: 'Marked as done', description: entity.title || 'Activity' });
    } catch {
      toast({ title: 'Could not mark complete', variant: 'destructive' });
    } finally {
      setMarkingId(null);
    }
  };

  return (
    <>
      {!hideInternalSearch && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full max-w-sm bg-transparent border-0 border-b border-white/15 focus:border-white pb-2 text-sm outline-none transition-colors placeholder:text-white/30"
          />
          <button onClick={() => setCreateDialogOpen(true)} className="btn-primary shrink-0">
            <Plus className="w-4 h-4" /> New {filterType ? typeLabels[filterType] : 'Entity'}
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="w-5 h-5 animate-spin text-white/30" />
        </div>
      ) : visible.length === 0 ? (
        <div className="border border-dashed border-white/10 rounded-md py-16 text-center">
          <FolderOpen className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="text-sm text-white/40">
            No {filterType ? typeLabels[filterType].toLowerCase() + 's' : 'entities'} yet.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((entity) => {
            const summary = getSummaryForEntity(entity.id);
            const isOpen = openId === entity.id;
            const isProject = entity.type === 'PROJECT';
            const doneToday = isTrackedToday(entity.trackingDates);
            const marking = markingId === entity.id;

            return (
              <li
                key={entity.id}
                className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] transition-colors hover:border-white/20"
              >
                {/* Row header */}
                <div className="flex items-center gap-3 p-3 sm:p-4">
                  <button
                    onClick={() => setOpenId(isOpen ? null : entity.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    aria-expanded={isOpen}
                  >
                    <ChevronDown className={cn('w-4 h-4 shrink-0 text-white/40 transition-transform', isOpen && 'rotate-180')} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{entity.title || 'Untitled'}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-white/40">
                        <span className="uppercase tracking-wider">{typeLabels[entity.type] ?? entity.type}</span>
                        {isProject ? (
                          <span className="font-mono">{summary?.formattedTotal || '00:00:00'}</span>
                        ) : (
                          <span>{entity.trackingDates?.length ?? 0} done</span>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Quick action: complete today for activities */}
                  {!isProject && (
                    <button
                      onClick={() => !doneToday && handleQuickComplete(entity)}
                      disabled={doneToday || marking}
                      className={cn(
                        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                        doneToday
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                          : 'border-white/15 text-white/80 hover:border-white/40 hover:bg-white/[0.06]',
                      )}
                    >
                      {marking ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      <span>{doneToday ? 'Done today' : 'Complete'}</span>
                    </button>
                  )}
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="border-t border-white/[0.06] bg-black/30 p-4 sm:p-6">
                    <div className="grid gap-4">
                      {isProject ? (
                        <div className="grid grid-cols-2 gap-3 max-w-md">
                          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                            <p className="label-caps text-white/50">Total time</p>
                            <p className="mt-2 font-mono text-white/90">{summary?.formattedTotal || '00:00:00'}</p>
                          </div>
                          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                            <p className="label-caps text-white/50">Sessions</p>
                            <p className="mt-2 text-white/90">{summary?.entriesCount ?? 0}</p>
                          </div>
                        </div>
                      ) : (
                        <ActivityCompletionCalendar
                          entityId={entity.id}
                          trackingDates={entity.trackingDates}
                          onMarkComplete={() => queryClient.invalidateQueries({ queryKey: ['entities'] })}
                          onOpenDetail={() => navigate(`/entities/${entity.id}`)}
                        />
                      )}
                      {entity.type !== 'ACTIVITY' && (
                        <div>
                          <button
                            onClick={() => navigate(`/entities/${entity.id}`)}
                            className="text-xs px-3 py-1.5 rounded-md border border-white/10 text-white/70 hover:text-white hover:border-white/30 transition-colors"
                          >
                            Open detail →
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <CreateEntityDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        defaultType={filterType || 'PROJECT'}
        lockType={!!filterType}
        onCreated={(entity) => {
          queryClient.invalidateQueries({ queryKey: ['entities'] });
          onCreated?.(entity);
          navigate(`/entities/${entity.id}`);
        }}
      />
    </>
  );
}
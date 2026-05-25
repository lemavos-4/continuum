import { Fragment, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { entitiesApi } from '@/lib/api';
import { useTimeTracking, type TimeEntitySummary } from '@/hooks/useTimeTracking';
import { cn } from '@/lib/utils';
import { Plus, ChevronDown, FolderOpen, Loader2 } from "@/lib/heroicons";
import { CreateEntityDialog } from '@/components/CreateEntityDialog';
import { ActivityCompletionCalendar } from '@/components/ActivityCompletionCalendar';
import type { Entity } from '@/types';

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

/**
 * Premium striped table with inline accordion rows. Mirrors the
 * `/entities` aesthetic: serif header, hairline borders, monochrome.
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
  const [internalCreateOpen, setInternalCreateOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
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

  const filtered = useMemo(() => trackableEntities ?? [], [trackableEntities]);
  const matches = useMemo(() => {
    if (!lower) return new Set<number>();
    const s = new Set<number>();
    filtered.forEach((e, i) => {
      if ([e.title, e.description, e.type].filter(Boolean).some((v) => String(v).toLowerCase().includes(lower))) {
        s.add(i);
      }
    });
    return s;
  }, [lower, filtered]);

  const placeholder = `Search ${filterType === 'PROJECT' ? 'projects' : filterType === 'ACTIVITY' ? 'activities' : 'entities'}…`;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        {!hideInternalSearch && (
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full max-w-sm bg-transparent border-0 border-b border-white/15 focus:border-white pb-2 text-sm outline-none transition-colors placeholder:text-white/30"
          />
        )}
        {!hideInternalSearch && (
          <button onClick={() => setCreateDialogOpen(true)} className="btn-primary shrink-0">
            <Plus className="w-4 h-4" /> New {filterType ? typeLabels[filterType] : 'Entity'}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="w-5 h-5 animate-spin text-white/30" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-white/10 rounded-md py-16 text-center">
          <FolderOpen className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="text-sm text-white/40">
            No {filterType ? typeLabels[filterType].toLowerCase() + 's' : 'entities'} yet.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-white/10 bg-black/95 shadow-black/20 shadow-sm">
          <table className="min-w-full border-separate border-spacing-y-2">
            <thead>
              <tr className="bg-white/5">
                <th className="label-caps text-left px-3 py-3 font-medium text-white/50 w-10"></th>
                <th className="label-caps text-left px-3 py-3 font-medium text-white/50">Name</th>
                <th className="label-caps text-left px-3 py-3 font-medium text-white/50 w-[140px]">Type</th>
                <th className="label-caps text-left px-3 py-3 font-medium text-white/50 w-[160px]">Tracked</th>
                <th className="label-caps text-left px-3 py-3 font-medium text-white/50 w-[120px]">Entries</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {filtered.map((entity, i) => {
                const dim = lower && !matches.has(i);
                const summary = getSummaryForEntity(entity.id);
                const isOpen = openId === entity.id;
                const showTimer = entity.type === 'PROJECT';

                return (
                  <Fragment key={entity.id}>
                    <tr
                      onClick={() => setOpenId(isOpen ? null : entity.id)}
                      className={cn(
                        'group cursor-pointer transition-colors',
                        dim ? 'opacity-20' : 'opacity-100 hover:bg-white/[0.08]',
                      )}
                    >
                      <td className="px-3 py-4 text-white/40">
                        <ChevronDown className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />
                      </td>
                      <td className="px-3 py-4">
                        <p className="font-medium text-white truncate">{entity.title || 'Untitled'}</p>
                        {entity.description && (
                          <p className="mt-0.5 text-xs text-white/40 truncate">{entity.description}</p>
                        )}
                      </td>
                      <td className="px-3 py-4 text-xs uppercase tracking-wider text-white/60">
                        {typeLabels[entity.type] ?? entity.type}
                      </td>
                      <td className="px-3 py-4 text-sm font-mono text-white/80">
                        {summary?.formattedTotal || '00:00:00'}
                      </td>
                      <td className="px-3 py-4 text-sm text-white/60">{summary?.entriesCount ?? 0}</td>
                    </tr>
                    {isOpen && (
                      <tr key={entity.id + '-detail'} className="border-b border-white/[0.06] bg-black/40">
                        <td colSpan={5} className="px-6 py-6">
                          <div className="grid gap-4">
                            {showTimer ? (
                              <div className="grid grid-cols-2 gap-4 max-w-md">
                                <div className="rounded-md border border-white/10 bg-white/5 p-4">
                                  <p className="label-caps text-white/50">Total time</p>
                                  <p className="mt-2 font-mono text-white/90">
                                    {summary?.formattedTotal || '00:00:00'}
                                  </p>
                                </div>
                                <div className="rounded-md border border-white/10 bg-white/5 p-4">
                                  <p className="label-caps text-white/50">Sessions</p>
                                  <p className="mt-2 text-white/90">{summary?.entriesCount ?? 0}</p>
                                </div>
                              </div>
                            ) : (
                              <ActivityCompletionCalendar
                                entityId={entity.id}
                                trackingDates={entity.trackingDates}
                              />
                            )}
                            <div className="flex gap-2 pt-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/entities/${entity.id}`);
                                }}
                                className="text-xs px-3 py-1.5 rounded-md border border-white/10 text-white/70 hover:text-white hover:border-white/30 transition-colors"
                              >
                                Open detail →
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
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

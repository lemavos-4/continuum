import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { entitiesApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Flame, Edit, StickyNote, Network, Calendar, Tag, Clock } from "@/lib/heroicons";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { InsightSignalBadge } from "@/components/InsightSignal";

import { useToast } from "@/hooks/use-toast";
import { ActivityAnalyticsCalendar } from "@/components/ActivityAnalyticsCalendar";
import { TimerWidget } from "@/components/TimerWidget";
import type { HeatmapData, EntityStats } from "@/types";
import { useTimeTracking } from "@/hooks/useTimeTracking";

interface EntityData { id: string; title: string; type: string; description?: string; trackingDates?: string[]; createdAt: string; }

interface RelatedNote { id: string; title: string; createdAt: string; updatedAt: string; }

export default function EntityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [entity, setEntity] = useState<EntityData | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapData>({});
  const [stats, setStats] = useState<EntityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState(false);
  const [newDescription, setNewDescription] = useState("");
  const [relatedNotes, setRelatedNotes] = useState<RelatedNote[]>([]);
  const [relatedEntities, setRelatedEntities] = useState<EntityData[]>([]);

  // Time tracking
  const { getTotalTime, formatSeconds } = useTimeTracking();
  const { data: timeSummary } = getTotalTime(id!);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const loadEntity = async () => {
      setLoading(true);

      try {
        const { data } = await entitiesApi.get(id);

        if (cancelled) {
          return;
        }

        setEntity(data);

        if (data?.type === "ACTIVITY") {
          const [hRes, sRes] = await Promise.all([entitiesApi.heatmap(id), entitiesApi.stats(id)]);

          if (cancelled) {
            return;
          }

          // Try API heatmap first, fallback to trackingDates
          const apiHeatmap = normalizeHeatmapData(hRes.data);
          const trackingHeatmap = buildHeatmapFromTrackingDates(data.trackingDates || []);
          const finalHeatmap = Object.keys(apiHeatmap).length > 0 ? apiHeatmap : trackingHeatmap;
          
          setHeatmap(finalHeatmap);
          setStats({
            ...sRes.data,
            totalCompletions: Array.isArray(data.trackingDates) ? data.trackingDates.length : sRes.data?.totalCompletions,
          });
        } else {
          setHeatmap({});
          setStats(null);
        }

        // Load related notes and connections
        const [notesRes, connectionsRes] = await Promise.all([
          entitiesApi.getNotes(id),
          entitiesApi.getConnections(id),
        ]);

        if (cancelled) {
          return;
        }

        setRelatedNotes(Array.isArray(notesRes.data) ? notesRes.data : []);
        setRelatedEntities(
          (Array.isArray(connectionsRes.data) ? connectionsRes.data : []).filter(
            (item: EntityData) => item.id !== id
          )
        );
      } catch {
        if (!cancelled) {
          toast({ title: "Entity not found", variant: "destructive" });
          navigate("/entities");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadEntity();

    return () => {
      cancelled = true;
    };
  }, [id, navigate, toast]);

  const normalizeHeatmapData = (payload: unknown): HeatmapData => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return {};
    return Object.entries(payload).reduce<HeatmapData>((normalized, [key, value]) => {
      // Handle both "2026-04-12" and "2026-04-12T00:00:00.000Z" formats
      const dateKey = key.includes("T") ? key.split("T")[0] : key;
      const count = typeof value === "number" ? value : parseInt(String(value), 10);
      if (!Number.isNaN(count) && count >= 0) {
        normalized[dateKey] = (normalized[dateKey] || 0) + count;
      }
      return normalized;
    }, {});
  };

  const buildHeatmapFromTrackingDates = (dates: unknown[]): HeatmapData => {
    if (!Array.isArray(dates)) return {};
    
    const heatmap: HeatmapData = {};
    dates.forEach((date) => {
      try {
        // Handle both Date objects and ISO strings
        const dateObj = typeof date === "string" ? new Date(date) : date instanceof Date ? date : new Date(String(date));
        const dateKey = dateObj.toISOString().split("T")[0];
        heatmap[dateKey] = (heatmap[dateKey] || 0) + 1;
      } catch {
        // Skip invalid dates
      }
    });
    return heatmap;
  };

  const handleTrack = async () => {
    if (!id) return;
    const today = new Date().toISOString().split("T")[0];

    try {
      // Optimistically update tracking dates and heatmap
      setEntity((prev) => {
        if (!prev) return prev;
        const normalizedDates = Array.from(
          new Set([...(prev.trackingDates || []).map((date) => date.split("T")[0]), today])
        );
        return {
          ...prev,
          trackingDates: normalizedDates,
        };
      });

      setHeatmap((prev) => ({
        ...prev,
        [today]: (prev[today] || 0) + 1,
      }));

      await entitiesApi.track(id);

      const [eRes, sRes, hRes] = await Promise.all([
        entitiesApi.get(id),
        entitiesApi.stats(id),
        entitiesApi.heatmap(id),
      ]);

      const freshData = eRes.data;
      const freshHeatmap = normalizeHeatmapData(hRes.data);
      if (!freshHeatmap[today]) {
        freshHeatmap[today] = 1;
      }

      setEntity(freshData);
      setStats(sRes.data);
      setHeatmap(freshHeatmap);
      toast({ title: "Registered! 🔥" });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleSaveTitle = async () => {
    if (!id || !newTitle.trim()) return;
    try {
      const { data } = await entitiesApi.update(id, { title: newTitle.trim() });
      setEntity(data);
      setEditingTitle(false);
      toast({ title: "Name updated!" });
    } catch { toast({ title: "Error updating", variant: "destructive" }); }
  };

  const handleSaveDescription = async () => {
    if (!id) return;
    try {
      const { data } = await entitiesApi.update(id, { description: newDescription.trim() });
      setEntity(data);
      setEditingDescription(false);
      toast({ title: "Description updated!" });
    } catch { toast({ title: "Error updating description", variant: "destructive" }); }
  };

  if (loading) return <AppLayout><div className="flex justify-center items-center h-full"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div></AppLayout>;
  if (!entity) return null;

  const isHabit = entity.type === "ACTIVITY";
  const today = new Date().toISOString().split("T")[0];
  const trackedToday = entity.trackingDates?.some((date) => date.startsWith(today));
  const streak = stats?.currentStreak ?? 0;
  const longestStreak = stats?.longestStreak ?? 0;
  const totalCompletions = entity.trackingDates?.length ?? stats?.totalCompletions ?? 0;

  const typeLabel = entity.type.charAt(0) + entity.type.slice(1).toLowerCase();

  return (
    <AppLayout>
      <div className="px-6 lg:px-12 py-10 max-w-4xl mx-auto">
        <button
          onClick={() => navigate("/entities")}
          className="mb-6 inline-flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to entities
        </button>

        {/* Premium serif header — matches /entities */}
        <header className="border-b border-white/10 pb-8 mb-8">
          <div className="flex items-center gap-2 mb-2">
            <p className="label-caps">{typeLabel}</p>
            <InsightSignalBadge kind="entity" id={entity.id} />
          </div>

          {editingTitle ? (
            <div className="flex gap-2 max-w-xl">
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="New name..." className="flex-1" />
              <Button size="sm" onClick={handleSaveTitle}>Save</Button>
              <Button size="sm" variant="outline" onClick={() => { setEditingTitle(false); setNewTitle(entity?.title || ""); }}>Cancel</Button>
            </div>
          ) : (
            <div className="flex items-center gap-3 group">
              <h1 className="font-serif text-5xl tracking-tight">{entity.title}</h1>
              <button
                onClick={() => { setEditingTitle(true); setNewTitle(entity?.title || ""); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-white/10"
                aria-label="Edit name"
              >
                <Edit className="w-4 h-4 text-white/50" />
              </button>
            </div>
          )}

          {editingDescription ? (
            <div className="mt-4 flex flex-col gap-2 max-w-xl">
              <Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Add description..." className="text-sm" rows={3} />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveDescription}>Save</Button>
                <Button size="sm" variant="outline" onClick={() => { setEditingDescription(false); setNewDescription(entity?.description || ""); }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex items-start gap-2 group">
              <p className="text-sm text-white/50 flex-1">
                {entity.description || <span className="italic text-white/30">No description</span>}
              </p>
              <button
                onClick={() => { setEditingDescription(true); setNewDescription(entity?.description || ""); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-white/10"
                aria-label="Edit description"
              >
                <Edit className="w-3.5 h-3.5 text-white/50" />
              </button>
            </div>
          )}

          {isHabit && (
            <div className="mt-5 flex flex-wrap gap-2 text-xs uppercase tracking-wider">
              <span className="px-3 py-1 rounded-md border border-white/10 text-white/60 inline-flex items-center gap-1.5">
                <Flame className="w-3 h-3" /> Streak {streak}d
              </span>
              <span className="px-3 py-1 rounded-md border border-white/10 text-white/60">Max {longestStreak}</span>
              <span className="px-3 py-1 rounded-md border border-white/10 text-white/60">Total {totalCompletions}</span>
            </div>
          )}
        </header>

        {/* Type-specific primary block */}
        {entity?.type === "PROJECT" && (
          <div className="mb-8 space-y-4">
            <TimerWidget
              entityId={id!}
              entityName={entity.title}
              onTimerStart={() => toast({ title: "Timer started" })}
              onTimerStop={(duration) => toast({ title: `Stopped — ${formatSeconds(duration)} recorded` })}
            />
          </div>
        )}

        {entity?.type === "ACTIVITY" && (
          <div className="mb-8">
            <ActivityAnalyticsCalendar trackingDates={entity.trackingDates} />
          </div>
        )}

        {/* Accordion sections */}
        <Accordion
          type="multiple"
          defaultValue={["metadata", "notes", "entities"]}
          className="border-t border-white/10"
        >
          <AccordionItem value="metadata" className="border-b border-white/10">
            <AccordionTrigger className="label-caps text-white/60 hover:text-white hover:no-underline py-4">
              Metadata
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-4">
                <div className="rounded-md border border-white/10 bg-white/[0.02] p-3">
                  <div className="label-caps text-white/40 mb-1.5 inline-flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" /> Created
                  </div>
                  <div className="text-sm text-white">{new Date(entity.createdAt).toLocaleDateString("en-US")}</div>
                </div>
                <div className="rounded-md border border-white/10 bg-white/[0.02] p-3">
                  <div className="label-caps text-white/40 mb-1.5 inline-flex items-center gap-1.5">
                    <Network className="h-3 w-3" /> Connections
                  </div>
                  <div className="text-sm text-white">{relatedEntities.length}</div>
                </div>
                <div className="rounded-md border border-white/10 bg-white/[0.02] p-3">
                  <div className="label-caps text-white/40 mb-1.5 inline-flex items-center gap-1.5">
                    <Tag className="h-3 w-3" /> Type
                  </div>
                  <div className="text-sm text-white">{typeLabel}</div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {entity?.type === "PROJECT" && timeSummary && (
            <AccordionItem value="time" className="border-b border-white/10">
              <AccordionTrigger className="label-caps text-white/60 hover:text-white hover:no-underline py-4">
                <span className="inline-flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Time tracking summary</span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-2 gap-3 pb-4 max-w-md">
                  <div className="rounded-md border border-white/10 bg-white/[0.02] p-3">
                    <p className="label-caps text-white/40">Total time</p>
                    <p className="mt-1.5 font-mono text-white">{timeSummary.formattedTotal}</p>
                  </div>
                  <div className="rounded-md border border-white/10 bg-white/[0.02] p-3">
                    <p className="label-caps text-white/40">Sessions</p>
                    <p className="mt-1.5 text-white">{timeSummary.entriesCount}</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          <AccordionItem value="notes" className="border-b border-white/10">
            <AccordionTrigger className="label-caps text-white/60 hover:text-white hover:no-underline py-4">
              Connected notes <span className="ml-2 text-white/30 normal-case tracking-normal">({relatedNotes.length})</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-1 pb-4">
                {relatedNotes.length > 0 ? (
                  relatedNotes.map((note) => (
                    <button
                      key={note.id}
                      onClick={() => navigate(`/notes/${note.id}`)}
                      className="flex w-full items-start gap-2 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-white/5"
                    >
                      <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/40" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-white">{note.title}</p>
                        <p className="text-xs text-white/40">
                          Updated {new Date(note.updatedAt).toLocaleDateString("en-US")}
                        </p>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-white/40 px-3 py-2">No connected notes yet.</p>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="entities" className="border-b border-white/10">
            <AccordionTrigger className="label-caps text-white/60 hover:text-white hover:no-underline py-4">
              Connected entities <span className="ml-2 text-white/30 normal-case tracking-normal">({relatedEntities.length})</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-1 pb-4">
                {relatedEntities.length > 0 ? (
                  relatedEntities.map((ent) => (
                    <button
                      key={ent.id}
                      onClick={() => navigate(`/entities/${ent.id}`)}
                      className="flex w-full items-start gap-2 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-white/5"
                    >
                      <Network className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/40" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-white">{ent.title}</p>
                        <p className="text-xs text-white/40 uppercase tracking-wider">{ent.type}</p>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-white/40 px-3 py-2">No connected entities yet.</p>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </AppLayout>
  );
}

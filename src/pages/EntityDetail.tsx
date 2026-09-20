import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { entitiesApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Loader2, Edit, StickyNote, Network, Calendar, Tag, Clock } from "@/lib/heroicons";
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
import { TimeHeatmap } from "@/components/TimeHeatmap";
import type { HeatmapData, EntityStats } from "@/types";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { queryClient } from "@/lib/query-client";
import { qk, STALE } from "@/lib/queries";


interface EntityData { id: string; title: string; type: string; description?: string; trackingDates?: string[]; createdAt: string; }

interface RelatedNote { id: string; title: string; createdAt: string; updatedAt: string; }

export default function EntityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [entity, setEntity] = useState<EntityData | null>(() => id ? queryClient.getQueryData<EntityData>(qk.entity(id)) ?? null : null);
  const [heatmap, setHeatmap] = useState<HeatmapData>({});
  const [stats, setStats] = useState<EntityStats | null>(null);
  const [loading, setLoading] = useState(() => !id || !queryClient.getQueryData(qk.entity(id)));
  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState(false);
  const [newDescription, setNewDescription] = useState("");
  const [editingType, setEditingType] = useState(false);
  const [newType, setNewType] = useState("");
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
        const data = await queryClient.fetchQuery({
          queryKey: qk.entity(id),
          queryFn: () => entitiesApi.get(id).then((response) => response.data as EntityData),
          staleTime: STALE.detail,
        });

        if (cancelled) {
          return;
        }

        setEntity(data);

        if (data?.type === "ACTIVITY") {
          const [heatmapData, statsData] = await Promise.all([
            queryClient.fetchQuery({ queryKey: qk.entityHeatmap(id), queryFn: () => entitiesApi.heatmap(id).then((response) => response.data), staleTime: STALE.detail }),
            queryClient.fetchQuery({ queryKey: qk.entityStats(id), queryFn: () => entitiesApi.stats(id).then((response) => response.data as EntityStats), staleTime: STALE.detail }),
          ]);

          if (cancelled) {
            return;
          }

          // Try API heatmap first, fallback to trackingDates
          const apiHeatmap = normalizeHeatmapData(heatmapData);
          const trackingHeatmap = buildHeatmapFromTrackingDates(data.trackingDates || []);
          const finalHeatmap = Object.keys(apiHeatmap).length > 0 ? apiHeatmap : trackingHeatmap;
          
          setHeatmap(finalHeatmap);
          setStats({
            ...statsData,
            totalCompletions: Array.isArray(data.trackingDates) ? data.trackingDates.length : statsData?.totalCompletions,
          });
        } else {
          setHeatmap({});
          setStats(null);
        }

        // Load related notes and connections
        const [notesData, connectionsData] = await Promise.all([
          queryClient.fetchQuery({ queryKey: qk.entityNotes(id), queryFn: () => entitiesApi.getNotes(id).then((response) => response.data), staleTime: STALE.detail }),
          queryClient.fetchQuery({ queryKey: qk.entityConnections(id), queryFn: () => entitiesApi.getConnections(id).then((response) => response.data), staleTime: STALE.detail }),
        ]);

        if (cancelled) {
          return;
        }

        setRelatedNotes(Array.isArray(notesData) ? notesData : []);
        setRelatedEntities(
          (Array.isArray(connectionsData) ? connectionsData : []).filter(
            (item: EntityData) => item.id !== id
          )
        );
      } catch {
        if (!cancelled) {
          toast({ title: t("ent_not_found"), variant: "destructive" });
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
      toast({ title: t("ent_registered") });
    } catch {
      toast({ title: t("ent_error"), variant: "destructive" });
    }
  };

  const handleSaveTitle = async () => {
    if (!id || !newTitle.trim()) return;
    try {
      const { data } = await entitiesApi.update(id, { title: newTitle.trim() });
      setEntity(data);
      queryClient.setQueryData(qk.entity(id), data);
      void queryClient.invalidateQueries({ queryKey: ["entities", "list"] });
      setEditingTitle(false);
      toast({ title: t("ent_name_updated") });
    } catch { toast({ title: t("ent_error_updating"), variant: "destructive" }); }
  };

  const handleSaveDescription = async () => {
    if (!id) return;
    try {
      const { data } = await entitiesApi.update(id, { description: newDescription.trim() });
      setEntity(data);
      queryClient.setQueryData(qk.entity(id), data);
      void queryClient.invalidateQueries({ queryKey: ["entities", "list"] });
      setEditingDescription(false);
      toast({ title: t("ent_description_updated") });
    } catch { toast({ title: t("ent_error_updating_description"), variant: "destructive" }); }
  };

  const handleSaveType = async () => {
    if (!id || !newType) return;
    try {
      const { data } = await entitiesApi.update(id, { type: newType });
      setEntity(data);
      queryClient.setQueryData(qk.entity(id), data);
      void queryClient.invalidateQueries({ queryKey: ["entities", "list"] });
      setEditingType(false);
      toast({ title: t("ent_type_updated") ?? "Entity type updated" });
    } catch { toast({ title: t("ent_error_updating"), variant: "destructive" }); }
  };

  if (loading)
    return (
      <AppLayout>
        <div className="mx-auto w-full max-w-5xl animate-fade-in px-4 py-8 sm:px-6">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-4 h-10 w-2/3 max-w-sm" />
          <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Skeleton className="h-44 w-full" />
            <Skeleton className="h-44 w-full" />
          </div>
          <Skeleton className="mt-4 h-56 w-full" />
        </div>
      </AppLayout>
    );
  if (!entity) return null;

  const isHabit = entity.type === "ACTIVITY";
  const today = new Date().toISOString().split("T")[0];
  const trackedToday = entity.trackingDates?.some((date) => date.startsWith(today));
  const totalCompletions = entity.trackingDates?.length ?? stats?.totalCompletions ?? 0;


  const typeLabelKey = `ent_type_${entity.type.toLowerCase()}`;
  const typeLabel = t(typeLabelKey) === typeLabelKey ? entity.type.charAt(0) + entity.type.slice(1).toLowerCase() : t(typeLabelKey);
  const entityTypeOptions = [
    { value: "TOPIC", label: t("ent_type_topic") },
    { value: "PERSON", label: t("ent_type_person") },
    { value: "ORGANIZATION", label: t("ent_type_organization") },
    { value: "PROJECT", label: t("ent_type_project") },
    { value: "ACTIVITY", label: t("ent_type_activity") },
  ];

  return (
    <AppLayout>
      <div className="px-6 lg:px-12 py-10 max-w-4xl mx-auto">
        <Button
          variant="quiet"
          size="sm"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/entities"))}
          className="mb-6 px-0 h-auto"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> {t("ent_back")}
        </Button>

        {/* Premium serif header — matches /entities */}
        <header className="border-b border-border/10 pb-8 mb-8">
          <div className="flex items-center gap-2 mb-2">
            <p className="label-caps">{typeLabel}</p>
            <InsightSignalBadge kind="entity" id={entity.id} />
          </div>

          {editingTitle ? (
            <div className="flex gap-2 max-w-xl">
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder={t("ent_new_name_placeholder")} className="flex-1" />
              <Button size="sm" onClick={handleSaveTitle}>{t("ent_save")}</Button>
              <Button size="sm" variant="outline" onClick={() => { setEditingTitle(false); setNewTitle(entity?.title || ""); }}>{t("ent_cancel")}</Button>
            </div>
          ) : (
            <div className="flex items-center gap-3 group">
              <h1 className="font-serif text-5xl tracking-tight">{entity.title}</h1>
              <Button
                variant="ghost"
                size="iconSm"
                onClick={() => { setEditingTitle(true); setNewTitle(entity?.title || ""); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={t("ent_edit_name")}
              >
                <Edit className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
          )}

          {editingDescription ? (
            <div className="mt-4 flex flex-col gap-2 max-w-xl">
              <Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder={t("ent_add_description_placeholder")} className="text-sm" rows={3} />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveDescription}>{t("ent_save")}</Button>
                <Button size="sm" variant="outline" onClick={() => { setEditingDescription(false); setNewDescription(entity?.description || ""); }}>{t("ent_cancel")}</Button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex items-start gap-2 group">
              <p className="text-sm text-muted-foreground flex-1">
                {entity.description || <span className="italic text-muted-foreground/60">{t("ent_no_description")}</span>}
              </p>
              <Button
                variant="ghost"
                size="iconSm"
                onClick={() => { setEditingDescription(true); setNewDescription(entity?.description || ""); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={t("ent_edit_description")}
              >
                <Edit className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </div>
          )}

          {isHabit && (
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge variant="meta">{t("ent_total", { count: totalCompletions })}</Badge>
            </div>
          )}

        </header>

        {/* Type-specific primary block */}
        {entity?.type === "PROJECT" && (
          <div className="mb-8 space-y-4">
            <TimerWidget
              entityId={id!}
              entityName={entity.title}
              onTimerStart={() => toast({ title: t("ent_timer_started") })}
              onTimerStop={(duration) => toast({ title: t("ent_timer_stopped", { duration: formatSeconds(duration) }) })}
            />
            <TimeHeatmap entityId={id!} />
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
          defaultValue={["metadata"]}
          className="border-t border-border/10"
        >
          <AccordionItem value="metadata" className="border-b border-border/10">
            <AccordionTrigger className="label-caps text-muted-foreground hover:text-foreground hover:no-underline py-4">
              {t("ent_metadata")}
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-4">
                <Card variant="faint" className="p-3">
                  <div className="label-caps text-muted-foreground mb-1.5 inline-flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" /> {t("ent_created")}
                  </div>
                  <div className="text-sm text-foreground">{new Date(entity.createdAt).toLocaleDateString("en-US")}</div>
                </Card>
                <Card variant="faint" className="p-3">
                  <div className="label-caps text-muted-foreground mb-1.5 inline-flex items-center gap-1.5">
                    <Network className="h-3 w-3" /> {t("ent_connections")}
                  </div>
                  <div className="text-sm text-foreground">{relatedEntities.length}</div>
                </Card>
                <Card variant="faint" className="p-3">
                  <div className="label-caps text-muted-foreground mb-1.5 inline-flex items-center gap-1.5">
                    <Tag className="h-3 w-3" /> {t("ent_type")}
                  </div>
                  {editingType ? (
                    <div className="flex flex-col gap-2">
                      <select
                        value={newType}
                        onChange={(e) => setNewType(e.target.value)}
                        className="h-9 rounded-md border border-border/10 bg-background px-2 text-sm text-foreground"
                      >
                        {entityTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveType}>{t("ent_save")}</Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingType(false);
                            setNewType(entity.type);
                          }}
                        >
                          {t("ent_cancel")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm text-foreground">{typeLabel}</div>
                      <Button
                        variant="ghost"
                        size="iconSm"
                        onClick={() => {
                          setEditingType(true);
                          setNewType(entity.type);
                        }}
                        aria-label={t("ent_edit_type") ?? "Edit type"}
                      >
                        <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  )}
                </Card>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="notes" className="border-b border-border/10">
            <AccordionTrigger className="label-caps text-muted-foreground hover:text-foreground hover:no-underline py-4">
              <span className="flex w-full items-center justify-between gap-3">
                <span>{t("ent_connected_notes")}</span>
                <span className="text-muted-foreground/60 normal-case tracking-normal">({relatedNotes.length})</span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-1 pb-4">
                {relatedNotes.length > 0 ? (
                  relatedNotes.map((note) => (
                    <Button
                      key={note.id}
                      variant="ghost"
                      onClick={() => navigate(`/notes/${note.id}`)}
                      className="flex h-auto w-full items-start justify-start gap-2 rounded-md px-3 py-2.5 text-left normal-case tracking-normal font-normal"
                    >
                      <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-foreground">{note.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {t("ent_updated", { date: new Date(note.updatedAt).toLocaleDateString("en-US") })}
                        </p>
                      </div>
                    </Button>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground px-3 py-2">{t("ent_no_connected_notes")}</p>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="entities" className="border-b border-border/10">
            <AccordionTrigger className="label-caps text-muted-foreground hover:text-foreground hover:no-underline py-4">
              <span className="flex w-full items-center justify-between gap-3">
                <span>{t("ent_connected_entities")}</span>
                <span className="text-muted-foreground/60 normal-case tracking-normal">({relatedEntities.length})</span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-1 pb-4">
                {relatedEntities.length > 0 ? (
                  relatedEntities.map((ent) => (
                    <Button
                      key={ent.id}
                      variant="ghost"
                      onClick={() => navigate(`/entities/${ent.id}`)}
                      className="flex h-auto w-full items-start justify-start gap-2 rounded-md px-3 py-2.5 text-left normal-case tracking-normal font-normal"
                    >
                      <Network className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-foreground">{ent.title}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">{ent.type}</p>
                      </div>
                    </Button>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground px-3 py-2">{t("ent_no_connected_entities")}</p>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </AppLayout>
  );
}

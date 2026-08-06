import { memo, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { ArrowUpRight, Calendar, Link2, Network, StickyNote, X, Tag } from "@/lib/heroicons";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEntityStore, type InspectableEntity, type InspectableNote } from "@/contexts/EntityContext";
import { entitiesApi, notesApi } from "@/lib/api";
import { tiptapContentToPlainText } from "@/lib/tiptap-content";
import type { Entity, EntityStats, Note } from "@/types";
import { useLanguage } from "@/contexts/LanguageContext";

function getEntityTypeConfig(t: (key: string) => string, type: string): { label: string } {
  const key = `ent_type_${type.toLowerCase()}`;
  const translated = t(key);
  return { label: translated === key ? type : translated };
}

interface RelatedNote {
  id: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
}

interface SideInspectorProps {
  isOpen: boolean;
  entity: InspectableEntity | null;
  onClose: () => void;
}

const truncateText = (value: string, maxLength = 220) =>
  value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;

const formatDate = (value?: string) => (value ? new Date(value).toLocaleDateString("en-US") : "—");

export const SideInspector = memo(function SideInspector({ isOpen, entity, onClose }: SideInspectorProps) {
  const navigate = useNavigate();
  const { openInspector, setLoadingEntityId } = useEntityStore();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [resolvedFromApi, setResolvedFromApi] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvedEntity, setResolvedEntity] = useState<InspectableEntity | null>(null);
  const [relatedNotes, setRelatedNotes] = useState<RelatedNote[]>([]);
  const [relatedEntities, setRelatedEntities] = useState<Entity[]>([]);
  const [stats, setStats] = useState<EntityStats | null>(null);

  useEffect(() => {
    if (!entity || !isOpen) {
      return;
    }

    let cancelled = false;

    setResolvedEntity(entity);
    setResolvedFromApi(false);
    setLoading(true);
    setError(null);
    setStats(null);
    setRelatedNotes([]);
    setRelatedEntities([]);
    setLoadingEntityId(entity.id);

    const loadInspectorData = async () => {
      try {
        if (entity.type === "NOTE") {
          const { data } = await notesApi.get(entity.id);

          if (cancelled) {
            return;
          }

          const noteData = data as Partial<Note> & {
            userId?: string;
            entityIds?: string[];
            content?: string;
          };
          const plainText = tiptapContentToPlainText(noteData.content);

          setResolvedEntity({
            id: noteData.id || entity.id,
            title: noteData.title || entity.title,
            type: "NOTE",
            content: noteData.content || "",
            description: plainText ? truncateText(plainText) : undefined,
            tags: Array.isArray(noteData.tags) ? noteData.tags : [],
            entityIds: Array.isArray(noteData.entityIds) ? noteData.entityIds : [],
            ownerId:
              typeof noteData.ownerId === "string"
                ? noteData.ownerId
                : typeof noteData.userId === "string"
                  ? noteData.userId
                  : "",
            createdAt: noteData.createdAt || "",
            updatedAt: noteData.updatedAt || noteData.createdAt || "",
            // preserve custom note type for inspector UI
            noteType: typeof (noteData as { type?: unknown }).type === "string" ? (noteData as { type: string }).type : "",
          } satisfies InspectableNote);
          setResolvedFromApi(true);
          return;
        }

        const [entityRes, notesRes, connectionsRes, statsRes] = await Promise.all([
          entitiesApi.get(entity.id),
          entitiesApi.getNotes(entity.id),
          entitiesApi.getConnections(entity.id),
          entity.type === "ACTIVITY" ? entitiesApi.stats(entity.id) : Promise.resolve(null),
        ]);

        if (cancelled) {
          return;
        }

        setResolvedEntity(entityRes.data);
        setRelatedNotes(Array.isArray(notesRes.data) ? notesRes.data : []);
        setRelatedEntities(
          (Array.isArray(connectionsRes.data) ? connectionsRes.data : []).filter(
            (item: Entity) => item.id !== entity.id
          )
        );
        setStats(statsRes ? statsRes.data : null);
        setResolvedFromApi(true);
      } catch {
        if (!cancelled) {
          setError(t("ent_could_not_load"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadingEntityId(null);
        }
      }
    };

    void loadInspectorData();

    return () => {
      cancelled = true;
      setLoadingEntityId(null);
    };
  }, [entity, isOpen, setLoadingEntityId]);

  if (!entity) {
    return null;
  }

  const displayEntity = resolvedEntity || entity;
  const config = getEntityTypeConfig(t, displayEntity.type);
  const isNote = displayEntity.type === "NOTE";
  const activityTotalCompletions = Array.isArray((displayEntity as Entity).trackingDates)
    ? (displayEntity as Entity).trackingDates?.length ?? 0
    : stats?.totalCompletions ?? 0;
  const weeklyCompletionRate = (() => {
    const value = stats?.weeklyCompletionRate ?? 0;
    return value <= 1 ? value * 100 : value;
  })();
  const notePreview = isNote
    ? (() => {
        const note = displayEntity as InspectableNote;
        const previewSource = note.description || tiptapContentToPlainText(note.content);
        return previewSource ? truncateText(previewSource) : "No content available.";
      })()
    : "";

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 320 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 320 }}
          transition={{ duration: 0.25 }}
          className="fixed right-0 top-0 bottom-0 z-40 w-[22rem] border-l border-white/10 bg-black/95 backdrop-blur-xl shadow-2xl"
        >
          <ScrollArea className="h-full">
            <div className="space-y-4 p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-[0.32em] text-white/30 font-mono">
                    {config.label}
                  </p>
                  <h2 className="mt-2 font-serif text-2xl tracking-tight text-white break-words">{displayEntity.title}</h2>
                  {!loading && resolvedFromApi && displayEntity.createdAt && (
                    <p className="mt-2 text-[10px] font-mono text-white/40">
                      {formatDate(displayEntity.createdAt)}
                    </p>
                  )}
                </div>
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={onClose}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-sm border border-white/10 text-white/60 transition-colors hover:border-white/30 hover:text-white"
                  aria-label={t("ent_close")}
                >
                  <X className="h-3.5 w-3.5" />
                </motion.button>
              </div>

              <div className="h-px bg-white/10" />

              {/* Graph Score Card - appears when score is available */}
              {(displayEntity as any)?.graphScore !== undefined && (
                <div className="border border-white/5 bg-white/[0.01] rounded-sm p-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="font-mono text-xl font-semibold text-white">{(displayEntity as any).graphScore}</div>
                      <p className="mt-1.5 text-[9px] font-mono uppercase tracking-widest text-white/40">{t("ent_graph_score")}</p>
                    </div>
                    <div>
                      <div className="font-mono text-xl font-semibold text-white">{(displayEntity as any).graphDegree ?? 0}</div>
                      <p className="mt-1.5 text-[9px] font-mono uppercase tracking-widest text-white/40">{t("ent_connections")}</p>
                    </div>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, index) => (
                    <div key={index} className="h-20 animate-pulse rounded-sm bg-white/5" />
                  ))}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-3"
                >
                  {error && (
                    <div className="border border-white/5 bg-white/[0.01] rounded-sm p-4">
                      <p className="text-xs text-white/60">{error}</p>
                    </div>
                  )}

                  {isNote ? (
                    <>
                      <div className="border border-white/5 bg-white/[0.01] rounded-sm p-4">
                        <h3 className="mb-3 text-[10px] uppercase tracking-[0.28em] text-white/40 font-mono">{t("ent_summary")}</h3>
                        <div className="space-y-3">
                          <p className="text-xs leading-relaxed text-white/70">{notePreview}</p>
                          <div className="space-y-2 border-t border-white/5 pt-3">
                            <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
                              <span className="inline-flex items-center gap-1.5">
                                <Link2 className="h-3 w-3" />
                                {t("ent_mentioned_entities")}
                              </span>
                              <span className="font-semibold text-white/60">{(displayEntity as InspectableNote).entityIds?.length ?? 0}</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
                              <span className="inline-flex items-center gap-1.5">
                                <Calendar className="h-3 w-3" />
                                {t("ent_last_update")}
                              </span>
                              <span className="font-semibold text-white/60">{formatDate((displayEntity as InspectableNote).updatedAt)}</span>
                            </div>
                              {/* Note Type display + clear action */}
                              {displayEntity?.noteType ? (
                                <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
                                  <span className="inline-flex items-center gap-1.5">
                                    <Tag className="h-3 w-3" />
                                    {t("ent_note_type")}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-white/60">{(displayEntity as any).noteType}</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={async () => {
                                        try {
                                          setLoading(true);
                                          await notesApi.update(displayEntity.id, { type: "" });
                                          // update local state
                                          setResolvedEntity((prev) => prev ? ({ ...prev, noteType: "" } as any) : prev);
                                          toast({ title: t("ent_type_removed") });
                                        } catch {
                                          toast({ title: t("ent_failed_remove_type"), variant: "destructive" });
                                        } finally {
                                          setLoading(false);
                                        }
                                      }}
                                      className="h-5 w-5 p-0 hover:bg-white/10"
                                    >
                                      <X className="h-3 w-3 text-white/40" />
                                    </Button>
                                  </div>
                                </div>
                              ) : null}
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        className="w-full gap-2 border-white/5 hover:bg-white/5"
                        onClick={() => {
                          navigate(`/notes/${displayEntity.id}`);
                          onClose();
                        }}
                      >
                        <ArrowUpRight className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">{t("ent_open_note")}</span>
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="border border-white/5 bg-white/[0.01] rounded-sm p-4">
                        <h3 className="mb-3 text-[10px] uppercase tracking-[0.28em] text-white/40 font-mono">{t("ent_metadata")}</h3>
                        <div className="space-y-2 text-[10px] font-mono text-white/40">
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5">
                              <Calendar className="h-3 w-3" />
                              {t("ent_created")}
                            </span>
                            <span className="font-semibold text-white/60">{formatDate(displayEntity.createdAt)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5">
                              <Network className="h-3 w-3" />
                              {t("ent_connections")}
                            </span>
                            <span className="font-semibold text-white/60">{relatedEntities.length}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5">
                              <Tag className="h-3 w-3" />
                              {t("ent_type")}
                            </span>
                            <span className="font-semibold text-white/60">{config.label}</span>
                          </div>
                        </div>
                      </div>

                      <div className="border border-white/5 bg-white/[0.01] rounded-sm p-4">
                        <h3 className="mb-3 text-[10px] uppercase tracking-[0.28em] text-white/40 font-mono">{t("ent_details")}</h3>
                        <div className="space-y-3">
                          {displayEntity.description ? (
                            <p className="text-xs leading-relaxed text-white/70">{displayEntity.description}</p>
                          ) : (
                            <p className="text-xs text-white/40">{t("ent_no_description_added")}</p>
                          )}
                          <div className="grid grid-cols-2 gap-2 border-t border-white/5 pt-3">
                            <div className="text-center text-[10px] font-mono">
                              <div className="font-semibold text-white">{relatedNotes.length}</div>
                              <div className="mt-1 text-white/40">{t("ent_notes")}</div>
                            </div>
                            <div className="text-center text-[10px] font-mono">
                              <div className="font-semibold text-white">{relatedEntities.length}</div>
                              <div className="mt-1 text-white/40">{t("ent_connections")}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {displayEntity.type === "ACTIVITY" && (
                        <div className="border border-white/5 bg-white/[0.01] rounded-sm p-4">
                          <h3 className="mb-3 text-[10px] uppercase tracking-[0.28em] text-white/40 font-mono">{t("ent_activity_metrics")}</h3>
                          <div className="grid grid-cols-2 gap-3 text-center text-[10px] font-mono">
                            <div>
                              <div className="font-semibold text-white">{activityTotalCompletions}</div>
                              <p className="mt-1 text-white/40">{t("ent_total_tracked")}</p>
                            </div>
                            <div>
                              <div className="font-semibold text-white">{Math.round(weeklyCompletionRate)}%</div>
                              <p className="mt-1 text-white/40">{t("ent_weekly")}</p>
                            </div>
                          </div>
                        </div>
                      )}


                      <div className="border border-white/5 bg-white/[0.01] rounded-sm p-4">
                        <h3 className="mb-3 text-[10px] uppercase tracking-[0.28em] text-white/40 font-mono">{t("ent_connected_notes")}</h3>
                        <div className="space-y-2">
                          {relatedNotes.length > 0 ? (
                            relatedNotes.slice(0, 5).map((note) => (
                              <button
                                key={note.id}
                                onClick={() => {
                                  navigate(`/notes/${note.id}`);
                                  onClose();
                                }}
                                className="flex w-full items-start gap-2 rounded-sm border border-white/5 px-2.5 py-2 text-left transition-colors hover:border-white/10 hover:bg-white/5"
                              >
                                <StickyNote className="mt-0.5 h-3 w-3 shrink-0 text-white/60" />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs text-white/80">{note.title}</p>
                                  <p className="text-[9px] text-white/40">{formatDate(note.updatedAt || note.createdAt)}</p>
                                </div>
                              </button>
                            ))
                          ) : (
                            <p className="text-xs text-white/40">{t("ent_no_connected_notes")}</p>
                          )}
                        </div>
                      </div>

                      <div className="border border-white/5 bg-white/[0.01] rounded-sm p-4">
                        <h3 className="mb-3 text-[10px] uppercase tracking-[0.28em] text-white/40 font-mono">{t("ent_related_entities")}</h3>
                        <div className="space-y-2">
                          {relatedEntities.length > 0 ? (
                            relatedEntities.slice(0, 5).map((relatedEntity) => (
                              <button
                                key={relatedEntity.id}
                                onClick={() => openInspector(relatedEntity)}
                                className="flex w-full items-center justify-between rounded-sm border border-white/5 px-2.5 py-2 text-left transition-colors hover:border-white/10 hover:bg-white/5"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-xs text-white/80">{relatedEntity.title}</p>
                                  <p className="text-[9px] text-white/40">
                                    {getEntityTypeConfig(t, relatedEntity.type).label}
                                  </p>
                                </div>
                                <ArrowUpRight className="h-3 w-3 shrink-0 text-white/40" />
                              </button>
                            ))
                          ) : (
                            <p className="text-xs text-white/40">{t("ent_no_related_entities")}</p>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        className="w-full gap-2 border-white/5 hover:bg-white/5"
                        onClick={() => {
                          navigate(`/entities/${displayEntity.id}`);
                          onClose();
                        }}
                      >
                        <ArrowUpRight className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">{t("ent_open_entity")}</span>
                      </Button>
                    </>
                  )}
                </motion.div>
              )}
            </div>
          </ScrollArea>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

SideInspector.displayName = "SideInspector";

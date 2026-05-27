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

const ENTITY_TYPE_CONFIG: Record<string, { label: string }> = {
  NOTE: { label: "Note" },
  ACTIVITY: { label: "Activity" },
  PROJECT: { label: "Project" },
  PERSON: { label: "Person" },
  TOPIC: { label: "Topic" },
  ORGANIZATION: { label: "Organization" },
};

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
          setError("Could not load this entity's data right now.");
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
  const config = ENTITY_TYPE_CONFIG[displayEntity.type] || ENTITY_TYPE_CONFIG.TOPIC;
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
          className="fixed right-0 top-0 bottom-0 z-40 w-80 border-l border-white/5 bg-black shadow-lg"
        >
          <ScrollArea className="h-full">
            <div className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <Badge variant="outline" className="mb-2 text-[9px] font-medium uppercase tracking-widest">
                    {config.label}
                  </Badge>
                  <h2 className="truncate font-serif text-lg font-semibold text-white">{displayEntity.title}</h2>
                  {!loading && resolvedFromApi && displayEntity.createdAt && (
                    <p className="mt-1 text-[10px] font-mono text-white/40">
                      {formatDate(displayEntity.createdAt)}
                    </p>
                  )}
                </div>
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={onClose}
                  className="mt-1 rounded-sm p-1.5 transition-colors hover:bg-white/10"
                >
                  <X className="h-4 w-4 text-white/40" />
                </motion.button>
              </div>

              <div className="h-px bg-white/5" />

              {/* Graph Score Card - appears when score is available */}
              {(displayEntity as any)?.graphScore !== undefined && (
                <div className="border border-white/5 bg-white/[0.01] rounded-sm p-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="font-mono text-xl font-semibold text-white">{(displayEntity as any).graphScore}</div>
                      <p className="mt-1.5 text-[9px] font-mono uppercase tracking-widest text-white/40">Graph Score</p>
                    </div>
                    <div>
                      <div className="font-mono text-xl font-semibold text-white">{(displayEntity as any).graphDegree ?? 0}</div>
                      <p className="mt-1.5 text-[9px] font-mono uppercase tracking-widest text-white/40">Connections</p>
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
                        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-white">Resumo</h3>
                        <div className="space-y-3">
                          <p className="text-xs leading-relaxed text-white/70">{notePreview}</p>
                          <div className="space-y-2 border-t border-white/5 pt-3">
                            <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
                              <span className="inline-flex items-center gap-1.5">
                                <Link2 className="h-3 w-3" />
                                Mentioned Entities
                              </span>
                              <span className="font-semibold text-white/60">{(displayEntity as InspectableNote).entityIds?.length ?? 0}</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
                              <span className="inline-flex items-center gap-1.5">
                                <Calendar className="h-3 w-3" />
                                Last Update
                              </span>
                              <span className="font-semibold text-white/60">{formatDate((displayEntity as InspectableNote).updatedAt)}</span>
                            </div>
                              {/* Note Type display + clear action */}
                              {displayEntity?.noteType ? (
                                <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
                                  <span className="inline-flex items-center gap-1.5">
                                    <Tag className="h-3 w-3" />
                                    Note Type
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
                                          toast({ title: "Type removed" });
                                        } catch {
                                          toast({ title: "Failed to remove type", variant: "destructive" });
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
                        <span className="text-xs font-medium">Open Note</span>
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="border border-white/5 bg-white/[0.01] rounded-sm p-4">
                        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-white">Metadata</h3>
                        <div className="space-y-2 text-[10px] font-mono text-white/40">
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5">
                              <Calendar className="h-3 w-3" />
                              Created
                            </span>
                            <span className="font-semibold text-white/60">{formatDate(displayEntity.createdAt)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5">
                              <Network className="h-3 w-3" />
                              Connections
                            </span>
                            <span className="font-semibold text-white/60">{relatedEntities.length}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5">
                              <Tag className="h-3 w-3" />
                              Type
                            </span>
                            <span className="font-semibold text-white/60">{config.label}</span>
                          </div>
                        </div>
                      </div>

                      <div className="border border-white/5 bg-white/[0.01] rounded-sm p-4">
                        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-white">Details</h3>
                        <div className="space-y-3">
                          {displayEntity.description ? (
                            <p className="text-xs leading-relaxed text-white/70">{displayEntity.description}</p>
                          ) : (
                            <p className="text-xs text-white/40">No description added.</p>
                          )}
                          <div className="grid grid-cols-2 gap-2 border-t border-white/5 pt-3">
                            <div className="text-center text-[10px] font-mono">
                              <div className="font-semibold text-white">{relatedNotes.length}</div>
                              <div className="mt-1 text-white/40">Notes</div>
                            </div>
                            <div className="text-center text-[10px] font-mono">
                              <div className="font-semibold text-white">{relatedEntities.length}</div>
                              <div className="mt-1 text-white/40">Connections</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {displayEntity.type === "ACTIVITY" && stats && (
                        <div className="border border-white/5 bg-white/[0.01] rounded-sm p-4">
                          <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-white">Activity Metrics</h3>
                          <div className="grid grid-cols-3 gap-3 text-center text-[10px] font-mono">
                            <div>
                              <div className="font-semibold text-white">{stats.currentStreak}</div>
                              <p className="mt-1 text-white/40">Streak</p>
                            </div>
                            <div>
                              <div className="font-semibold text-white">{stats.longestStreak}</div>
                              <p className="mt-1 text-white/40">Longest</p>
                            </div>
                            <div>
                              <div className="font-semibold text-white">{Math.round(weeklyCompletionRate)}%</div>
                              <p className="mt-1 text-white/40">Weekly</p>
                            </div>
                          </div>
                          <div className="mt-3 border-t border-white/5 pt-3 text-center text-[10px] font-mono text-white/40">
                            <span>Total tracked: </span>
                            <span className="font-semibold text-white/60">{activityTotalCompletions}</span>
                          </div>
                        </div>
                      )}

                      <div className="border border-white/5 bg-white/[0.01] rounded-sm p-4">
                        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-white">Connected Notes</h3>
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
                            <p className="text-xs text-white/40">No connected notes yet.</p>
                          )}
                        </div>
                      </div>

                      <div className="border border-white/5 bg-white/[0.01] rounded-sm p-4">
                        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-white">Related Entities</h3>
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
                                    {(ENTITY_TYPE_CONFIG[relatedEntity.type] || ENTITY_TYPE_CONFIG.TOPIC).label}
                                  </p>
                                </div>
                                <ArrowUpRight className="h-3 w-3 shrink-0 text-white/40" />
                              </button>
                            ))
                          ) : (
                            <p className="text-xs text-white/40">No related entities found.</p>
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
                        <span className="text-xs font-medium">Open Entity</span>
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

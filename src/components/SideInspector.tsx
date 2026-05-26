import { memo, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { ArrowUpRight, Calendar, Link2, Network, StickyNote, X, Tag } from "@/lib/heroicons";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEntityStore, type InspectableEntity, type InspectableNote } from "@/contexts/EntityContext";
import { entitiesApi, notesApi } from "@/lib/api";
import { tiptapContentToPlainText } from "@/lib/tiptap-content";
import type { Entity, EntityStats, Note } from "@/types";

const ENTITY_TYPE_CONFIG: Record<string, { label: string; icon: string }> = {
  NOTE: { label: "Note", icon: "📝" },
  ACTIVITY: { label: "Activity", icon: "🟢" },
  PROJECT: { label: "Project", icon: "🔵" },
  PERSON: { label: "Person", icon: "🟡" },
  TOPIC: { label: "Topic", icon: "🟣" },
  ORGANIZATION: { label: "Organization", icon: "🟠" },
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

  const { toast } = useToast();

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
          className="fixed right-0 top-0 bottom-0 z-40 w-80 border-l border-border bg-background/95 shadow-lg backdrop-blur-sm"
        >
          <ScrollArea className="h-full">
            <div className="space-y-4 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-2xl">{config.icon}</span>
                    <Badge variant="outline" className="text-xs">
                      {config.label}
                    </Badge>
                  </div>
                  <h2 className="truncate text-lg font-bold text-foreground">{displayEntity.title}</h2>
                  {!loading && resolvedFromApi && displayEntity.createdAt && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Created on {formatDate(displayEntity.createdAt)}
                    </p>
                  )}
                </div>
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={onClose}
                  className="mt-1 rounded-md p-1.5 transition-colors hover:bg-muted"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </motion.button>
              </div>

              <div className="h-px bg-border/50" />

              {/* Graph Score Card - appears when score is available */}
              {(displayEntity as any)?.graphScore !== undefined && (
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div>
                        <div className="text-2xl font-bold text-primary">{(displayEntity as any).graphScore}</div>
                        <p className="mt-1 text-xs text-muted-foreground">Graph Score</p>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-primary">{(displayEntity as any).graphDegree ?? 0}</div>
                        <p className="mt-1 text-xs text-muted-foreground">Connections</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, index) => (
                    <div key={index} className="h-24 animate-pulse rounded bg-muted" />
                  ))}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {error && (
                    <Card>
                      <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground">{error}</p>
                      </CardContent>
                    </Card>
                  )}

                  {isNote ? (
                    <>
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-semibold">Resumo</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-sm leading-relaxed text-foreground">{notePreview}</p>
                          <div className="space-y-2 text-xs text-muted-foreground">
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center gap-1.5">
                                <Link2 className="h-3.5 w-3.5" />
                                Mentioned Entities
                              </span>
                              <span>{(displayEntity as InspectableNote).entityIds?.length ?? 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                Last Update
                              </span>
                              <span>{formatDate((displayEntity as InspectableNote).updatedAt)}</span>
                            </div>
                              {/* Note Type display + clear action */}
                              {displayEntity?.noteType ? (
                                <div className="flex items-center justify-between">
                                  <span className="inline-flex items-center gap-1.5">
                                    <Tag className="h-3.5 w-3.5" />
                                    Note Type
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-foreground">{(displayEntity as any).noteType}</span>
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
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ) : null}
                          </div>
                        </CardContent>
                      </Card>

                      <Button
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => {
                          navigate(`/notes/${displayEntity.id}`);
                          onClose();
                        }}
                      >
                        <ArrowUpRight className="h-4 w-4" />
                        Open Note
                      </Button>
                    </>
                  ) : (
                    <>
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-semibold">Entity Metadata</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-1 gap-3 text-xs text-muted-foreground">
                            <div className="rounded-md border border-border/50 bg-card/60 p-3">
                              <div className="mb-1 inline-flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                Created At
                              </div>
                              <div className="text-sm font-semibold text-foreground">{formatDate(displayEntity.createdAt)}</div>
                            </div>
                            <div className="rounded-md border border-border/50 bg-card/60 p-3">
                              <div className="mb-1 inline-flex items-center gap-1.5">
                                <Network className="h-3.5 w-3.5" />
                                Number of Connections
                              </div>
                              <div className="text-sm font-semibold text-foreground">{relatedEntities.length}</div>
                            </div>
                            <div className="rounded-md border border-border/50 bg-card/60 p-3">
                              <div className="mb-1 inline-flex items-center gap-1.5">
                                <Tag className="h-3.5 w-3.5" />
                                Entity Type
                              </div>
                              <div className="text-sm font-semibold text-foreground">{config.label}</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-semibold">Detalhes reais</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {displayEntity.description ? (
                            <p className="text-sm leading-relaxed text-foreground">{displayEntity.description}</p>
                          ) : (
                            <p className="text-sm text-muted-foreground">No description added.</p>
                          )}
                          <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                            <div className="rounded-md border border-border/50 bg-card/60 p-3">
                              <div className="mb-1 inline-flex items-center gap-1.5">
                                <StickyNote className="h-3.5 w-3.5" />
                                Notes
                              </div>
                              <div className="text-base font-semibold text-foreground">{relatedNotes.length}</div>
                            </div>
                            <div className="rounded-md border border-border/50 bg-card/60 p-3">
                              <div className="mb-1 inline-flex items-center gap-1.5">
                                <Network className="h-3.5 w-3.5" />
                                Connections
                              </div>
                              <div className="text-base font-semibold text-foreground">{relatedEntities.length}</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {displayEntity.type === "ACTIVITY" && stats && (
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold">Activity Metrics</CardTitle>
                          </CardHeader>
                          <CardContent className="grid grid-cols-3 gap-3 text-center text-xs text-muted-foreground">
                            <div>
                              <div className="text-lg font-semibold text-foreground">{stats.currentStreak}</div>
                              <p>Streak</p>
                            </div>
                            <div>
                              <div className="text-lg font-semibold text-foreground">{stats.longestStreak}</div>
                              <p>Longest</p>
                            </div>
                            <div>
                              <div className="text-lg font-semibold text-foreground">{Math.round(weeklyCompletionRate)}%</div>
                              <p>Weekly Rate</p>
                            </div>
                          </CardContent>
                          <CardContent className="pt-0 text-center text-xs text-muted-foreground">
                            <span>Total tracked: </span>
                            <span className="font-medium text-foreground">{activityTotalCompletions}</span>
                          </CardContent>
                        </Card>
                      )}

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-semibold">Connected Notes</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {relatedNotes.length > 0 ? (
                            relatedNotes.slice(0, 5).map((note) => (
                              <button
                                key={note.id}
                                onClick={() => {
                                  navigate(`/notes/${note.id}`);
                                  onClose();
                                }}
                                className="flex w-full items-start gap-2 rounded-md border border-border/40 px-3 py-2 text-left transition-colors hover:bg-accent"
                              >
                                <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm text-foreground">{note.title}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Updated {formatDate(note.updatedAt || note.createdAt)}
                                  </p>
                                </div>
                              </button>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground">No connected notes yet.</p>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-semibold">Related Entities</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {relatedEntities.length > 0 ? (
                            relatedEntities.slice(0, 5).map((relatedEntity) => (
                              <button
                                key={relatedEntity.id}
                                onClick={() => openInspector(relatedEntity)}
                                className="flex w-full items-center justify-between rounded-md border border-border/40 px-3 py-2 text-left transition-colors hover:bg-accent"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm text-foreground">{relatedEntity.title}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {(ENTITY_TYPE_CONFIG[relatedEntity.type] || ENTITY_TYPE_CONFIG.TOPIC).label}
                                  </p>
                                </div>
                                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              </button>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground">Nenhuma conexão real encontrada.</p>
                          )}
                        </CardContent>
                      </Card>

                      <Button
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => {
                          navigate(`/entities/${displayEntity.id}`);
                          onClose();
                        }}
                      >
                        <ArrowUpRight className="h-4 w-4" />
                        Open Entity
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

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { entitiesApi, notesApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { 
  ArrowLeft, Save, Loader2, Check, PanelRight, 
  Settings2, ImageIcon, FileText, X, Clock,
  Link2, AtSign
} from "@/lib/heroicons";
import { useToast } from "@/hooks/use-toast";
import { TiptapEditor, type TiptapEditorHandle } from "@/components/TiptapEditor";
import { BacklinksPanel } from "@/components/BacklinksPanel";
import { countTiptapMentions, extractMentionIds, extractMentionLabels, parseTiptapContent, sanitizeTiptapMentions, tiptapContentToPlainText } from "@/lib/tiptap-content";
import {
  isAllowedWallpaperFile,
  loadWallpaperSettings,
  removeWallpaper,
  resolveVaultBlob,
  saveWallpaperSettings,
  subscribeWallpaper,
  uploadWallpaper,
  type NoteWallpaperSettings,
} from "@/lib/note-wallpaper";

interface NoteData {
  id: string;
  title: string;
  content: any;
  type?: string;
  folderId?: string;
  entityIds: string[];
  createdAt: string;
  updatedAt: string;
}

const typeLabels: Record<string, string> = {
  PERSON: "Person",
  PROJECT: "Project",
  TOPIC: "Topic",
  ORGANIZATION: "Organization",
  ACTIVITY: "Activity",
};

export default function NoteEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const editorRef = useRef<TiptapEditorHandle>(null);
  const tempId = searchParams.get("tempId");
  const isOptimistic = searchParams.get("optimistic") === "true";
  const optimisticKey = tempId ? `optimistic-note:${tempId}` : null;

  const [note, setNote] = useState<NoteData | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<string>("");
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [allEntities, setAllEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "creating">("idle");
  const [showBacklinks, setShowBacklinks] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

  // ── Wallpaper (global to all notes, persisted in localStorage) ──────────
  const [wallpaper, setWallpaper] = useState<NoteWallpaperSettings>(() => loadWallpaperSettings());
  const [wallpaperUrl, setWallpaperUrl] = useState<string | null>(null);
  const [wallpaperUploading, setWallpaperUploading] = useState(false);
  const wallpaperInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = subscribeWallpaper(setWallpaper);
    return () => { unsubscribe(); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!wallpaper.fileId) { setWallpaperUrl(null); return; }
    resolveVaultBlob(wallpaper.fileId)
      .then((url) => { if (!cancelled) setWallpaperUrl(url); })
      .catch(() => { if (!cancelled) setWallpaperUrl(null); });
    return () => { cancelled = true; };
  }, [wallpaper.fileId]);

  const handleWallpaperFile = async (file: File | undefined | null) => {
    if (!file) return;
    if (!isAllowedWallpaperFile(file)) {
      toast({ title: "Unsupported format", description: "Only .jpg and .png images are allowed.", variant: "destructive" });
      return;
    }
    setWallpaperUploading(true);
    try {
      await uploadWallpaper(file);
      toast({ title: "Wallpaper updated" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e?.message || "Could not upload wallpaper.", variant: "destructive" });
    } finally {
      setWallpaperUploading(false);
      if (wallpaperInputRef.current) wallpaperInputRef.current.value = "";
    }
  };

  const handleWallpaperRemove = async () => {
    try {
      await removeWallpaper();
      toast({ title: "Wallpaper removed" });
    } catch {
      toast({ title: "Could not remove wallpaper", variant: "destructive" });
    }
  };

  const updateWallpaperAdjustment = (patch: Partial<NoteWallpaperSettings>) => {
    const next = { ...wallpaper, ...patch };
    saveWallpaperSettings(next);
  };

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedJSON = useRef<string>("");
  const lastSavedTitle = useRef<string>("");
  const lastSavedType = useRef<string>("");
  const currentJSON = useRef<any>(null);

  const saveOptimisticDraft = (draft: { title: string; type: string; content: any }) => {
    if (!optimisticKey) return;
    try {
      sessionStorage.setItem(optimisticKey, JSON.stringify(draft));
    } catch {
      // ignore storage failures
    }
  };

  const loadOptimisticDraft = () => {
    if (!optimisticKey) return null;
    try {
      const raw = sessionStorage.getItem(optimisticKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const clearOptimisticDraft = () => {
    if (!optimisticKey) return;
    try {
      sessionStorage.removeItem(optimisticKey);
    } catch {
      // ignore
    }
  };

  const contentForMetadata = currentJSON.current ?? note?.content;

  const mentionLabels = useMemo(() => extractMentionLabels(contentForMetadata), [contentForMetadata]);

  const mentionedEntities = useMemo(() => {
    if (!note?.entityIds?.length) return [];
    const entitiesById = new Map(allEntities.map((entity) => [entity.id, entity]));
    return note.entityIds.map((entityId) => {
      return (
        entitiesById.get(entityId) ?? {
          id: entityId,
          title: mentionLabels.get(entityId) ?? `@${entityId}`,
          type: undefined,
        }
      );
    });
  }, [note?.entityIds, allEntities, mentionLabels]);
  const mentionCounts = useMemo(
    () => countTiptapMentions(contentForMetadata),
    [contentForMetadata]
  );

  const characterCount = useMemo(
    () => tiptapContentToPlainText(contentForMetadata).length,
    [contentForMetadata]
  );

  const noteScore = useMemo(() => {
    const entityMentions = mentionCounts.entityMentions;
    const noteMentions = mentionCounts.noteMentions;
    const baseScore = entityMentions * 0.8 + noteMentions * 0.5 + Math.min(2, Math.log10(Math.max(1, characterCount)));
    return Number(Math.max(0, Math.min(10, baseScore)).toFixed(1));
  }, [mentionCounts, characterCount]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const optimistic = searchParams.get("optimistic") === "true";
    setLoading(true);

    if (optimistic) {
      const placeholderContent = { type: "doc", content: [{ type: "paragraph" }] };
      setNote({
        id,
        title: "Untitled",
        content: placeholderContent,
        type: undefined,
        folderId: undefined,
        entityIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setTitle("Untitled");
      setType("");
      setAllEntities([]);
      currentJSON.current = placeholderContent;
      lastSavedTitle.current = "Untitled";
      lastSavedType.current = "";
      lastSavedJSON.current = JSON.stringify(placeholderContent);
      setSaveStatus("creating");
      setLoading(false);

      Promise.allSettled([entitiesApi.list(), notesApi.getTypes()])
        .then(([entitiesResult, typesResult]) => {
          if (cancelled) return;
          if (entitiesResult.status === "fulfilled" && Array.isArray(entitiesResult.value.data)) {
            setAllEntities(entitiesResult.value.data);
          }
          if (typesResult.status === "fulfilled" && Array.isArray(typesResult.value.data)) {
            setAvailableTypes(typesResult.value.data);
          }
        })
        .catch(() => {
          /* ignore fetch details for optimistic placeholder */
        });
    } else {
      Promise.allSettled([notesApi.get(id), entitiesApi.list(), notesApi.getTypes()])
        .then(([noteResult, entitiesResult, typesResult]) => {
          if (noteResult.status !== "fulfilled") throw noteResult.reason;
          if (cancelled) return;

          const data = noteResult.value.data as NoteData;
          const parsedContent = parseTiptapContent(data.content);
          const userEntities =
            entitiesResult.status === "fulfilled" && Array.isArray(entitiesResult.value.data)
              ? entitiesResult.value.data
              : [];
          
          setAllEntities(userEntities);

          const sanitized = userEntities.length > 0
            ? sanitizeTiptapMentions(parsedContent, userEntities)
            : { doc: parsedContent, entityIds: extractMentionIds(parsedContent), changed: false, removedIds: [] };
          
          const normalizedContent = sanitized.doc;

          if (typesResult.status === "fulfilled" && Array.isArray(typesResult.value.data)) {
            setAvailableTypes(typesResult.value.data);
          }

          const optimisticDraft = loadOptimisticDraft();
          const draftTitle = optimisticDraft?.title ?? data.title;
          const draftType = optimisticDraft?.type ?? data.type ?? "";
          const draftContent = optimisticDraft?.content ?? normalizedContent;
          const hasDraftChanges = optimisticDraft && (
            draftTitle !== data.title ||
            draftType !== (data.type ?? "") ||
            JSON.stringify(draftContent) !== JSON.stringify(normalizedContent)
          );

          setNote({
            ...data,
            content: draftContent,
            entityIds: sanitized.entityIds,
            type: draftType,
          });
          setTitle(draftTitle);
          setType(draftType);
          lastSavedTitle.current = data.title;
          lastSavedType.current = data.type || "";
          currentJSON.current = draftContent;
          lastSavedJSON.current = JSON.stringify(normalizedContent);

          if (hasDraftChanges) {
            setSaveStatus("saving");
            void doSave(draftTitle, draftContent, draftType).finally(() => {
              clearOptimisticDraft();
            });
          } else {
            setSaveStatus("idle");
            clearOptimisticDraft();
          }

          if (sanitized.changed) {
            void notesApi.update(id, {
              title: data.title,
              content: normalizedContent,
              entityIds: sanitized.entityIds,
            });
          }
        })
        .catch(() => {
          if (cancelled) return;
          toast({ title: "Note not found", variant: "destructive" });
          navigate("/notes");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }

    return () => {
      cancelled = true;
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [id, navigate, searchParams, toast]);

  const doSave = useCallback(async (t: string, json: any, newType: string) => {
    if (!id) return;
    const jsonStr = JSON.stringify(json);
    if (t === lastSavedTitle.current && jsonStr === lastSavedJSON.current && newType === lastSavedType.current) return;

    setSaveStatus("saving");
    try {
      const entityIds = extractMentionIds(json);
      await notesApi.update(id, {
        title: t,
        content: json,
        entityIds,
        type: newType,
      });

      setNote((prev) => prev ? { ...prev, title: t, content: json, entityIds, type: newType } : null);

      lastSavedTitle.current = t;
      lastSavedJSON.current = jsonStr;
      lastSavedType.current = newType;
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error: any) {
      setSaveStatus("idle");
      if (error?.response?.status === 401) {
        toast({ title: "Session expired", variant: "destructive" });
      } else {
        toast({ title: "Error saving note", variant: "destructive" });
      }
    }
  }, [id, toast]);

  const scheduleAutoSave = useCallback((t: string, json: any, newType: string) => {
    if (isOptimistic) return;
    if (!autoSaveEnabled) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => doSave(t, json, newType), 1500);
  }, [doSave, autoSaveEnabled, isOptimistic]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    setNote((prev) => (prev ? { ...prev, title: val } : prev));
    if (isOptimistic) {
      saveOptimisticDraft({ title: val, type, content: currentJSON.current });
      return;
    }
    scheduleAutoSave(val, currentJSON.current, type);
  };

  const handleTypeChange = (val: string) => {
    setType(val);
    setNote((prev) => (prev ? { ...prev, type: val } : prev));
    if (isOptimistic) {
      saveOptimisticDraft({ title, type: val, content: currentJSON.current });
      return;
    }
    scheduleAutoSave(title, currentJSON.current, val);
  };

  const handleEditorChange = useCallback((json: any) => {
    currentJSON.current = json;
    setNote((prev) =>
      prev ? { ...prev, content: json, entityIds: extractMentionIds(json) } : prev
    );
    if (isOptimistic) {
      saveOptimisticDraft({ title, type, content: json });
      return;
    }
    scheduleAutoSave(title, json, type);
  }, [title, type, scheduleAutoSave, isOptimistic]);

  const handleManualSave = async () => {
    if (isOptimistic) {
      toast({ title: "Waiting for note creation", description: "Your note is still being created on the server.", variant: "default" });
      return;
    }

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    const json = editorRef.current?.getJSON() || currentJSON.current;
    await doSave(title, json, type);
    toast({ title: "Note saved successfully!" });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-full">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-3.5rem)] bg-background relative">
        {/* Wallpaper layer (global, per-user) - covers entire editor area including sidebar */}
        {wallpaperUrl && (
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${wallpaperUrl})`,
              filter: `blur(${wallpaper.blur}px) brightness(${wallpaper.brightness}%)`,
              transform: wallpaper.blur > 0 ? "scale(1.05)" : undefined,
            }}
          />
        )}
        {wallpaperUrl && (
          <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 bg-background/55" />
        )}

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">

          {/* Top Toolbar */}
          <header className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-white/5 bg-background/30 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/notes"))} className="text-muted-foreground hover:text-foreground w-8 h-8">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="h-4 w-[1px] bg-border mx-2" />
              
              {/* Status Indicator */}
              <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-full">
                {saveStatus === "creating" && <><Loader2 className="w-3 h-3 animate-spin" /> Creating...</>}
                {saveStatus === "saving" && <><Loader2 className="w-3 h-3 animate-spin" /> Saving...</>}
                {saveStatus === "saved" && <><Check className="w-3 h-3 text-emerald-400" /> Saved</>}
                {saveStatus === "idle" && <><FileText className="w-3 h-3" /> Ready</>}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Botão Premium de Salvar */}
              <Button 
                onClick={handleManualSave}
                disabled={saveStatus === "saving" || saveStatus === "creating"}
                className="gap-2 h-9 px-4 rounded-sm text-sm"
              >
                <Save className="w-3.5 h-3.5" />
                Save
              </Button>

              <div className="h-4 w-[1px] bg-white/10 mx-1" />

              <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground" onClick={() => editorRef.current?.triggerUpload()} title="Attach Media">
                <ImageIcon className="w-4 h-4" />
              </Button>

              {/* Note Settings Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground">
                    <Settings2 className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4 border-white/10 bg-black/95 backdrop-blur-xl shadow-2xl rounded-2xl" align="end">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-sm text-foreground mb-1">Properties</h4>
                      <p className="text-xs text-muted-foreground">Manage note metadata and settings.</p>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Note Type</Label>
                        <div className="flex gap-2">
                          {availableTypes.length > 0 && (
                            <Select value={type} onValueChange={handleTypeChange}>
                              <SelectTrigger className="flex-1 bg-white/5 border-white/10 h-8 text-xs">
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent>
                                {availableTypes.map((t) => (
                                  <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          <Input
                            value={type}
                            onChange={(e) => handleTypeChange(e.target.value)}
                            placeholder="Or new..."
                            className="flex-1 bg-white/5 border-white/10 h-8 text-xs"
                            maxLength={50}
                          />
                          {type && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/20 hover:text-destructive" onClick={() => handleTypeChange("")}>
                              <X className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <Label htmlFor="auto-save" className="text-xs text-foreground cursor-pointer">Auto Save</Label>
                        <Switch id="auto-save" checked={autoSaveEnabled} onCheckedChange={setAutoSaveEnabled} className="scale-75 origin-right" />
                      </div>

                      {/* Wallpaper Settings */}
                      <div className="pt-3 border-t border-white/5 space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Wallpaper</Label>
                          {wallpaper.fileId && (
                            <button
                              type="button"
                              onClick={handleWallpaperRemove}
                              className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-destructive transition-colors"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <input
                          ref={wallpaperInputRef}
                          type="file"
                          accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => handleWallpaperFile(e.target.files?.[0])}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={wallpaperUploading}
                          onClick={() => wallpaperInputRef.current?.click()}
                          className="w-full h-8 text-xs bg-white/5 border-white/10 hover:bg-white/10"
                        >
                          {wallpaperUploading ? (
                            <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Uploading…</>
                          ) : wallpaper.fileId ? (
                            <><ImageIcon className="w-3 h-3 mr-1.5" /> Replace image (.jpg/.png)</>
                          ) : (
                            <><ImageIcon className="w-3 h-3 mr-1.5" /> Upload image (.jpg/.png)</>
                          )}
                        </Button>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Blur</Label>
                            <span className="text-[10px] text-muted-foreground tabular-nums">{wallpaper.blur}px</span>
                          </div>
                          <Slider
                            min={0}
                            max={40}
                            step={1}
                            value={[wallpaper.blur]}
                            onValueChange={([v]) => updateWallpaperAdjustment({ blur: v })}
                            disabled={!wallpaper.fileId}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Brightness</Label>
                            <span className="text-[10px] text-muted-foreground tabular-nums">{wallpaper.brightness}%</span>
                          </div>
                          <Slider
                            min={20}
                            max={150}
                            step={1}
                            value={[wallpaper.brightness]}
                            onValueChange={([v]) => updateWallpaperAdjustment({ brightness: v })}
                            disabled={!wallpaper.fileId}
                          />
                        </div>

                        <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
                          Applies to every note. Saved in your vault — replacing or removing deletes the old image.
                        </p>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Button variant="ghost" size="icon" className={`w-8 h-8 transition-colors ${showBacklinks ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`} onClick={() => setShowBacklinks(!showBacklinks)} title="Toggle Side Panel">
                <PanelRight className="w-4 h-4" />
              </Button>
            </div>
          </header>

          {/* Editor Canvas */}
          <div className="relative z-10 flex-1 overflow-y-auto scroll-smooth">
            <div className="max-w-[750px] mx-auto w-full px-6 py-12 lg:px-12 pb-32">
              <Input
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Untitled Note"
                className="text-5xl lg:text-6xl font-display font-bold border-0 px-0 focus-visible:ring-0 bg-transparent text-foreground mb-8 h-auto placeholder:text-muted-foreground/30 tracking-tight"
              />

              {currentJSON.current && (
                <div className="prose prose-invert prose-p:leading-relaxed prose-headings:font-display max-w-none">
                  <TiptapEditor
                    ref={editorRef}
                    content={currentJSON.current}
                    onChange={handleEditorChange}
                    currentNoteId={note?.id}
                  />
                </div>
              )}
            </div>
          </div>
          
          {/* Footer Metadata */}
          {note?.updatedAt && (
            <div className="absolute bottom-12 left-4 flex items-center gap-1.5 text-[10px] text-muted-foreground bg-background/80 backdrop-blur px-2 py-1 rounded-md border border-white/5">
              <Clock className="w-3 h-3" />
              Edited {new Date(note.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
        </div>

        {/* Combined Context Sidebar */}
        <aside className={`shrink-0 border-l border-white/5 backdrop-blur-md transition-all duration-300 ease-in-out overflow-hidden flex flex-col
          ${showBacklinks ? "w-80 opacity-100" : "w-0 opacity-0 border-none"}`}>
          
          <div className="flex items-center justify-between border-b border-white/5 px-5 py-4 shrink-0">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Context</p>
              <h3 className="mt-0.5 text-sm font-medium text-foreground">Note Connections</h3>
            </div>
            <Button variant="ghost" size="icon" className="w-6 h-6 text-muted-foreground hover:text-foreground" onClick={() => setShowBacklinks(false)}>
              <X className="w-3 h-3" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                <AtSign className="w-3 h-3" />
                <span>Note Metadata</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-sm border border-white/5 bg-white/[0.02] p-3">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/40">Score</p>
                  <p className="mt-2 text-sm font-medium text-white">{noteScore.toFixed(1)}</p>
                </div>
                <div className="rounded-sm border border-white/5 bg-white/[0.02] p-3">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/40">Mentions</p>
                  <p className="mt-2 text-sm font-medium text-white">{mentionCounts.total}</p>
                </div>
                <div className="rounded-sm border border-white/5 bg-white/[0.02] p-3">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/40">Entities</p>
                  <p className="mt-2 text-sm font-medium text-white">{note?.entityIds?.length ?? 0}</p>
                </div>
                <div className="rounded-sm border border-white/5 bg-white/[0.02] p-3">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/40">Characters</p>
                  <p className="mt-2 text-sm font-medium text-white">{characterCount}</p>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 mb-3 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                <AtSign className="w-3 h-3" />
                <span>Mentioned Entities</span>
              </div>
              
              {mentionedEntities.length === 0 ? (
                <p className="text-xs italic text-muted-foreground/60 pl-1">
                  Type @ inside the editor to link entities.
                </p>
              ) : (
                <ul className="space-y-2">
                  {mentionedEntities.map((entity) => (
                    <li key={entity.id}>
                      <button
                        onClick={() => navigate(`/entities/${entity.id}`)}
                        className="w-full flex flex-col gap-0.5 rounded-sm border border-white/5 bg-white/[0.02] p-2 text-left transition-colors hover:bg-white/[0.06] hover:border-white/10"
                      >
                        <span className="text-xs font-medium text-white/90 line-clamp-1">
                          {entity.title || "Untitled Entity"}
                        </span>
                        {entity.type && (
                          <span className="text-[9px] uppercase tracking-wider text-white/35">
                            {typeLabels[entity.type] || entity.type}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-white/5 pt-4">
              <div className="flex items-center gap-1.5 mb-3 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                <Link2 className="w-3 h-3" />
                <span>Linked Mentions (Backlinks)</span>
              </div>
              {id && <BacklinksPanel noteId={id} />}
            </div>
          </div>
        </aside>

      </div>
    </AppLayout>
  );
}
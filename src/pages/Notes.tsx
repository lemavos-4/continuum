import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import AppLayout from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notesApi, vaultApi } from "@/lib/api";
import { usePlanGate } from "@/hooks/usePlanGate";
import { useCreateNote } from "@/hooks/useCreateNote";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import UpgradeModal from "@/components/UpgradeModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton, SkeletonList } from "@/components/ui/skeleton";
import {
  Plus,
  Search,
  Loader2,
  Bookmark,
  BookmarkCheck,
  Trash2,
  Upload,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
  Check,
  X,
  Tag,
} from "@/lib/heroicons";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { InsightSignalBadge } from "@/components/InsightSignal";
import { FilterChips } from "@/components/ui/filter-chips";
import { FitText } from "@/components/ui/fit-text";
import { ListRowContent } from "@/components/ui/list-row-content";
import { StickyNote } from "@/lib/heroicons";
import { FloatingCreateButton } from "@/components/ui/floating-create-button";


import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useLongPress } from "@/hooks/useLongPress";

interface NoteSummary {
  id: string;
  title: string;
  type?: string;
  folderId?: string;
  createdAt: string;
  updatedAt: string;
  content?: unknown;
  favorite?: boolean;
}

type View = "all" | "favorites" | "recent" | "archived";



const RECENT_WINDOW = 1000 * 60 * 60 * 24 * 7; // 7d
const ARCHIVE_WINDOW = 1000 * 60 * 60 * 24 * 90; // 90d

/* ── Helpers ──────────────────────────────────────────────────────────── */

function extractPreview(content: unknown): string {
  if (!content) return "";
  if (typeof content === "string") {
    return content.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  }
  const out: string[] = [];
  const walk = (n: any) => {
    if (!n || typeof n !== "object") return;
    if (typeof n.text === "string") out.push(n.text);
    if (Array.isArray(n.content)) n.content.forEach(walk);
  };
  walk(content);
  return out.join(" ").replace(/\s+/g, " ").trim();
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(key: string) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleString("en-US", { month: "long", year: "numeric" }).toUpperCase();
}

function relativeDate(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const day = 86400000;
  if (diff < day) return "today";
  if (diff < day * 2) return "yesterday";
  if (diff < day * 7) return `${Math.floor(diff / day)}d ago`;
  if (diff < day * 30) return `${Math.floor(diff / (day * 7))}w ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ── Sidebar nav item ─────────────────────────────────────────────────── */

interface NavItemProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}
function NavItem({ label, count, active, onClick }: NavItemProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      className={cn(
        "group flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-[13px] normal-case transition-colors",
        active ? "text-white" : "text-white/45 hover:text-white/80"
      )}
      onClick={onClick}
    >
      <span className="flex items-center gap-2">
        <span
          aria-hidden
          className={cn(
            "h-px w-3 transition-all",
            active ? "bg-white w-5" : "bg-white/20 group-hover:bg-white/40"
          )}
        />
        {label}
      </span>
      <span className={cn("font-mono text-[10px] tabular-nums", active ? "text-white/60" : "text-white/30")}>
        {count}
      </span>
    </Button>
  );
}

/* ── Row with long-press → select ────────────────────────────────────── */
interface NoteRowProps {
  selectMode: boolean;
  selected: boolean;
  onLongPress: () => void;
  onOpen: () => void;
  children: React.ReactNode;
}
function NoteRow({ selectMode, selected, onLongPress, onOpen, children }: NoteRowProps) {
  const press = useLongPress({ onLongPress, onClick: onOpen });
  return (
    <div
      role="button"
      tabIndex={0}
      {...press}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        "group relative flex w-full cursor-pointer select-none items-start gap-4 py-5 text-left transition-colors hover:bg-white/[0.02] focus:outline-none",
        selected && "bg-white/[0.04]"
      )}
    >
      {children}
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */

export default function Notes() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loading: authLoading } = useRequireAuth();
  const { getLimitMessage, refresh, applyUsageDelta } = usePlanGate();
  const { createNote, creating } = useCreateNote({ onLimitReached: () => setUpgradeOpen(true) });

  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<View>("all");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<NoteSummary | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // Multiselect
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkTypeApplying, setBulkTypeApplying] = useState(false);

  // Estados de Ordenação Dinâmica
  const [sortBy, setSortBy] = useState<"createdAt" | "updatedAt">("updatedAt");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  // Drag-drop upload to vault
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);



  // Edge swipe to open mobile filter drawer
  const swipeRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const onSwipeStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    // Wider edge zone (160px) so it's easier to grab on mobile.
    if (t.clientX > 160) return;
    swipeRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };
  const onSwipeEnd = (e: React.TouchEvent) => {
    const s = swipeRef.current;
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = Math.abs(t.clientY - s.y);
    // More sensitive: shorter distance, longer time window.
    if (dx > 28 && dy < 100 && Date.now() - s.t < 1000) setFilterDrawerOpen(true);
    swipeRef.current = null;
  };


  /* Load */
  const fetchData = async () => {
    setLoading(true);
    try {
      const [notesRes, typesRes] = await Promise.all([notesApi.list(), notesApi.getTypes()]);
      setNotes(Array.isArray(notesRes.data) ? notesRes.data : []);
      setTypes(Array.isArray(typesRes.data) ? typesRes.data : []);
    } catch {
      toast({ title: t("ls_notes_error_loading_archive"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, []);

  /* Mutations */
  const toggleFavorite = async (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, favorite: !n.favorite } : n)));
    try {
      const { data } = await notesApi.toggleFavorite(noteId);
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, favorite: !!data.favorite } : n))
      );
    } catch {
      setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, favorite: !n.favorite } : n)));
      toast({ title: t("ls_notes_error_favorite"), variant: "destructive" });
    }
  };

  const handleCreate = () => {
    void createNote();
  };


  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await notesApi.delete(pendingDelete.id);
      setNotes((prev) => prev.filter((n) => n.id !== pendingDelete.id));
      applyUsageDelta({ notesCount: -1 });
      void refresh();
    } catch {
      toast({ title: t("ls_notes_error_deleting"), variant: "destructive" });
    } finally {
      setPendingDelete(null);
    }
  };

  /* Multiselect */
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    if (selectMode && selectedIds.size === 0) {
      setSelectMode(false);
    }
  }, [selectMode, selectedIds]);

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const confirmBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkDeleting(true);
    try {
      await Promise.all(ids.map((id) => notesApi.delete(id)));
      setNotes((prev) => prev.filter((n) => !selectedIds.has(n.id)));
      applyUsageDelta({ notesCount: -ids.length });
      void refresh();
      toast({ title: t(ids.length === 1 ? "notes_bulk_removed_one" : "notes_bulk_removed", { n: ids.length }) || `${ids.length} removed` });
      exitSelectMode();
    } catch {
      toast({ title: t("ls_notes_error_deleting_entries"), variant: "destructive" });
    } finally {
      setBulkDeleting(false);
      setBulkDeleteOpen(false);
    }
  };

  const applyBulkType = async (newType: string) => {
    const ids = Array.from(selectedIds);
    const clean = (newType || "").trim();
    if (ids.length === 0 || !clean || bulkTypeApplying) return;
    const idSet = new Set(ids);
    const previousNotes = notes;
    setBulkTypeApplying(true);
    setNotes((prev) => prev.map((n) => (idSet.has(n.id) ? { ...n, type: clean } : n)));
    setTypes((prev) => (prev.includes(clean) ? prev : [...prev, clean].sort((a, b) => a.localeCompare(b))));
    try {
      await notesApi.bulkUpdateType(ids, clean);
      toast({ title: t("notes_bulk_type_applied", { n: ids.length }) || `${ids.length} updated` });
      exitSelectMode();
      void fetchData();
    } catch (e) {
      console.error("[Notes] bulk type error", e);
      setNotes(previousNotes);
      const details = (e as any)?.response?.data?.message || (e as any)?.response?.data?.error || (e as Error)?.message;
      toast({ title: t("ls_notes_error_updating_type"), description: details || t("ls_notes_error_updating_type_desc"), variant: "destructive" });
      void fetchData();
    } finally {
      setBulkTypeApplying(false);
    }
  };



  /* Filter + group */
  const counts = useMemo(() => {
    const now = Date.now();
    return {
      all: notes.length,
      favorites: notes.filter((n) => n.favorite).length,
      recent: notes.filter((n) => now - new Date(n.updatedAt).getTime() < RECENT_WINDOW).length,
      archived: notes.filter((n) => now - new Date(n.updatedAt).getTime() > ARCHIVE_WINDOW).length,
      byType: types.reduce<Record<string, number>>((acc, t) => {
        acc[t] = notes.filter((n) => n.type === t).length;
        return acc;
      }, {}),
    };
  }, [notes, types]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const q = search.trim().toLowerCase();
    return notes
      .filter((n) => {
        if (selectedType && n.type !== selectedType) return false;
        const age = now - new Date(n.updatedAt).getTime();
        if (view === "favorites" && !n.favorite) return false;
        if (view === "recent" && age >= RECENT_WINDOW) return false;
        if (view === "archived" && age <= ARCHIVE_WINDOW) return false;
        if (q) {
          const hay = `${n.title} ${extractPreview(n.content)}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(sortBy === "createdAt" ? a.createdAt : a.updatedAt).getTime();
        const dateB = new Date(sortBy === "createdAt" ? b.createdAt : b.updatedAt).getTime();
        return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
      });
  }, [notes, view, selectedType, search, sortBy, sortOrder]);

  const grouped = useMemo(() => {
    const map = new Map<string, NoteSummary[]>();
    for (const n of filtered) {
      const targetDate = sortBy === "createdAt" ? n.createdAt : n.updatedAt;
      const key = monthKey(new Date(targetDate));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(n);
    }
    return Array.from(map.entries());
  }, [filtered, sortBy]);

  const toggleMonth = (key: string) => {
    setCollapsedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  /* Drag-drop */
  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      await vaultApi.upload(form);
      toast({ title: t("ls_notes_sent_to_vault"), description: file.name });
    } catch {
      toast({ title: t("ls_notes_upload_failed"), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };
  const dragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
  };
  const dragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  if (authLoading) {
    return (
      <AppLayout>
        <div className="mx-auto w-full max-w-5xl animate-fade-in px-4 py-8 sm:px-6">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-4 h-9 w-56" />
          <SkeletonList rows={7} className="mt-8" />
        </div>
      </AppLayout>
    );
  }

  const limitMsg = getLimitMessage("notes");
  const viewLabel =
    view === "all"
      ? t("notes_view_archive")
      : view === "favorites"
        ? t("notes_view_favorites")
        : view === "recent"
          ? t("notes_view_recent")
          : t("notes_view_dormant");

  const SidebarContent = (
    <div className="space-y-7">
      <div>
        <p className="mb-3 text-[10px] uppercase tracking-[0.32em] text-white/30">{t("notes_index")}</p>
        <div className="space-y-0.5">
          <NavItem label={t("notes_archive")} count={counts.all} active={view === "all"} onClick={() => { setView("all"); setFilterDrawerOpen(false); }} />
          <NavItem label={t("notes_recent")} count={counts.recent} active={view === "recent"} onClick={() => { setView("recent"); setFilterDrawerOpen(false); }} />
          <NavItem label={t("notes_favorites")} count={counts.favorites} active={view === "favorites"} onClick={() => { setView("favorites"); setFilterDrawerOpen(false); }} />
          <NavItem label={t("notes_dormant")} count={counts.archived} active={view === "archived"} onClick={() => { setView("archived"); setFilterDrawerOpen(false); }} />
        </div>
      </div>

      {types.length > 0 && (
        <div>
          <p className="mb-3 text-[10px] uppercase tracking-[0.32em] text-white/30">{t("notes_types")}</p>
          <div className="space-y-0.5">
            <NavItem
              label={t("notes_allTypes")}
              count={counts.all}
              active={!selectedType}
              onClick={() => { setSelectedType(null); setFilterDrawerOpen(false); }}
            />
            {types.map((tp) => (
              <NavItem
                key={tp}
                label={tp}
                count={counts.byType[tp] || 0}
                active={selectedType === tp}
                onClick={() => { setSelectedType(tp); setFilterDrawerOpen(false); }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <AppLayout>
      <div
        className="relative min-h-full"
        onDragEnter={dragOver}
        onDragOver={dragOver}
        onDragLeave={dragLeave}
        onDrop={handleFileDrop}
        onTouchStart={onSwipeStart}
        onTouchEnd={onSwipeEnd}
      >
        {dragActive && (
          <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="rounded-md border border-dashed border-white/30 px-10 py-8 text-center">
              <Upload className="mx-auto mb-3 h-6 w-6 text-white/70" />
              <p className="text-sm text-white/80">{t("notes_dropToVault")}</p>
            </div>
          </div>
        )}
        {uploading && (
          <div className="fixed right-4 top-4 z-50 flex items-center gap-2 rounded-md border border-white/10 bg-black/90 px-3 py-2 text-[11px] text-white/70 backdrop-blur-xl">
            <Loader2 className="h-3 w-3 animate-spin" /> {t("notes_uploading")}
          </div>
        )}

        {/* Edge swipe hint (mobile only) */}
        <div
          aria-hidden
          className="pointer-events-none fixed left-0 top-1/2 z-20 hidden h-24 w-[3px] -translate-y-1/2 rounded-r bg-white/15 max-lg:block"
        />

        {/* Mobile filter drawer */}
        <Sheet open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
          <SheetContent side="left" className="w-[280px] border-white/10 bg-black/95 p-6">
            <p className="mb-6 font-serif text-2xl text-white">{t("notes_filters")}</p>
            {SidebarContent}
          </SheetContent>
        </Sheet>

        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-5 lg:flex-row lg:gap-16 lg:px-12 lg:py-16">
          {/* ─── Sidebar (desktop only) ──────────────────────────── */}
          <aside className="hidden lg:sticky lg:top-16 lg:block lg:w-52 lg:shrink-0 lg:self-start">
            {SidebarContent}
          </aside>

          {/* ─── Main ────────────────────────────────────────────── */}
          <main className="min-w-0 flex-1">
            {/* Header (desktop) */}
            <header className="mb-8 hidden lg:block">
              <div className="flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.32em] text-white/30">{viewLabel}</p>
                  <h1 className="mt-2 font-serif text-5xl tracking-tight text-white">{t("notes_title")}</h1>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {selectMode && (
                    <Button size="sm" className="gap-2" onClick={exitSelectMode}>
                      <X className="h-3.5 w-3.5" /> {t("select_done")}
                    </Button>
                  )}
                  <Button onClick={handleCreate} className="gap-2" disabled={creating}>
                    <Plus className="h-3.5 w-3.5" /> {creating ? t("notes_creating") : t("notes_new")}
                  </Button>
                </div>

              </div>
              {limitMsg && <p className="mt-3 text-xs text-white/40">{limitMsg}</p>}
            </header>

            {/* Mobile: search + view chips */}
            <div className="mb-5 space-y-3 lg:hidden">
              {selectMode && (
                <Button size="sm" className="gap-2" onClick={exitSelectMode}>
                  <X className="h-3.5 w-3.5" /> {t("select_done")}
                </Button>
              )}
              <div className="relative z-0">

                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("notes_searchAmong", { n: counts.all }) || `Search among ${counts.all} notes…`}
                  className="h-12 w-full rounded-2xl bg-accent pl-11 text-[15px] placeholder:italic placeholder:text-muted-foreground"
                />
              </div>
              <FilterChips
                value={view}
                onChange={(v) => setView(v as View)}
                options={[
                  { value: "all", label: t("notes_archive") },
                  { value: "recent", label: t("notes_recent") },
                  { value: "favorites", label: t("notes_favorites") },
                  { value: "archived", label: t("notes_dormant") },
                ]}
              />
            </div>

            {/* Sticky search (desktop) */}
            <div className="sticky top-14 z-10 -mx-4 hidden border-b border-white/10 bg-black/70 px-4 py-3 backdrop-blur-xl lg:block">
              <div className="relative">
                <Search className="pointer-events-none absolute left-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                <Input
                  variant="ghost"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("notes_searchPlaceholder")}
                  className="w-full border-0 bg-transparent pl-6 text-sm text-white placeholder:italic placeholder:text-white/30 focus:outline-none focus:ring-0"
                />
              </div>
            </div>


            {/* Toolbar de Contagem e Controles de Ordenação */}
            <div className="flex items-center justify-between border-b border-white/5 pb-3 pt-4 mb-6 text-[11px] text-white/40">
              <div>
                {t(filtered.length === 1 ? "list_showing_entries_one" : "list_showing_entries", { n: filtered.length })}
              </div>
              <div className="flex items-center gap-4 font-mono">
                <div className="flex items-center gap-1.5">
                  <span>{t("list_sortBy")}</span>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="normal-case text-white/70 hover:text-white transition-colors"
                    onClick={() => setSortBy(sortBy === "createdAt" ? "updatedAt" : "createdAt")}
                  >
                    [{sortBy === "createdAt" ? t("list_sort_creation") : t("list_sort_modification")}]
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="normal-case flex items-center gap-1.5 text-white/70 hover:text-white transition-colors"
                  onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
                >
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m3 16 4 4 4-4" /><path d="M7 20V4" /><path d="m21 8-4-4-4 4" /><path d="M17 4v16" />
                  </svg>
                  {sortOrder === "desc" ? t("list_sort_recent") : t("list_sort_oldest")}
                </Button>
              </div>
            </div>

            {/* Selection action bar */}
            {selectMode && (
              <div className="sticky top-[7.5rem] z-20 mb-6 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-white/15 bg-black/80 px-3 py-2.5 backdrop-blur-xl">
                <span className="text-sm text-white/70">
                  {t("select_selected", { n: selectedIds.size })}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="normal-case px-3 py-1.5 text-xs text-white/70 hover:border-white/40 hover:text-white"
                    onClick={() => {
                      const allIds = filtered.map((n) => n.id);
                      const allSelected = allIds.every((id) => selectedIds.has(id));
                      setSelectedIds(allSelected ? new Set() : new Set(allIds));
                    }}
                  >
                    {filtered.length > 0 && filtered.every((n) => selectedIds.has(n.id)) ? t("select_clearAll") : t("select_all")}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={selectedIds.size === 0 || bulkTypeApplying}
                        className="normal-case inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/80"
                      >
                        {bulkTypeApplying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Tag className="h-3.5 w-3.5" />} {t("notes_set_type") || "Set type"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[180px]">
                      {types.map((tp) => (
                        <DropdownMenuItem key={tp} onSelect={() => applyBulkType(tp)}>
                          {tp}
                        </DropdownMenuItem>
                      ))}
                      {types.length > 0 && <DropdownMenuSeparator />}
                      <DropdownMenuItem
                        onSelect={() => {
                          const v = window.prompt(t("notes_new_type_prompt") || "New type name");
                          if (v && v.trim()) applyBulkType(v.trim());
                        }}
                      >
                        {t("notes_new_type") || "New type…"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="normal-case inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
                    onClick={() => setBulkDeleteOpen(true)}
                    disabled={selectedIds.size === 0}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> {t("common_delete")}
                  </Button>
                </div>
              </div>
            )}

            {/* Content */}

            {loading ? (
              <SkeletonList rows={8} className="py-6" />
            ) : grouped.length === 0 ? (
              <div className="py-24 text-center">
                <p className="font-serif text-2xl italic text-white/40">
                  {search
                    ? t("notes_empty_search")
                    : view === "favorites"
                      ? t("notes_empty_favorites")
                      : view === "recent"
                        ? t("notes_empty_recent")
                        : view === "archived"
                          ? t("notes_empty_archived")
                          : t("notes_empty_all")}
                </p>
              </div>
            ) : (
              <div className="space-y-12">
                {grouped.map(([key, items]) => {
                  const collapsed = collapsedMonths.has(key);
                  return (
                    <section key={key}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="group mb-5 flex w-full items-center justify-between border-b border-white/10 pb-2 text-left normal-case"
                        onClick={() => toggleMonth(key)}
                      >
                        <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.32em] text-white/40 group-hover:text-white/70">
                          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          {formatMonth(key)}
                        </span>
                        <span className="font-mono text-[10px] text-white/30 tabular-nums">
                          {t(items.length === 1 ? "list_showing_entries_one" : "list_showing_entries", { n: items.length })}
                        </span>
                      </Button>

                      {!collapsed && (
                        <ul className="divide-y divide-white/[0.06]">
                          {items.map((note) => {
                            const preview = extractPreview(note.content);
                            const targetDate = sortBy === "createdAt" ? note.createdAt : note.updatedAt;

                            const selected = selectedIds.has(note.id);
                            return (
                              <NoteRow
                                key={note.id}
                                selectMode={selectMode}
                                selected={selected}
                                onLongPress={() => { setSelectMode(true); toggleSelect(note.id); }}
                                onOpen={() => selectMode ? toggleSelect(note.id) : navigate(`/notes/${note.id}`)}
                              >
                                  <span
                                    aria-hidden
                                    className="absolute left-0 top-1/2 h-8 w-px -translate-x-3 -translate-y-1/2 bg-white opacity-0 transition-opacity group-hover:opacity-100"
                                  />

                                  {selectMode && (
                                    <span
                                      className={cn(
                                        "mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-sm border transition-colors",
                                        selected ? "border-white bg-white text-black" : "border-white/30 text-transparent"
                                      )}
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                    </span>
                                  )}

                                  <ListRowContent
                                    icon={<StickyNote className="h-5 w-5" />}
                                    title={note.title || t("notes_untitled")}
                                    meta={
                                      <>
                                        {note.type ? `${note.type} · ` : ""}
                                        {relativeDate(targetDate)}
                                        {preview ? ` · ${preview}` : ""}
                                      </>
                                    }
                                  />


                                  {!selectMode && (
                                  <div className="flex shrink-0 items-center gap-1 pt-1">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className={cn(
                                        "transition-colors p-1.5 opacity-70 hover:opacity-100",
                                        note.favorite ? "text-white" : "text-white"
                                      )} 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFavorite(note.id, e);
                                      }}
                                      aria-label={note.favorite ? t("notes_unfavorite") : t("notes_favorite")}
                                    >
                                      {note.favorite ? (
                                        <BookmarkCheck className="h-3 w-3 fill-current" />
                                      ) : (
                                        <Bookmark className="h-3 w-3" />
                                      )}
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="text-white transition p-1.5 opacity-70 hover:opacity-100"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        setPendingDelete(note);
                                      }}
                                      aria-label={t("common_delete")}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                    <InsightSignalBadge kind="note" id={note.id} />
                                  </div>
                                  )}
                                  {selectMode && (
                                    <span
                                      className={cn(
                                        "mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-sm border transition-colors",
                                        selected ? "border-white bg-white text-black" : "border-white/30 text-transparent"
                                      )}
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                    </span>
                                  )}
                              </NoteRow>
                            );
                          })}
                        </ul>
                      )}
                    </section>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>

      <FloatingCreateButton
        label={creating ? t("notes_creating") : t("notes_new")}
        disabled={creating}
        onClick={handleCreate}
        icon={<Plus className="h-4 w-4" />}
      />

      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} reason={t("notes_limit")} />

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={t("notes_remove_one_title")}
        description={
          pendingDelete
            ? t("notes_remove_one_desc", { title: pendingDelete.title || t("notes_untitled") })
            : t("ls_notes_action_cannot_be_undone")
        }
        confirmText={t("notes_remove")}
        destructive
        onConfirm={confirmDelete}
      />
      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={(open) => !open && !bulkDeleting && setBulkDeleteOpen(false)}
        title={t(selectedIds.size === 1 ? "notes_remove_many_title_one" : "notes_remove_many_title", { n: selectedIds.size })}
        description={t("notes_remove_many_desc")}
        confirmText={bulkDeleting ? t("notes_removing") : t("notes_remove")}
        destructive
        onConfirm={confirmBulkDelete}
      />
    </AppLayout>
  );
}
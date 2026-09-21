import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { entitiesApi } from "@/lib/api";
import { usePlanGate } from "@/hooks/usePlanGate";
import { useCachedResource } from "@/hooks/useCachedResource";
import { qk, STALE } from "@/lib/queries";
import UpgradeModal from "@/components/UpgradeModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreateEntityDialog } from "@/components/CreateEntityDialog";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Plus,
  Search,
  Loader2,
  Trash2,
  SlidersHorizontal,
  Check,
  X,
} from "@/lib/heroicons";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { FilterChips } from "@/components/ui/filter-chips";
import { FitText } from "@/components/ui/fit-text";
import { ListRowContent } from "@/components/ui/list-row-content";
import { EntityTypeIcon } from "@/components/ui/entity-type-icon";
import { FloatingCreateButton } from "@/components/ui/floating-create-button";

import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useLongPress } from "@/hooks/useLongPress";
import type { EntityType } from "@/types";

interface Entity {
  id: string;
  title: string;
  type: EntityType;
  description?: string;
  createdAt: string;
  updatedAt?: string; // Adicionado para suportar ordenação por modificação
  trackingDates?: string[];
}

const typeLabels: Record<string, string> = {
  PERSON: "Person",
  PROJECT: "Project",
  TOPIC: "Topic",
  ORGANIZATION: "Organization",
  ACTIVITY: "Activity",
};

const types = ["PERSON", "PROJECT", "TOPIC", "ORGANIZATION", "ACTIVITY"];

/* ── Helpers ──────────────────────────────────────────────────────────── */

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
        active ? "text-foreground" : "text-muted-foreground hover:text-muted-foreground"
      )}
      onClick={onClick}
    >
      <span className="flex items-center gap-2">
        <span
          aria-hidden
          className={cn(
            "h-px w-3 transition-all",
            active ? "bg-foreground w-5" : "bg-foreground/20 group-hover:bg-foreground/40"
          )}
        />
        {label}
      </span>
      <span className={cn("font-mono text-[10px] tabular-nums", active ? "text-muted-foreground" : "text-muted-foreground")}>
        {count}
      </span>
    </Button>
  );
}

/* ── Row with long-press → select ────────────────────────────────────── */
interface EntityRowProps {
  selectMode: boolean;
  selected: boolean;
  onLongPress: () => void;
  onOpen: () => void;
  children: React.ReactNode;
}
function EntityRow({ selectMode, selected, onLongPress, onOpen, children }: EntityRowProps) {
  const press = useLongPress({ onLongPress, onClick: onOpen });
  return (
    <li>
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
          "group relative flex w-full cursor-pointer select-none items-start gap-4 py-5 text-left transition-colors hover:bg-foreground/[0.02] focus:outline-none",
          selected && "bg-foreground/[0.04]"
        )}
      >
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-8 w-px -translate-x-3 -translate-y-1/2 bg-foreground opacity-0 transition-opacity group-hover:opacity-100"
        />
        {children}
      </div>
    </li>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */

export default function Entities() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refresh: refreshUsage, applyUsageDelta } = usePlanGate();

  const [entities, setEntities] = useState<Entity[]>([]);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  
  // Estados de Ordenação
  const [sortBy, setSortBy] = useState<"createdAt" | "updatedAt">("createdAt");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  
  const [createOpen, setCreateOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [pendingDeleteEntity, setPendingDeleteEntity] = useState<Entity | null>(null);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // Multiselect
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Controle de Swipe Lateral para Mobile
  const swipeRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const onSwipeStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (t.clientX > 160) return;
    swipeRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };
  const onSwipeEnd = (e: React.TouchEvent) => {
    const s = swipeRef.current;
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = Math.abs(t.clientY - s.y);
    if (dx > 28 && dy < 100 && Date.now() - s.t < 1000) setFilterDrawerOpen(true);
    swipeRef.current = null;
  };


  /* Carregar Dados — cache primeiro, revalida em segundo plano */
  const entitiesQuery = useCachedResource<Entity[]>(
    qk.entities(),
    async () => {
      const res = await entitiesApi.list();
      return Array.isArray(res.data) ? (res.data as Entity[]) : [];
    },
    { staleTime: STALE.list }
  );
  const loading =
    entitiesQuery.loading ||
    (entitiesQuery.data !== undefined && entities.length === 0 && entitiesQuery.data.length > 0);

  useEffect(() => {
    if (entitiesQuery.data) setEntities(entitiesQuery.data);
  }, [entitiesQuery.data]);

  /* Deletar */
  const handleDelete = (e: React.MouseEvent, entity: Entity) => {
    e.stopPropagation();
    setPendingDeleteEntity(entity);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteEntity) return;
    const deletedEntity = pendingDeleteEntity;
    setEntities((prev) => prev.filter((x) => x.id !== deletedEntity.id));
    entitiesQuery.setData((prev) => (prev ?? []).filter((x) => x.id !== deletedEntity.id));
    try {
      await entitiesApi.delete(deletedEntity.id);
      applyUsageDelta({ entitiesCount: -1, activitiesCount: deletedEntity.type === "ACTIVITY" ? -1 : 0 });
      void refreshUsage();
    } catch {
      setEntities((prev) => [deletedEntity, ...prev]);
      entitiesQuery.setData((prev) => [deletedEntity, ...(prev ?? [])]);
      toast({ title: t("ls_entities_error_deleting"), variant: "destructive" });
    } finally {
      setPendingDeleteEntity(null);
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
    const targets = entities.filter((e) => selectedIds.has(e.id));
    if (targets.length === 0) return;
    setEntities((prev) => prev.filter((e) => !selectedIds.has(e.id)));
    entitiesQuery.setData((prev) => (prev ?? []).filter((e) => !selectedIds.has(e.id)));
    setBulkDeleting(true);
    try {
      await Promise.all(targets.map((e) => entitiesApi.delete(e.id)));
      const activities = targets.filter((e) => e.type === "ACTIVITY").length;
      applyUsageDelta({ entitiesCount: -targets.length, activitiesCount: -activities });
      void refreshUsage();
      toast({ title: t(targets.length === 1 ? "entities_countRemoved_one" : "entities_countRemoved", { n: targets.length }) });
      exitSelectMode();
    } catch {
      setEntities((prev) => [...targets, ...prev]);
      entitiesQuery.setData((prev) => [...targets, ...(prev ?? [])]);
      toast({ title: t("ls_entities_error_deleting_many"), variant: "destructive" });
    } finally {
      setBulkDeleting(false);
      setBulkDeleteOpen(false);
    }
  };



  /* Contadores da Barra Lateral */
  const counts = useMemo(() => {
    return {
      all: entities.length,
      byType: types.reduce<Record<string, number>>((acc, t) => {
        acc[t] = entities.filter((e) => e.type === t).length;
        return acc;
      }, {}),
    };
  }, [entities]);

  /* Filtragem e Ordenação Dinâmica */
  const filteredAndSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entities
      .filter((e) => {
        if (selectedType && e.type !== selectedType) return false;
        if (q) {
          const hay = `${e.title} ${e.description || ""} ${typeLabels[e.type] || ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(sortBy === "updatedAt" ? (a.updatedAt || a.createdAt) : a.createdAt).getTime();
        const dateB = new Date(sortBy === "updatedAt" ? (b.updatedAt || b.createdAt) : b.createdAt).getTime();
        return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
      });
  }, [entities, selectedType, search, sortBy, sortOrder]);

  const SidebarContent = (
    <div className="space-y-7">
      <div>
        <p className="mb-3 text-[10px] uppercase tracking-[0.32em] text-muted-foreground">{t("notes_index")}</p>
        <div className="space-y-0.5">
          <NavItem
            label={t("entities_all")}
            count={counts.all}
            active={!selectedType}
            onClick={() => { setSelectedType(null); setFilterDrawerOpen(false); }}
          />
        </div>
      </div>

      <div>
        <p className="mb-3 text-[10px] uppercase tracking-[0.32em] text-muted-foreground">{t("notes_types")}</p>
        <div className="space-y-0.5">
          {types.map((tp) => (
            <NavItem
              key={tp}
              label={t(`entities_type_${tp}`) ?? typeLabels[tp]}
              count={counts.byType[tp] || 0}
              active={selectedType === tp}
              onClick={() => { setSelectedType(tp); setFilterDrawerOpen(false); }}
            />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div
        className="relative min-h-full"
      >
        {/* Indicador visual lateral para mobile */}
        <div
          aria-hidden
          className="pointer-events-none fixed left-0 top-1/2 z-20 hidden h-24 w-[3px] -translate-y-1/2 rounded-r bg-foreground/15"
        />

        {/* Menu Lateral Mobile */}
        <Sheet open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
          <SheetContent side="left" className="w-[280px] border-border/10 bg-background/95 p-6">
            <p className="mb-6 font-serif text-2xl text-foreground">{t("notes_filters")}</p>
            {SidebarContent}
          </SheetContent>
        </Sheet>

        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-5 lg:flex-row lg:gap-16 lg:px-12 lg:py-16">
          {/* Sidebar Desktop */}
          <aside className="hidden lg:sticky lg:top-16 lg:block lg:w-52 lg:shrink-0 lg:self-start">
            {SidebarContent}
          </aside>

          {/* Conteúdo Principal */}
          <main className="min-w-0 flex-1">
            {/* Header (desktop) */}
            <header className="mb-8 hidden lg:block">
              <div className="flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
                    {selectedType ? (t(`entities_type_${selectedType}`) ?? typeLabels[selectedType]) : t("entities_allAtoms")}
                  </p>
                  <h1 className="mt-2 font-serif text-5xl tracking-tight text-foreground">{t("entities_title")}</h1>
                  <p className="mt-2 text-sm text-muted-foreground">{t("entities_tagline")}</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {selectMode && (
                    <Button size="sm" className="gap-2" onClick={exitSelectMode}>
                      <X className="h-3.5 w-3.5" /> {t("select_done")}
                    </Button>
                  )}
                  <Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
                    <Plus className="h-3.5 w-3.5" /> {t("entities_new")}
                  </Button>
                </div>

              </div>
            </header>

            {/* Mobile: search + type chips */}
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
                  placeholder={t("entities_searchAmong", { n: counts.all }) || `Search among ${counts.all} entities…`}
                  className="h-12 w-full rounded-2xl bg-accent pl-11 text-[15px] placeholder:italic placeholder:text-muted-foreground"
                />
              </div>
              <FilterChips
                value={selectedType ?? "ALL"}
                onChange={(v) => setSelectedType(v === "ALL" ? null : v)}
                options={[
                  { value: "ALL", label: t("entities_all") },
                  ...types.map((tp) => ({
                    value: tp,
                    label: t(`entities_type_${tp}`) ?? typeLabels[tp],
                  })),
                ]}
              />
            </div>

            {/* Input de Busca Fixo (desktop) */}
            <div className="sticky top-14 z-10 -mx-4 hidden border-b border-border/10 bg-background/70 px-4 py-3 backdrop-blur-xl lg:block">
              <div className="relative">
                <Search className="pointer-events-none absolute left-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  variant="ghost"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("common_search") + "…"}
                  className="w-full border-0 bg-transparent pl-6 text-sm text-foreground placeholder:italic placeholder:text-muted-foreground focus:outline-none focus:ring-0"
                />
              </div>
            </div>


            {/* Barra de ferramentas: Contagem e Controles de Ordenação */}
            <div className="flex items-center justify-between border-b border-border/5 pb-3 pt-4 mb-6 text-[11px] text-muted-foreground">
              <div>
                {t(filteredAndSorted.length === 1 ? "list_showing_atoms_one" : "list_showing_atoms", { n: filteredAndSorted.length })}
              </div>
              <div className="flex items-center gap-4 font-mono">
                {/* Tipo de Ordenação */}
                <div className="flex items-center gap-1.5">
                  <span>{t("list_sortBy")}</span>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="normal-case text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setSortBy(sortBy === "createdAt" ? "updatedAt" : "createdAt")}
                  >
                    [{sortBy === "createdAt" ? t("list_sort_creation") : t("list_sort_modification")}]
                  </Button>
                </div>
                {/* Direção da Ordenação */}
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="normal-case flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
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
              <div className="sticky top-[7.5rem] z-20 mb-6 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border/15 bg-background/80 px-3 py-2.5 backdrop-blur-xl">
                <span className="text-sm text-muted-foreground">{t("select_selected", { n: selectedIds.size })}</span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="normal-case px-3 py-1.5 text-xs text-muted-foreground hover:border-border/40 hover:text-foreground"
                    onClick={() => {
                      const allIds = filteredAndSorted.map((e) => e.id);
                      const allSelected = allIds.every((id) => selectedIds.has(id));
                      setSelectedIds(allSelected ? new Set() : new Set(allIds));
                    }}
                  >
                    {filteredAndSorted.length > 0 && filteredAndSorted.every((e) => selectedIds.has(e.id)) ? t("select_clearAll") : t("select_all")}
                  </Button>
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

            {/* Listagem Contínua */}

            {loading ? (
              <div className="space-y-3 py-6">
                {Array.from({ length: 8 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 w-full" />
                ))}
              </div>
            ) : filteredAndSorted.length === 0 ? (
              <div className="py-24 text-center">
                <p className="font-serif text-2xl italic text-muted-foreground">
                  {search ? t("entities_empty_search") : t("entities_empty_all")}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border/10">
                {filteredAndSorted.map((entity) => {
                  const targetDate = sortBy === "updatedAt" ? (entity.updatedAt || entity.createdAt) : entity.createdAt;
                  const selected = selectedIds.has(entity.id);
                  return (
                    <EntityRow
                      key={entity.id}
                      selectMode={selectMode}
                      selected={selected}
                      onLongPress={() => {
                        setSelectMode(true);
                        setSelectedIds((prev) => new Set(prev).add(entity.id));
                      }}
                      onOpen={() =>
                        selectMode ? toggleSelect(entity.id) : navigate(`/entities/${entity.id}`)
                      }
                    >
                      {selectMode && (
                        <span
                          className={cn(
                            "mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-sm border transition-colors",
                            selected ? "border-border/10 bg-foreground text-background" : "border-border/30 text-transparent"
                          )}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      )}

                      <ListRowContent
                        icon={<EntityTypeIcon type={entity.type} className="h-5 w-5" />}
                        title={entity.title || t("notes_untitled")}
                        meta={
                          <>
                            {t(`entities_type_${entity.type}`) ?? typeLabels[entity.type] ?? entity.type}
                            {" · "}
                            {relativeDate(targetDate)}
                            {entity.description ? ` · ${entity.description}` : ""}
                          </>
                        }
                      />


                      {!selectMode && (
                        <div className="flex shrink-0 items-center gap-1 pt-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground opacity-0 transition hover:text-muted-foreground group-hover:opacity-100 p-1.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(e, entity);
                            }}
                            aria-label={t("common_delete")}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </EntityRow>
                  );
                })}
              </ul>
            )}
          </main>
        </div>
      </div>

      <FloatingCreateButton
        label={t("entities_new")}
        onClick={() => setCreateOpen(true)}
        icon={<Plus className="h-4 w-4" />}
      />


      <CreateEntityDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultType={(selectedType as EntityType) || "TOPIC"}
        onCreated={(entity) => {
          const resolvedEntity = entity as Entity & { _optimisticId?: string };
          if (resolvedEntity._optimisticId) {
            const { _optimisticId, ...serverEntity } = resolvedEntity;
            setEntities((prev) => prev.map((item) => item.id === _optimisticId ? serverEntity : item));
            entitiesQuery.setData((prev) => (prev ?? []).map((item) => item.id === _optimisticId ? serverEntity : item));
            return;
          }
          setEntities((prev) => [...prev, resolvedEntity]);
          entitiesQuery.setData((prev) => [...(prev ?? []), resolvedEntity]);
        }}
        onCreationFailed={(entityId) => {
          setEntities((prev) => prev.filter((entity) => entity.id !== entityId));
          entitiesQuery.setData((prev) => (prev ?? []).filter((entity) => entity.id !== entityId));
        }}
      />
      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        reason={t("entities_limit")}
      />
      <ConfirmDialog
        open={!!pendingDeleteEntity}
        onOpenChange={(open) => !open && setPendingDeleteEntity(null)}
        title={t("entities_delete_one_title")}
        description={
          pendingDeleteEntity
            ? t("entities_delete_one_desc", { title: pendingDeleteEntity.title || t("notes_untitled") })
            : ""
        }
        confirmText={t("common_delete")}
        destructive
        onConfirm={confirmDelete}
      />
      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={(open) => !open && !bulkDeleting && setBulkDeleteOpen(false)}
        title={t(selectedIds.size === 1 ? "entities_delete_many_title_one" : "entities_delete_many_title", { n: selectedIds.size })}
        description={t("entities_delete_many_desc")}
        confirmText={bulkDeleting ? t("entities_deleting") : t("common_delete")}
        destructive
        onConfirm={confirmBulkDelete}
      />
    </AppLayout>
  );
}
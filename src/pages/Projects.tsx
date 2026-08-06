import { useCallback, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { TimeTrackingList } from "@/components/TimeTrackingList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Plus } from "@/lib/heroicons";
import { FloatingCreateButton } from "@/components/ui/floating-create-button";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Projects() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"createdAt" | "updatedAt">("updatedAt");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [createOpen, setCreateOpen] = useState(false);
  const [total, setTotal] = useState(0);
  const handleCount = useCallback((n: number) => setTotal(n), []);

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl px-6 py-6 lg:px-12 lg:py-16">
        <main className="min-w-0 flex-1">
          <header className="mb-8 hidden lg:block">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.32em] text-white/30">Tracking</p>
              <h1 className="mt-2 font-serif text-5xl tracking-tight text-white">{t("projects_title")}</h1>
            </div>
            <p className="mt-3 text-sm text-white/40">{t("projects_subtitle")}</p>
          </header>

          {/* Mobile search */}
          <div className="mb-5 lg:hidden">
            <div className="relative z-0">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("projects_searchAmong", { n: total })}
                className="h-12 w-full rounded-2xl bg-accent pl-11 text-[15px] placeholder:italic placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="sticky top-14 z-10 -mx-4 hidden border-b border-white/10 bg-black/70 px-4 py-3 backdrop-blur-xl lg:block">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-0">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("projects_searchAmong", { n: total })}
                  variant="ghost"
                  className="pl-6 text-sm text-white placeholder:italic placeholder:text-white/30"
                />
              </div>
              <Button className="gap-2" onClick={() => setCreateOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                {t("projects_new")}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-end border-b border-white/5 pb-3 pt-4 mb-6 text-[11px] text-white/40">
            <div className="flex items-center gap-4 font-mono">
              <div className="flex items-center gap-1.5">
                <span>Sort by:</span>
                <Button
                  variant="link"
                  size="sm"
                  className="text-white/70 hover:text-white"
                  onClick={() => setSortBy(sortBy === "createdAt" ? "updatedAt" : "createdAt")}
                >
                  [{sortBy === "createdAt" ? "Creation" : "Modification"}]
                </Button>
              </div>
              <Button
                variant="link"
                size="sm"
                className="flex items-center gap-1.5 text-white/70 hover:text-white"
                onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m3 16 4 4 4-4" /><path d="M7 20V4" /><path d="m21 8-4-4-4 4" /><path d="M17 4v16" />
                </svg>
                {sortOrder === "desc" ? "Recent" : "Oldest"}
              </Button>
            </div>
          </div>

          <TimeTrackingList
            filterType="PROJECT"
            search={search}
            sortBy={sortBy}
            sortOrder={sortOrder}
            hideInternalSearch={true}
            createOpen={createOpen}
            onCreateOpenChange={setCreateOpen}
            onCountChange={handleCount}
          />
        </main>
      </div>

      <FloatingCreateButton
        label={t("projects_new")}
        onClick={() => setCreateOpen(true)}
        icon={<Plus className="h-4 w-4" />}
      />
    </AppLayout>
  );
}

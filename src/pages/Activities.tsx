import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { TimeTrackingList } from "@/components/TimeTrackingList";
import { Button } from "@/components/ui/button";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Plus } from "@/lib/heroicons";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Activities() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"createdAt" | "updatedAt">("updatedAt");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl px-6 py-10 lg:px-12 lg:py-16">
        <main className="min-w-0 flex-1">
          <header className="mb-8">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.32em] text-white/30">Tracking</p>
              <h1 className="mt-2 font-serif text-5xl tracking-tight text-white">{t("activities_title")}</h1>
            </div>
            <p className="mt-3 text-sm text-white/40">Track your daily activities and task history.</p>
          </header>

          <div className="sticky top-14 z-10 -mx-4 border-b border-white/10 bg-black/70 px-4 py-3 backdrop-blur-xl">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-0">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("common_search") + "…"}
                  className="w-full border-0 bg-transparent pl-6 text-sm text-white placeholder:italic placeholder:text-white/30 focus:outline-none focus:ring-0"
                />
              </div>
              <Button className="gap-2" onClick={() => setCreateOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                {t("activities_new")}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-end border-b border-white/5 pb-3 pt-4 mb-6 text-[11px] text-white/40">
            <div className="flex items-center gap-4 font-mono">
              <div className="flex items-center gap-1.5">
                <span>Sort by:</span>
                <button
                  onClick={() => setSortBy(sortBy === "createdAt" ? "updatedAt" : "createdAt")}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  [{sortBy === "createdAt" ? "Creation" : "Modification"}]
                </button>
              </div>
              <button
                onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
                className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors"
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m3 16 4 4 4-4" /><path d="M7 20V4" /><path d="m21 8-4-4-4 4" /><path d="M17 4v16" />
                </svg>
                {sortOrder === "desc" ? "Recent" : "Oldest"}
              </button>
            </div>
          </div>

          <TimeTrackingList
            filterType="ACTIVITY"
            search={search}
            sortBy={sortBy}
            sortOrder={sortOrder}
            hideInternalSearch={true}
            createOpen={createOpen}
            onCreateOpenChange={setCreateOpen}
          />
        </main>
      </div>
    </AppLayout>
  );
}

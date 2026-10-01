import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { notesApi } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";

interface BacklinkItem {
  id: string;
  title: string;
  snippet?: string;
}
interface BacklinksData {
  linkedMentions: BacklinkItem[];
  unlinkedMentions: BacklinkItem[];
}
interface BacklinksPanelProps {
  noteId: string;
}

function Section({ label, items, kind }: { label: string; items: BacklinkItem[]; kind: "linked" | "unlinked" }) {
  const { t } = useLanguage();
  if (items.length === 0) return null;
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between border-b border-border/10 pb-2">
        <p className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground">{label}</p>
        <p className="font-mono text-[10px] text-muted-foreground tabular-nums">{items.length}</p>
      </div>
      <ul className="divide-y divide-border/10">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              to={`/notes/${item.id}`}
              className="group block py-3 transition-colors hover:bg-foreground/[0.02]"
            >
              <div className="flex items-start gap-2">
                <span
                  aria-hidden
                  className={`mt-2 h-px w-3 shrink-0 transition-all ${
                    kind === "linked" ? "bg-foreground/60 group-hover:w-5" : "bg-foreground/20 group-hover:w-5"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-sm text-muted-foreground group-hover:text-foreground">
                    {item.title || t("ent_untitled")}
                  </p>
                  {item.snippet && (
                    <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-muted-foreground">
                      {item.snippet}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function BacklinksPanel({ noteId }: BacklinksPanelProps) {
  const { t } = useLanguage();
  const [data, setData] = useState<BacklinksData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!noteId) return;
    setLoading(true);
    notesApi
      .getBacklinks(noteId)
      .then((res) => {
        setData({
          linkedMentions: Array.isArray(res.data?.linkedMentions) ? res.data.linkedMentions : [],
          unlinkedMentions: Array.isArray(res.data?.unlinkedMentions) ? res.data.unlinkedMentions : [],
        });
      })
      .catch(() => setData({ linkedMentions: [], unlinkedMentions: [] }))
      .finally(() => setLoading(false));
  }, [noteId]);

  if (loading) {
    return (
      <div className="space-y-4 p-5">
        <Skeleton className="h-3 w-20 bg-foreground/5" />
        <Skeleton className="h-10 w-full bg-foreground/5" />
        <Skeleton className="h-10 w-full bg-foreground/5" />
      </div>
    );
  }

  const linked = data?.linkedMentions || [];
  const unlinked = data?.unlinkedMentions || [];
  const isEmpty = linked.length === 0 && unlinked.length === 0;

  return (
    <div className="space-y-8 p-5">
      {isEmpty ? (
        <div className="py-12 text-center">
          <p className="font-serif text-base italic text-muted-foreground">
            {t("ent_nothing_references")}
          </p>
        </div>
      ) : (
        <>
          <Section label={t("ent_linked")} items={linked} kind="linked" />
          <Section label={t("ent_unlinked")} items={unlinked} kind="unlinked" />
        </>
      )}
    </div>
  );
}

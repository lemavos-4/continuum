import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { notesApi } from "@/lib/api";

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
  if (items.length === 0) return null;
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <p className="text-[10px] uppercase tracking-[0.32em] text-white/40">{label}</p>
        <p className="font-mono text-[10px] text-white/30 tabular-nums">{items.length}</p>
      </div>
      <ul className="divide-y divide-white/[0.05]">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              to={`/notes/${item.id}`}
              className="group block py-3 transition-colors hover:bg-white/[0.02]"
            >
              <div className="flex items-start gap-2">
                <span
                  aria-hidden
                  className={`mt-2 h-px w-3 shrink-0 transition-all ${
                    kind === "linked" ? "bg-white/60 group-hover:w-5" : "bg-white/20 group-hover:w-5"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-sm text-white/90 group-hover:text-white">
                    {item.title || "Untitled"}
                  </p>
                  {item.snippet && (
                    <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-white/40">
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
        <Skeleton className="h-3 w-20 bg-white/5" />
        <Skeleton className="h-10 w-full bg-white/5" />
        <Skeleton className="h-10 w-full bg-white/5" />
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
          <p className="font-serif text-base italic text-white/40">
            Nothing references this note yet.
          </p>
        </div>
      ) : (
        <>
          <Section label="Linked" items={linked} kind="linked" />
          <Section label="Unlinked" items={unlinked} kind="unlinked" />
        </>
      )}
    </div>
  );
}

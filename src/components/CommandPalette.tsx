import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { StickyNote, Network, Plus, Search } from "@/lib/heroicons";
import { searchApi, notesApi } from "@/lib/api";
import { tiptapContentToPlainText } from "@/lib/tiptap-content";
import { qk } from "@/lib/queries";
import { queryClient } from "@/lib/query-client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface SearchResult {
  id: string;
  type: "NOTE" | "ENTITY";
  title: string;
  snippet?: string;
}

interface CachedNote {
  id?: unknown;
  title?: unknown;
  content?: unknown;
}

function getCachedNoteResults(query: string): SearchResult[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return [];

  const cachedNotes = new Map<string, CachedNote>();
  const addNotes = (value: unknown) => {
    if (!Array.isArray(value)) return;
    value.forEach((note) => {
      if (!note || typeof note !== "object" || typeof (note as CachedNote).id !== "string") return;
      cachedNotes.set((note as CachedNote).id as string, note as CachedNote);
    });
  };

  addNotes(queryClient.getQueryData<unknown>(qk.notes()));
  queryClient.getQueriesData<unknown>({ queryKey: ["notes", "detail"] }).forEach(([, data]) => {
    if (data && typeof data === "object" && !Array.isArray(data)) addNotes([data]);
  });

  return Array.from(cachedNotes.values()).flatMap((note) => {
    const title = typeof note.title === "string" ? note.title : "";
    const content = tiptapContentToPlainText(note.content);
    const searchable = `${title} ${content}`.toLocaleLowerCase();
    if (!searchable.includes(normalizedQuery) || typeof note.id !== "string") return [];

    const matchIndex = content.toLocaleLowerCase().indexOf(normalizedQuery);
    const snippet = matchIndex >= 0
      ? `${matchIndex > 40 ? "..." : ""}${content.slice(Math.max(0, matchIndex - 40), matchIndex + normalizedQuery.length + 80)}${content.length > matchIndex + normalizedQuery.length + 80 ? "..." : ""}`
      : undefined;
    return [{ id: note.id, type: "NOTE" as const, title, snippet }];
  });
}

function mergeSearchResults(remote: SearchResult[], cached: SearchResult[]): SearchResult[] {
  const merged = new Map<string, SearchResult>();
  [...remote, ...cached].forEach((result) => {
    const key = `${result.type}:${result.id}`;
    const previous = merged.get(key);
    merged.set(key, previous?.snippet ? previous : result);
  });
  return Array.from(merged.values()).slice(0, 10);
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  // Cmd/Ctrl + K listener
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Search on query change
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await searchApi.search(query);
        const remoteResults = Array.isArray(data) ? data : [];
        setResults(mergeSearchResults(remoteResults, getCachedNoteResults(query)));
      } catch (err) {
        console.error("Search error:", err);
        const cachedResults = getCachedNoteResults(query);
        setResults(cachedResults);
        if (cachedResults.length === 0) {
          toast({ title: t("ed_search_failed"), description: t("ed_search_failed_desc"), variant: "destructive" });
        }
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      setOpen(false);
      setQuery("");
      if (result.type === "NOTE") navigate(`/notes/${result.id}`);
      else navigate(`/entities/${result.id}`);
    },
    [navigate]
  );

  const handleCreateNote = useCallback(async () => {
    try {
      const { data } = await notesApi.create(query || "New Note", "");
      setOpen(false);
      setQuery("");
      navigate(`/notes/${data.id}`);
    } catch {
      toast({ title: t("ed_create_note_failed"), variant: "destructive" });
    }
  }, [query, navigate, toast]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
      <CommandInput
        placeholder={t("ed_search_placeholder")}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {loading ? t("ed_searching") : t("ed_no_results_found")}
        </CommandEmpty>

        {/* Quick actions */}
        <CommandGroup heading={t("ed_actions")}>
          <CommandItem onSelect={handleCreateNote}>
            <Plus className="mr-2 h-4 w-4" />
            <span>{t("ed_create_new_note")}{query ? `: "${query}"` : ""}</span>
          </CommandItem>
        </CommandGroup>

        {/* Results */}
        {results.length > 0 && (
          <CommandGroup heading={t("ed_results")}>
            {results.map((r) => (
              <CommandItem
                key={`${r.type}-${r.id}`}
                onSelect={() => handleSelect(r)}
              >
                {r.type === "NOTE" ? (
                  <StickyNote className="mr-2 h-4 w-4 text-primary" />
                ) : (
                  <Network className="mr-2 h-4 w-4 text-muted-foreground" />
                )}
                <div className="flex flex-col">
                  <span className="text-sm">{r.title}</span>
                  {r.snippet && (
                    <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                      {r.snippet}
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}

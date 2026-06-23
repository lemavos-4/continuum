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
import { useToast } from "@/hooks/use-toast";

interface SearchResult {
  id: string;
  type: "NOTE" | "ENTITY";
  title: string;
  snippet?: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

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
        setResults(Array.isArray(data) ? data.slice(0, 10) : []);
      } catch (err) {
        console.error("Search error:", err);
        toast({ title: "Search failed", description: "Unable to perform search. Check your connection or API.", variant: "destructive" });
        setResults([]);
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
      toast({ title: "Failed to create note", variant: "destructive" });
    }
  }, [query, navigate, toast]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search notes, entities, or create..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {loading ? "Searching..." : "No results found."}
        </CommandEmpty>

        {/* Quick actions */}
        <CommandGroup heading="Actions">
          <CommandItem onSelect={handleCreateNote}>
            <Plus className="mr-2 h-4 w-4" />
            <span>Create new note{query ? `: "${query}"` : ""}</span>
          </CommandItem>
        </CommandGroup>

        {/* Results */}
        {results.length > 0 && (
          <CommandGroup heading="Results">
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

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface SearchState {
  query: string;
  caseSensitive: boolean;
  regex: boolean;
  current: number;
  total: number;
  results: { from: number; to: number }[];
}

export const searchPluginKey = new PluginKey<SearchState>("search-highlight");

function findMatches(doc: any, query: string, caseSensitive: boolean, regex: boolean) {
  const results: { from: number; to: number }[] = [];
  if (!query) return results;
  let re: RegExp;
  try {
    re = regex
      ? new RegExp(query, caseSensitive ? "g" : "gi")
      : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), caseSensitive ? "g" : "gi");
  } catch {
    return results;
  }
  doc.descendants((node: any, pos: number) => {
    if (!node.isText) return;
    const text = node.text || "";
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      if (m[0].length === 0) {
        re.lastIndex++;
        continue;
      }
      results.push({ from: pos + m.index, to: pos + m.index + m[0].length });
    }
  });
  return results;
}

function buildDecorations(results: { from: number; to: number }[], current: number) {
  return DecorationSet.create(
    { content: { size: 0 } } as any,
    [] // placeholder; overwritten below
  );
}

export const SearchHighlight = Extension.create({
  name: "searchHighlight",
  addProseMirrorPlugins() {
    return [
      new Plugin<SearchState>({
        key: searchPluginKey,
        state: {
          init: () => ({
            query: "",
            caseSensitive: false,
            regex: false,
            current: 0,
            total: 0,
            results: [],
          }),
          apply(tr, prev) {
            const meta = tr.getMeta(searchPluginKey);
            if (meta) {
              const next = { ...prev, ...meta };
              if (meta.query !== undefined || meta.caseSensitive !== undefined || meta.regex !== undefined) {
                const results = findMatches(tr.doc, next.query, next.caseSensitive, next.regex);
                next.results = results;
                next.total = results.length;
                next.current = results.length ? Math.min(next.current || 0, results.length - 1) : 0;
              }
              return next;
            }
            if (tr.docChanged && prev.query) {
              const results = findMatches(tr.doc, prev.query, prev.caseSensitive, prev.regex);
              return {
                ...prev,
                results,
                total: results.length,
                current: results.length ? Math.min(prev.current, results.length - 1) : 0,
              };
            }
            return prev;
          },
        },
        props: {
          decorations(state) {
            const s = searchPluginKey.getState(state);
            if (!s || !s.results.length) return DecorationSet.empty;
            const decos = s.results.map((r, i) =>
              Decoration.inline(r.from, r.to, {
                class: i === s.current ? "search-hit search-hit-current" : "search-hit",
              })
            );
            return DecorationSet.create(state.doc, decos);
          },
        },
      }),
    ];
  },
});

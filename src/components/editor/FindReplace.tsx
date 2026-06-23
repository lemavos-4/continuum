import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { searchPluginKey } from "./extensions/SearchHighlight";

interface Props {
  editor: Editor | null;
  open: boolean;
  onClose: () => void;
}

export function FindReplace({ editor, open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [replace, setReplace] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [regex, setRegex] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [meta, setMeta] = useState({ current: 0, total: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 30);
    } else if (editor) {
      editor.view.dispatch(editor.state.tr.setMeta(searchPluginKey, { query: "" }));
    }
  }, [open, editor]);

  useEffect(() => {
    if (!editor) return;
    editor.view.dispatch(
      editor.state.tr.setMeta(searchPluginKey, { query, caseSensitive, regex, current: 0 })
    );
  }, [query, caseSensitive, regex, editor]);

  useEffect(() => {
    if (!editor) return;
    const update = () => {
      const s = searchPluginKey.getState(editor.state);
      if (s) setMeta({ current: s.current, total: s.total });
    };
    update();
    editor.on("update", update);
    editor.on("transaction", update);
    return () => {
      editor.off("update", update);
      editor.off("transaction", update);
    };
  }, [editor]);

  const scrollToCurrent = (idx: number) => {
    if (!editor) return;
    const s = searchPluginKey.getState(editor.state);
    if (!s || !s.results[idx]) return;
    editor.view.dispatch(editor.state.tr.setMeta(searchPluginKey, { current: idx }));
    const dom = editor.view.domAtPos(s.results[idx].from).node as HTMLElement;
    const el = dom.nodeType === 1 ? dom : dom.parentElement;
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  const next = (back = false) => {
    if (!editor) return;
    const s = searchPluginKey.getState(editor.state);
    if (!s || !s.total) return;
    const idx = back ? (s.current - 1 + s.total) % s.total : (s.current + 1) % s.total;
    scrollToCurrent(idx);
  };

  const replaceAll = () => {
    if (!editor || !query) return;
    const s = searchPluginKey.getState(editor.state);
    if (!s) return;
    const tr = editor.state.tr;
    [...s.results].reverse().forEach((r) => tr.insertText(replace, r.from, r.to));
    editor.view.dispatch(tr);
  };

  if (!open) return null;

  return (
    <div className="fixed top-20 right-6 z-50 flex flex-col gap-1.5 rounded-xl border border-white/10 bg-black/95 backdrop-blur-xl shadow-2xl px-2.5 py-2 w-[340px]">
      <div className="flex items-center gap-1.5">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              next(e.shiftKey);
            } else if (e.key === "Escape") {
              e.preventDefault();
              onClose();
            }
          }}
          placeholder="Find"
          className="flex-1 bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <span className="text-[10px] text-white/50 tabular-nums whitespace-nowrap">
          {meta.total ? `${meta.current + 1}/${meta.total}` : "0/0"}
        </span>
        <button onClick={() => next(true)} className="text-xs px-1.5 py-1 rounded hover:bg-white/10 text-white/70" title="Previous (Shift+Enter)">↑</button>
        <button onClick={() => next()} className="text-xs px-1.5 py-1 rounded hover:bg-white/10 text-white/70" title="Next (Enter)">↓</button>
        <button onClick={onClose} className="text-xs px-1.5 py-1 rounded hover:bg-white/10 text-white/70" title="Close (Esc)">×</button>
      </div>
      <div className="flex items-center gap-1 text-[10px]">
        <button onClick={() => setCaseSensitive((v) => !v)} className={`px-1.5 py-0.5 rounded ${caseSensitive ? "bg-primary/30 text-primary" : "text-white/50 hover:bg-white/10"}`} title="Case sensitive">Aa</button>
        <button onClick={() => setRegex((v) => !v)} className={`px-1.5 py-0.5 rounded ${regex ? "bg-primary/30 text-primary" : "text-white/50 hover:bg-white/10"}`} title="Regex">.*</button>
        <button onClick={() => setShowReplace((v) => !v)} className="px-1.5 py-0.5 rounded text-white/50 hover:bg-white/10 ml-auto">
          {showReplace ? "− Replace" : "+ Replace"}
        </button>
      </div>
      {showReplace && (
        <div className="flex items-center gap-1.5">
          <input
            value={replace}
            onChange={(e) => setReplace(e.target.value)}
            placeholder="Replace with"
            className="flex-1 bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button onClick={replaceAll} className="text-[10px] px-2 py-1 rounded bg-primary/20 text-primary hover:bg-primary/30">All</button>
        </div>
      )}
    </div>
  );
}

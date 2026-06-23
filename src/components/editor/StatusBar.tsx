import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";

interface Props {
  editor: Editor | null;
}

export function StatusBar({ editor }: Props) {
  const [stats, setStats] = useState({ words: 0, chars: 0, line: 1, col: 1, readMin: 0 });

  useEffect(() => {
    if (!editor) return;
    const update = () => {
      const text = editor.getText();
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      const chars = text.length;
      const readMin = Math.max(1, Math.round(words / 200));

      const { from } = editor.state.selection;
      const before = editor.state.doc.textBetween(0, from, "\n");
      const lines = before.split("\n");
      const line = lines.length;
      const col = (lines[lines.length - 1]?.length ?? 0) + 1;

      setStats({ words, chars, line, col, readMin });
    };
    update();
    editor.on("update", update);
    editor.on("selectionUpdate", update);
    return () => {
      editor.off("update", update);
      editor.off("selectionUpdate", update);
    };
  }, [editor]);

  return (
    <div className="flex items-center gap-3 text-[10px] text-white/40 px-3 py-1.5 border-t border-white/5 bg-black/40 backdrop-blur tabular-nums">
      <span>{stats.words} words</span>
      <span className="text-white/20">·</span>
      <span>{stats.chars} chars</span>
      <span className="text-white/20">·</span>
      <span>Ln {stats.line}, Col {stats.col}</span>
      <span className="text-white/20 ml-auto">·</span>
      <span>{stats.readMin} min read</span>
    </div>
  );
}

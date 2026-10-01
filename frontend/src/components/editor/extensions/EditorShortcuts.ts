import { Extension } from "@tiptap/core";

interface ShortcutOptions {
  onSave?: () => void;
  onFind?: () => void;
}

export const EditorShortcuts = Extension.create<ShortcutOptions>({
  name: "editorShortcuts",
  addOptions() {
    return { onSave: undefined, onFind: undefined };
  },
  addKeyboardShortcuts() {
    return {
      "Mod-s": () => {
        this.options.onSave?.();
        return true;
      },
      "Mod-f": () => {
        this.options.onFind?.();
        return true;
      },
      "Mod-Shift-s": () => this.editor.chain().focus().toggleStrike().run(),
      "Mod-Shift-k": () => {
        const { from, to, $from } = this.editor.state.selection;
        if (from !== to) return false;
        const start = $from.start($from.depth);
        const end = $from.end($from.depth);
        this.editor.chain().focus().deleteRange({ from: start - 1 < 0 ? 0 : start, to: end + 1 > this.editor.state.doc.content.size ? end : end + 1 }).run();
        return true;
      },
      "Mod-Shift-d": () => {
        const { $from } = this.editor.state.selection;
        const node = $from.node($from.depth);
        if (!node) return false;
        const start = $from.before($from.depth);
        const end = $from.after($from.depth);
        const slice = this.editor.state.doc.slice(start, end);
        this.editor
          .chain()
          .focus()
          .insertContentAt(end, slice.toJSON().content)
          .run();
        return true;
      },
      "Alt-ArrowUp": () => {
        return (this.editor.commands as any).first(({ commands }: any) => [
          () => commands.liftListItem?.("listItem"),
          () => commands.liftListItem?.("taskItem"),
        ]) || moveBlock(this.editor, -1);
      },
      "Alt-ArrowDown": () => {
        return moveBlock(this.editor, 1);
      },
    };
  },
});

function moveBlock(editor: any, dir: -1 | 1): boolean {
  const { state } = editor;
  const { $from } = state.selection;
  const depth = 1;
  const blockStart = $from.before(depth);
  const blockEnd = $from.after(depth);
  const block = state.doc.slice(blockStart, blockEnd);

  if (dir === -1) {
    if (blockStart === 0) return false;
    const prevBlockEnd = blockStart;
    const $prev = state.doc.resolve(prevBlockEnd - 1);
    const prevStart = $prev.before($prev.depth);
    const prev = state.doc.slice(prevStart, prevBlockEnd);
    const tr = state.tr.replaceWith(prevStart, blockEnd, [
      ...block.content.content,
      ...prev.content.content,
    ]);
    editor.view.dispatch(tr.scrollIntoView());
    return true;
  } else {
    if (blockEnd >= state.doc.content.size) return false;
    const $next = state.doc.resolve(blockEnd + 1);
    const nextEnd = $next.after($next.depth);
    const next = state.doc.slice(blockEnd, nextEnd);
    const tr = state.tr.replaceWith(blockStart, nextEnd, [
      ...next.content.content,
      ...block.content.content,
    ]);
    editor.view.dispatch(tr.scrollIntoView());
    return true;
  }
}

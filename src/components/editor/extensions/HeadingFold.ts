import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { EditorState } from "@tiptap/pm/state";

interface FoldState {
  folded: number[];
}

export const headingFoldKey = new PluginKey<FoldState>("headingFold");

/** Maps folded doc positions to heading ordinals (0-based, top-level order). */
function foldedToIndices(state: EditorState, folded: number[]): number[] {
  const out: number[] = [];
  let ordinal = 0;
  state.doc.forEach((node, offset) => {
    if (node.type.name === "heading") {
      if (folded.includes(offset)) out.push(ordinal);
      ordinal += 1;
    }
  });
  return out.sort((a, b) => a - b);
}

/** Maps heading ordinals back to doc positions. */
function indicesToFolded(state: EditorState, indices: number[]): number[] {
  const wanted = new Set(indices);
  const out: number[] = [];
  let ordinal = 0;
  state.doc.forEach((node, offset) => {
    if (node.type.name === "heading") {
      if (wanted.has(ordinal)) out.push(offset);
      ordinal += 1;
    }
  });
  return out;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    headingFold: {
      setFoldedHeadings: (indices: number[]) => ReturnType;
    };
  }
}

/**
 * Collapsible headings ("drawer" behaviour).
 * Clicking the chevron rendered next to a heading hides every following
 * top-level block until a heading of the same or higher rank is found.
 */
export const HeadingFold = Extension.create<{
  onFoldChange?: (indices: number[]) => void;
}>({
  name: "headingFold",

  addOptions() {
    return { onFoldChange: undefined };
  },

  addCommands() {
    return {
      setFoldedHeadings:
        (indices: number[]) =>
        ({ state, dispatch, tr }) => {
          if (dispatch) {
            dispatch(tr.setMeta(headingFoldKey, { set: indicesToFolded(state, indices) }));
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;
    return [
      new Plugin<FoldState>({
        key: headingFoldKey,
        state: {
          init: () => ({ folded: [] }),
          apply(tr, value) {
            let folded = value.folded;
            if (tr.docChanged) {
              folded = folded.map((pos) => tr.mapping.map(pos, -1));
            }
            const meta = tr.getMeta(headingFoldKey) as
              | { toggle?: number; clear?: boolean; set?: number[] }
              | undefined;
            if (meta?.clear) return { folded: [] };
            if (Array.isArray(meta?.set)) return { folded: [...meta.set] };
            if (typeof meta?.toggle === "number") {
              const pos = meta.toggle;
              folded = folded.includes(pos) ? folded.filter((p) => p !== pos) : [...folded, pos];
            }
            return { folded };
          },
        },
        view() {
          return {
            update(view, prevState) {
              const prev = headingFoldKey.getState(prevState)?.folded ?? [];
              const next = headingFoldKey.getState(view.state)?.folded ?? [];
              if (prev.length === next.length && prev.every((p, i) => p === next[i])) return;
              options.onFoldChange?.(foldedToIndices(view.state, next));
            },
          };
        },
        props: {
          decorations(state) {
            const pluginState = headingFoldKey.getState(state);
            if (!pluginState) return DecorationSet.empty;
            const { folded } = pluginState;

            const blocks: { pos: number; end: number; isHeading: boolean; level: number }[] = [];
            state.doc.forEach((node, offset) => {
              const isHeading = node.type.name === "heading";
              blocks.push({
                pos: offset,
                end: offset + node.nodeSize,
                isHeading,
                level: isHeading ? Number(node.attrs.level ?? 1) : 0,
              });
            });

            const decorations: Decoration[] = [];

            blocks.forEach((block, index) => {
              if (!block.isHeading) return;
              const isFolded = folded.includes(block.pos);

              // hidden blocks below the folded heading
              let hiddenCount = 0;
              if (isFolded) {
                for (let i = index + 1; i < blocks.length; i += 1) {
                  const next = blocks[i];
                  if (next.isHeading && next.level <= block.level) break;
                  decorations.push(
                    Decoration.node(next.pos, next.end, { class: "cx-fold-hidden" })
                  );
                  hiddenCount += 1;
                }
                decorations.push(
                  Decoration.node(block.pos, block.end, { class: "cx-heading-folded" })
                );
              }

              decorations.push(
                Decoration.widget(
                  block.pos + 1,
                  (view) => {
                    const btn = document.createElement("button");
                    btn.type = "button";
                    btn.contentEditable = "false";
                    btn.className = `cx-fold-toggle${isFolded ? " is-folded" : ""}`;
                    btn.setAttribute(
                      "aria-label",
                      isFolded ? "Expand section" : "Collapse section"
                    );
                    btn.title = isFolded
                      ? `Expand section${hiddenCount ? ` (${hiddenCount})` : ""}`
                      : "Collapse section";
                    btn.innerHTML =
                      '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M7 5.5l6 4.5-6 4.5z"/></svg>';
                    btn.addEventListener("mousedown", (event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      view.dispatch(view.state.tr.setMeta(headingFoldKey, { toggle: block.pos }));
                    });
                    return btn;
                  },
                  { side: -1, ignoreSelection: true, stopEvent: () => true }
                )
              );
            });

            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});

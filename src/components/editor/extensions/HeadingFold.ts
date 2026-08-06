import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

interface FoldState {
  folded: number[];
}

export const headingFoldKey = new PluginKey<FoldState>("headingFold");

/**
 * Collapsible headings ("drawer" behaviour).
 * Clicking the chevron rendered next to a heading hides every following
 * top-level block until a heading of the same or higher rank is found.
 */
export const HeadingFold = Extension.create({
  name: "headingFold",

  addProseMirrorPlugins() {
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
            const meta = tr.getMeta(headingFoldKey) as { toggle?: number; clear?: boolean } | undefined;
            if (meta?.clear) return { folded: [] };
            if (typeof meta?.toggle === "number") {
              const pos = meta.toggle;
              folded = folded.includes(pos) ? folded.filter((p) => p !== pos) : [...folded, pos];
            }
            return { folded };
          },
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

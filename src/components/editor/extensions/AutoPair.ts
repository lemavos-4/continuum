import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";

const PAIRS: Record<string, string> = {
  "(": ")",
  "[": "]",
  "{": "}",
  '"': '"',
  "'": "'",
  "`": "`",
};

// "wrap-on-selection" pairs (includes markdown wrappers)
const WRAP_PAIRS: Record<string, string> = {
  ...PAIRS,
  "*": "*",
  _: "_",
};

export const AutoPair = Extension.create({
  name: "autoPair",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("auto-pair"),
        props: {
          handleTextInput(view, from, to, text) {
            const { state } = view;
            const { selection } = state;
            const hasSelection = !selection.empty;

            // Wrap selection
            if (hasSelection && WRAP_PAIRS[text]) {
              const close = WRAP_PAIRS[text];
              const selText = state.doc.textBetween(selection.from, selection.to, "\n");
              const tr = state.tr.insertText(`${text}${selText}${close}`, selection.from, selection.to);
              // place cursor inside (after selection text + opening char)
              view.dispatch(tr);
              return true;
            }

            // Auto-close on empty selection
            if (!hasSelection && PAIRS[text]) {
              const close = PAIRS[text];
              const after = state.doc.textBetween(to, Math.min(to + 1, state.doc.content.size));
              // skip over if the same closer is the next char (e.g. typing ) inside ())
              if (text === close && after === close) {
                const tr = state.tr.setSelection(
                  TextSelection.near(state.doc.resolve(to + 1))
                );
                view.dispatch(tr);
                return true;
              }
              const tr = state.tr.insertText(text + close, from, to);
              const newPos = from + 1;
              tr.setSelection(TextSelection.near(tr.doc.resolve(newPos)));
              view.dispatch(tr);
              return true;
            }

            return false;
          },
        },
      }),
    ];
  },
});

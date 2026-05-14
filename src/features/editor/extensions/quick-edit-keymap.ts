import { Prec } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";

export type QuickEditKeymapHandlers = {
  togglePanel: () => void;
};

/**
 * Cursor-style: Mod-k (Cmd-k on macOS, Ctrl-k on Windows/Linux) toggles quick edit when there is a selection.
 */
export function quickEditModKKeymap(handlers: QuickEditKeymapHandlers) {
  return Prec.highest(
    keymap.of([
      {
        key: "Mod-k",
        run: (view: EditorView) => {
          if (view.state.selection.main.empty) return false;
          handlers.togglePanel();
          return true;
        },
      },
    ]),
  );
}

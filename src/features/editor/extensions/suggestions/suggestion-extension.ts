import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
  keymap,
} from "@codemirror/view";
import { Prec, StateEffect, StateField } from "@codemirror/state";
import { fetcher, type SuggestionRequest } from "./suggestion-fetcher";

const setSuggestionEffect = StateEffect.define<string | null>();
const setSuggestionLoadingEffect = StateEffect.define<boolean>();

const suggestionState = StateField.define<string | null>({
  create() {
    return null;
  },
  update(value, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(setSuggestionEffect)) {
        return effect.value;
      }
    }
    if (transaction.docChanged) {
      return null;
    }
    return value;
  },
});

const suggestionLoadingField = StateField.define<boolean>({
  create() {
    return false;
  },
  update(value, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(setSuggestionLoadingEffect)) {
        return effect.value;
      }
    }
    return value;
  },
});

const GHOST_PREVIEW_CHARS = 56;

function acceptSuggestion(view: EditorView): boolean {
  const suggestionText = view.state.field(suggestionState);
  if (!suggestionText) {
    return false;
  }
  const cursor = view.state.selection.main.head;
  view.dispatch({
    changes: { from: cursor, insert: suggestionText },
    selection: { anchor: cursor + suggestionText.length },
    effects: [setSuggestionEffect.of(null), setSuggestionLoadingEffect.of(false)],
  });
  return true;
}

function clearSuggestion(view: EditorView): boolean {
  if (!view.state.field(suggestionState)) {
    return false;
  }
  view.dispatch({
    effects: [setSuggestionEffect.of(null), setSuggestionLoadingEffect.of(false)],
  });
  return true;
}

class SuggestionWidget extends WidgetType {
  constructor(readonly text: string) {
    super();
  }

  eq(other: WidgetType): boolean {
    return other instanceof SuggestionWidget && other.text === this.text;
  }

  toDOM(): HTMLElement {
    const host = document.createElement("span");
    host.className = "cm-merc-suggestion-host";
    host.setAttribute("role", "group");

    const ghost = document.createElement("span");
    ghost.className = "cm-merc-suggestion-ghost";
    ghost.textContent =
      this.text.length > GHOST_PREVIEW_CHARS
        ? `${this.text.slice(0, GHOST_PREVIEW_CHARS)}…`
        : this.text;

    const actions = document.createElement("span");
    actions.className = "cm-merc-suggestion-actions";

    const btnView = document.createElement("button");
    btnView.type = "button";
    btnView.className = "cm-merc-suggestion-btn";
    btnView.textContent = "View";
    btnView.tabIndex = -1;
    btnView.dataset.mercSuggestionAction = "view";
    btnView.setAttribute("aria-label", "View full suggestion");
    btnView.setAttribute("aria-expanded", "false");

    const btnAccept = document.createElement("button");
    btnAccept.type = "button";
    btnAccept.className = "cm-merc-suggestion-btn";
    btnAccept.textContent = "Accept";
    btnAccept.tabIndex = -1;
    btnAccept.dataset.mercSuggestionAction = "accept";
    btnAccept.setAttribute("aria-label", "Insert suggestion at cursor");

    const preview = document.createElement("pre");
    preview.className = "cm-merc-suggestion-preview";
    preview.textContent = this.text;
    preview.hidden = true;

    actions.append(btnView, btnAccept);
    host.append(ghost, actions, preview);
    return host;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

const suggestionChromeTheme = EditorView.theme(
  {
    ".cm-merc-suggestion-host": {
      display: "inline-flex",
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: "6px",
      verticalAlign: "middle",
      marginLeft: "2px",
    },
    ".cm-merc-suggestion-ghost": {
      opacity: "0.42",
      whiteSpace: "pre",
      userSelect: "none",
      fontStyle: "italic",
      fontSize: "12px",
    },
    ".cm-merc-suggestion-actions": {
      display: "inline-flex",
      gap: "3px",
      alignItems: "center",
    },
    ".cm-merc-suggestion-btn": {
      cursor: "pointer",
      fontSize: "10px",
      fontWeight: "600",
      lineHeight: "14px",
      padding: "1px 7px",
      borderRadius: "4px",
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(255,255,255,0.06)",
      color: "rgba(248,250,252,0.92)",
      letterSpacing: "0.02em",
      transition: "background 120ms ease, border-color 120ms ease, color 120ms ease",
    },
    ".cm-merc-suggestion-btn:hover": {
      background: "rgba(255,255,255,0.11)",
      borderColor: "rgba(255,255,255,0.22)",
    },
    ".cm-merc-suggestion-btn:active": {
      background: "rgba(255,255,255,0.16)",
    },
    ".cm-merc-suggestion-btn.cm-merc-suggestion-btn--active": {
      background: "rgba(139,92,246,0.38)",
      borderColor: "rgba(196,181,253,0.45)",
      color: "#fff",
    },
    ".cm-merc-suggestion-preview": {
      flexBasis: "100%",
      width: "100%",
      maxWidth: "min(420px, 70vw)",
      margin: "2px 0 0",
      padding: "6px 8px",
      maxHeight: "min(180px, 40vh)",
      overflow: "auto",
      fontSize: "11px",
      lineHeight: "1.45",
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
      borderRadius: "6px",
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(9,9,11,0.92)",
      color: "rgba(226,232,240,0.96)",
    },
  },
  { dark: true },
);

const suggestionDomHandlers = EditorView.domEventHandlers({
  mousedown(event, view) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return false;
    const btn = target.closest("[data-merc-suggestion-action]");
    if (!(btn instanceof HTMLElement)) return false;
    if (!view.state.field(suggestionState)) return false;

    const action = btn.dataset.mercSuggestionAction;
    if (action === "accept") {
      event.preventDefault();
      btn.classList.add("cm-merc-suggestion-btn--active");
      acceptSuggestion(view);
      return true;
    }

    if (action === "view") {
      event.preventDefault();
      const host = btn.closest(".cm-merc-suggestion-host");
      const preview = host?.querySelector(".cm-merc-suggestion-preview");
      const viewBtn = host?.querySelector('[data-merc-suggestion-action="view"]');
      const acceptBtn = host?.querySelector('[data-merc-suggestion-action="accept"]');
      if (!(preview instanceof HTMLElement)) return true;

      const wasHidden = preview.hidden;
      preview.hidden = !wasHidden;
      const expanded = !preview.hidden;
      btn.setAttribute("aria-expanded", expanded ? "true" : "false");

      if (viewBtn instanceof HTMLElement) {
        viewBtn.classList.toggle("cm-merc-suggestion-btn--active", expanded);
      }
      if (acceptBtn instanceof HTMLElement) {
        acceptBtn.classList.remove("cm-merc-suggestion-btn--active");
      }
      return true;
    }

    return false;
  },
});

function suggestionEffectsInUpdate(update: ViewUpdate): boolean {
  return update.transactions.some((tr) =>
    tr.effects.some(
      (e) => e.is(setSuggestionEffect) || e.is(setSuggestionLoadingEffect),
    ),
  );
}

function createGhostDecorationPlugin() {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet = Decoration.none;

      constructor(view: EditorView) {
        this.decorations = this.build(view);
      }

      update(update: ViewUpdate): void {
        if (
          suggestionEffectsInUpdate(update) ||
          update.docChanged ||
          update.selectionSet
        ) {
          this.decorations = this.build(update.view);
        }
      }

      build(view: EditorView): DecorationSet {
        if (view.state.field(suggestionLoadingField)) {
          return Decoration.none;
        }
        const text = view.state.field(suggestionState);
        if (!text) {
          return Decoration.none;
        }
        const cursor = view.state.selection.main.head;
        return Decoration.set([
          Decoration.widget({
            widget: new SuggestionWidget(text),
            side: 1,
          }).range(cursor),
        ]);
      }
    },
    { decorations: (v) => v.decorations },
  );
}

const DEBOUNCE_DELAY = 300;

function generatePayload(view: EditorView, fileName: string): SuggestionRequest | null {
  const code = view.state.doc.toString();

  if (!code || code.trim().length === 0) {
    return null;
  }

  const cursorPosition = view.state.selection.main.head;
  const currentLine = view.state.doc.lineAt(cursorPosition);
  const cursorInLine = cursorPosition - currentLine.from;

  const previousLines: string[] = [];
  const previousLinesToFetch = Math.min(5, currentLine.number - 1);

  for (let i = previousLinesToFetch; i >= 1; i--) {
    previousLines.push(view.state.doc.line(currentLine.number - i).text);
  }

  const nextLines: string[] = [];
  const totalLines = view.state.doc.lines;
  const linesToFetch = Math.min(5, totalLines - currentLine.number);

  for (let i = 1; i <= linesToFetch; i++) {
    nextLines.push(view.state.doc.line(currentLine.number + i).text);
  }

  return {
    fileName,
    code,
    cursorPosition,
    currentLine: currentLine.text,
    previousLines: previousLines.join("\n"),
    textBeforeCursor: currentLine.text.slice(0, cursorInLine),
    textAfterCursor: currentLine.text.slice(cursorInLine),
    nextLines: nextLines.join("\n"),
    lineNumber: currentLine.number,
  };
}

function createDebouncePlugin(fileName: string) {
  return ViewPlugin.fromClass(
    class {
      /** Timer handle: use `number` because `@types/node` widens `ReturnType<typeof setTimeout>` to `NodeJS.Timeout`. */
      private debounceTimer: number | null = null;
      private currentAbortController: AbortController | null = null;
      private generation = 0;

      constructor(readonly view: EditorView) {
        this.triggerSuggestion();
      }

      update(update: ViewUpdate): void {
        if (update.docChanged || update.selectionSet) {
          this.triggerSuggestion();
        }
      }

      triggerSuggestion(): void {
        if (this.debounceTimer !== null) {
          clearTimeout(this.debounceTimer);
        }

        if (this.currentAbortController !== null) {
          this.currentAbortController.abort();
          this.currentAbortController = null;
          try {
            this.view.dispatch({
              effects: setSuggestionLoadingEffect.of(false),
            });
          } catch {
            /* view may be torn down */
          }
        }

        const gen = ++this.generation;

        this.debounceTimer = window.setTimeout(() => {
          this.debounceTimer = null;
          if (gen !== this.generation) return;

          const payload = generatePayload(this.view, fileName);

          if (!payload) {
            if (gen === this.generation) {
              this.safeDispatch(gen, {
                effects: [
                  setSuggestionLoadingEffect.of(false),
                  setSuggestionEffect.of(null),
                ],
              });
            }
            return;
          }

          this.safeDispatch(gen, {
            effects: setSuggestionLoadingEffect.of(true),
          });

          this.currentAbortController = new AbortController();
          const ac = this.currentAbortController;

          void (async () => {
            try {
              const suggestionText = await fetcher(payload, ac.signal);
              if (gen !== this.generation) return;
              this.safeDispatch(gen, {
                effects: [
                  setSuggestionLoadingEffect.of(false),
                  setSuggestionEffect.of(suggestionText),
                ],
              });
            } catch (e) {
              if (e instanceof DOMException && e.name === "AbortError") {
                return;
              }
              if (gen !== this.generation) return;
              this.safeDispatch(gen, {
                effects: [
                  setSuggestionLoadingEffect.of(false),
                  setSuggestionEffect.of(null),
                ],
              });
            } finally {
              if (this.currentAbortController === ac) {
                this.currentAbortController = null;
              }
            }
          })();
        }, DEBOUNCE_DELAY) as unknown as number;
      }

      private safeDispatch(gen: number, spec: Parameters<EditorView["dispatch"]>[0]): void {
        if (gen !== this.generation) return;
        try {
          this.view.dispatch(spec);
        } catch {
          /* view may be torn down */
        }
      }

      destroy(): void {
        this.generation += 1;
        try {
          this.view.dispatch({
            effects: [
              setSuggestionLoadingEffect.of(false),
              setSuggestionEffect.of(null),
            ],
          });
        } catch {
          /* view may be torn down */
        }
        if (this.debounceTimer !== null) {
          clearTimeout(this.debounceTimer);
        }
        if (this.currentAbortController !== null) {
          this.currentAbortController.abort();
        }
      }
    },
  );
}

const acceptSuggestionKeymap = keymap.of([
  {
    key: "Tab",
    run: (view) => acceptSuggestion(view),
  },
]);

const dismissSuggestionKeymap = keymap.of([
  {
    key: "Escape",
    run: (view) => clearSuggestion(view),
  },
]);

export function suggestion(fileName: string) {
  return [
    suggestionState,
    suggestionLoadingField,
    suggestionChromeTheme,
    suggestionDomHandlers,
    Prec.high(createGhostDecorationPlugin()),
    createDebouncePlugin(fileName),
    /** Above `indentWithTab` from {@link customBasic-setup} so Tab accepts the ghost. */
    Prec.highest(acceptSuggestionKeymap),
    Prec.high(dismissSuggestionKeymap),
  ];
}

import { indentWithTab } from "@codemirror/commands";
import { foldGutter } from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { basicSetup } from "@uiw/codemirror-extensions-basic-setup";

const uiwShell = {
  foldGutter: false,
  syntaxHighlighting: false,
  tabSize: 2,
  crosshairCursor: false,
} as const;

function foldChevron(open: boolean): SVGSVGElement {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("width", "14");
  svg.setAttribute("height", "14");
  svg.setAttribute("viewBox", "0 0 14 14");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(ns, "path");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "1.75");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute(
    "d",
    open ? "M3.5 5.25L7 8.75L10.5 5.25" : "M5.25 3.5L8.75 7L5.25 10.5",
  );
  svg.appendChild(path);
  return svg;
}

function foldMarker(open: boolean): HTMLElement {
  const el = document.createElement("span");
  el.className =
    "cm-fold-marker inline-flex cursor-pointer items-center justify-center p-0.5 opacity-90 hover:opacity-100";
  el.style.color = "var(--muted-foreground)";
  el.title = open ? "Fold line" : "Unfold line";
  el.appendChild(foldChevron(open));
  return el;
}

export function customBasicSetup(): Extension[] {
  return [
    ...basicSetup(uiwShell),
    foldGutter({ markerDOM: foldMarker }),
    keymap.of([indentWithTab]),
    EditorView.lineWrapping,
    EditorView.theme({
      ".cm-scroller": { overflowX: "hidden" },
      ".cm-content": { wordBreak: "break-word" },
    }),
  ];
}

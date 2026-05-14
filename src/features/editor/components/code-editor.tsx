"use client";

import CodeMirror from "@uiw/react-codemirror";
import { color as oneDarkPalette, oneDark } from "@codemirror/theme-one-dark";
import { indentationMarkers } from "@replit/codemirror-indentation-markers";
import type { EditorView, ViewUpdate } from "@codemirror/view";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useUpdateFile } from "@/features/projects/hooks/use-files";
import { customBasicSetup } from "../extensions/custom-basic-setup";
import { getCodeMirrorLanguageExtensions } from "../extensions/language-extensions";
import { minimapExtension } from "../extensions/minimap";
import { quickEditModKKeymap } from "../extensions/quick-edit-keymap";
import { suggestion } from "../extensions/suggestions";
import { QuickEditBar, type QuickEditToolbarPosition } from "./quick-edit-bar";

const SAVE_DEBOUNCE_MS = 1500;
const SELECTION_KEYBOARD_DEBOUNCE_MS = 220;

const shellClassName =
  "flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-md border border-border/80 [&_.cm-editor]:flex [&_.cm-editor]:min-h-0 [&_.cm-editor]:h-full [&_.cm-editor]:flex-1 [&_.cm-editor]:outline-none [&_.cm-scroller]:min-h-0 [&_.cm-scroller]:flex-1 [&_.cm-scroller]:overflow-auto [&_.cm-scroller]:font-mono [&_.cm-scroller]:text-[13px] [&_.cm-scroller]:leading-relaxed";

const mirrorClassName =
  "min-h-0 flex-1 overflow-hidden [&>div]:flex [&>div]:min-h-0 [&>div]:h-full [&>div]:flex-col";

function computeQuickEditAnchor(
  view: EditorView,
  from: number,
  to: number,
): QuickEditToolbarPosition | null {
  const c1 = view.coordsAtPos(from);
  const c2 = view.coordsAtPos(to);
  if (!c1 || !c2) return null;
  const left = Math.min(c1.left, c2.left);
  const right = Math.max(c1.right, c2.right);
  const centerX = (left + right) / 2;
  const barTop = Math.max(c1.bottom, c2.bottom) + 8;
  const popupAnchorTop = Math.min(c1.top, c2.top);
  return { centerX, barTop, popupAnchorTop };
}

type CodeEditorProps = {
  fileId: Id<"files">;
  fileName: string;
  content: string;
  onChange?: (doc: string) => void;
};

export function CodeEditor({
  fileId,
  fileName,
  content,
  onChange: onPersist,
}: CodeEditorProps) {
  const updateFile = useUpdateFile();
  const [value, setValue] = useState(content);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const viewRef = useRef<EditorView | null>(null);
  const primaryMouseButtonDownRef = useRef(false);
  const selectionCommitTimerRef = useRef<number | null>(null);

  const [quickSel, setQuickSel] = useState<{ from: number; to: number } | null>(
    null,
  );
  const [quickPos, setQuickPos] = useState<QuickEditToolbarPosition | null>(
    null,
  );
  const [quickEditPanelOpen, setQuickEditPanelOpen] = useState(false);

  const clearSelectionCommitTimer = useCallback(() => {
    if (selectionCommitTimerRef.current !== null) {
      window.clearTimeout(selectionCommitTimerRef.current);
      selectionCommitTimerRef.current = null;
    }
  }, []);

  const syncSelectionChromeFromView = useCallback(() => {
    const view = viewRef.current;
    if (!view) return;
    const sel = view.state.selection.main;
    if (sel.empty) {
      setQuickSel(null);
      setQuickPos(null);
      setQuickEditPanelOpen(false);
      return;
    }
    const pos = computeQuickEditAnchor(view, sel.from, sel.to);
    if (!pos) {
      setQuickSel(null);
      setQuickPos(null);
      setQuickEditPanelOpen(false);
      return;
    }
    setQuickSel({ from: sel.from, to: sel.to });
    setQuickPos(pos);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current !== undefined) {
        clearTimeout(saveTimerRef.current);
      }
      clearSelectionCommitTimer();
    };
  }, [clearSelectionCommitTimer]);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const t = e.target as Node | null;
      const editorDom = viewRef.current?.dom;
      if (!editorDom || !t || !editorDom.contains(t)) return;
      primaryMouseButtonDownRef.current = true;
      clearSelectionCommitTimer();
      setQuickSel(null);
      setQuickPos(null);
      setQuickEditPanelOpen(false);
    };
    const onMouseUp = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const wasInEditorDrag = primaryMouseButtonDownRef.current;
      primaryMouseButtonDownRef.current = false;
      clearSelectionCommitTimer();
      if (wasInEditorDrag) {
        syncSelectionChromeFromView();
      }
    };
    window.addEventListener("mousedown", onMouseDown, true);
    window.addEventListener("mouseup", onMouseUp, true);
    return () => {
      window.removeEventListener("mousedown", onMouseDown, true);
      window.removeEventListener("mouseup", onMouseUp, true);
    };
  }, [clearSelectionCommitTimer, syncSelectionChromeFromView]);

  /** If panel opens via shortcut before chrome debounce, ensure anchor + range exist. */
  useEffect(() => {
    if (!quickEditPanelOpen) return;
    const view = viewRef.current;
    if (!view) return;
    const sel = view.state.selection.main;
    if (sel.empty) return;
    if (
      quickSel !== null &&
      quickSel.from === sel.from &&
      quickSel.to === sel.to &&
      quickPos !== null
    ) {
      return;
    }
    const pos = computeQuickEditAnchor(view, sel.from, sel.to);
    if (!pos) return;
    setQuickSel({ from: sel.from, to: sel.to });
    setQuickPos(pos);
  }, [quickEditPanelOpen, quickSel, quickPos]);

  const dismissQuickEdit = useCallback(() => {
    setQuickEditPanelOpen(false);
    setQuickSel(null);
    setQuickPos(null);
  }, []);

  const toggleQuickEditPanel = useCallback(() => {
    setQuickEditPanelOpen((open) => !open);
  }, []);

  const handleViewUpdate = useCallback(
    (vu: ViewUpdate) => {
      if (!vu.selectionSet && !vu.docChanged && !vu.focusChanged) return;
      const view = vu.view;
      const sel = view.state.selection.main;
      if (sel.empty) {
        clearSelectionCommitTimer();
        setQuickSel(null);
        setQuickPos(null);
        setQuickEditPanelOpen(false);
        return;
      }

      if (primaryMouseButtonDownRef.current) {
        clearSelectionCommitTimer();
        setQuickSel(null);
        setQuickPos(null);
        setQuickEditPanelOpen(false);
        return;
      }

      clearSelectionCommitTimer();
      selectionCommitTimerRef.current = window.setTimeout(() => {
        selectionCommitTimerRef.current = null;
        syncSelectionChromeFromView();
      }, SELECTION_KEYBOARD_DEBOUNCE_MS);
    },
    [clearSelectionCommitTimer, syncSelectionChromeFromView],
  );

  const extensions = useMemo(
    () => [
      ...getCodeMirrorLanguageExtensions(fileName),
      oneDark,
      ...customBasicSetup(),
      ...suggestion(fileName),
      quickEditModKKeymap({
        togglePanel: toggleQuickEditPanel,
      }),
      ...indentationMarkers({
        highlightActiveBlock: true,
        markerType: "codeOnly",
        colors: {
          dark: "rgba(126, 134, 145, 0.35)",
          activeDark: "rgba(82, 139, 255, 0.55)",
        },
      }),
      minimapExtension,
    ],
    [fileName, toggleQuickEditPanel],
  );

  const queueSave = useCallback(
    (next: string) => {
      if (saveTimerRef.current !== undefined) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(() => {
        void updateFile({ id: fileId, content: next });
        onPersist?.(next);
      }, SAVE_DEBOUNCE_MS);
    },
    [fileId, updateFile, onPersist],
  );

  const handleDocChange = useCallback(
    (doc: string) => {
      setValue(doc);
      queueSave(doc);
    },
    [queueSave],
  );

  const handleReplacementApplied = useCallback(
    (nextFullCode: string) => {
      setValue(nextFullCode);
      queueSave(nextFullCode);
    },
    [queueSave],
  );

  return (
    <div
      className={shellClassName}
      style={{ backgroundColor: oneDarkPalette.background }}
    >
      <CodeMirror
        key={fileId}
        value={value}
        height="100%"
        className={mirrorClassName}
        extensions={extensions}
        onChange={handleDocChange}
        onCreateEditor={(v) => {
          viewRef.current = v;
        }}
        onUpdate={handleViewUpdate}
        theme="none"
        basicSetup={false}
      />
      <QuickEditBar
        fileName={fileName}
        fullCode={value}
        position={quickPos}
        selection={quickSel}
        panelOpen={quickEditPanelOpen}
        onPanelOpenChange={setQuickEditPanelOpen}
        getView={() => viewRef.current}
        onDismiss={dismissQuickEdit}
        onReplacementApplied={handleReplacementApplied}
      />
    </div>
  );
}

"use client";

import type { EditorView } from "@codemirror/view";
import { ArrowUp, ChevronDown, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
}

function addToChatShortcutLabel(): string {
  return isApplePlatform() ? "⌘L" : "Ctrl+L";
}

function quickEditShortcutLabel(): string {
  return isApplePlatform() ? "⌘K" : "Ctrl+K";
}

export type QuickEditToolbarPosition = {
  centerX: number;
  barTop: number;
  popupAnchorTop: number;
};

type QuickEditBarProps = {
  fileName: string;
  fullCode: string;
  position: QuickEditToolbarPosition | null;
  selection: { from: number; to: number } | null;
  panelOpen: boolean;
  onPanelOpenChange: (open: boolean) => void;
  getView: () => EditorView | null;
  onDismiss: () => void;
  onReplacementApplied?: (nextFullCode: string) => void;
};

export function QuickEditBar({
  fileName,
  fullCode,
  position,
  selection,
  panelOpen,
  onPanelOpenChange,
  getView,
  onDismiss,
  onReplacementApplied,
}: QuickEditBarProps) {
  const panelId = useId();
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const instructionRef = useRef<HTMLTextAreaElement | null>(null);

  const visible = position !== null && selection !== null;

  useEffect(() => {
    if (!visible) {
      onPanelOpenChange(false);
      setInstruction("");
      setLoading(false);
    }
  }, [visible, onPanelOpenChange]);

  useEffect(() => {
    if (!panelOpen) return;
    const fn = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        e.stopPropagation();
        onPanelOpenChange(false);
        getView()?.focus();
      }
    };
    window.addEventListener("keydown", fn, true);
    return () => window.removeEventListener("keydown", fn, true);
  }, [panelOpen, onPanelOpenChange, getView]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      if (panelOpen) {
        onPanelOpenChange(false);
        getView()?.focus();
      } else {
        onDismiss();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, panelOpen, onDismiss, onPanelOpenChange, getView]);

  useEffect(() => {
    if (!visible || !panelOpen) return;
    const onPointer = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popupRef.current?.contains(t)) return;
      onPanelOpenChange(false);
      getView()?.focus();
    };
    const id = window.setTimeout(() => {
      document.addEventListener("mousedown", onPointer);
    }, 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [visible, panelOpen, onPanelOpenChange, getView]);

  useEffect(() => {
    if (!panelOpen) return;
    const id = requestAnimationFrame(() => {
      instructionRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [panelOpen]);

  const handleApplyEdit = useCallback(async () => {
    const v = getView();
    const s = selection;
    if (!v || !s) return;
    const trimmed = instruction.trim();
    if (!trimmed) {
      toast.error("Describe the edit");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/editor/quick-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          fileName,
          fullCode,
          selectionFrom: s.from,
          selectionTo: s.to,
          instruction: trimmed,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        replacement?: string;
        error?: string;
      };
      if (!res.ok) {
        toast.error(data.error ?? "Quick edit failed");
        return;
      }
      if (typeof data.replacement !== "string") {
        toast.error("Invalid response");
        return;
      }
      const replacement = data.replacement;
      v.focus();
      v.dispatch({
        changes: { from: s.from, to: s.to, insert: replacement },
        selection: { anchor: s.from + replacement.length },
      });
      onReplacementApplied?.(v.state.doc.toString());
      toast.success("Updated");
      onDismiss();
    } catch {
      toast.error("Request failed");
    } finally {
      setLoading(false);
    }
  }, [fileName, fullCode, getView, instruction, onDismiss, selection, onReplacementApplied]);

  if (!visible || typeof document === "undefined" || !position) {
    return null;
  }

  const { centerX, barTop, popupAnchorTop } = position;
  const barLeft = Math.max(16, Math.min(centerX, window.innerWidth - 16));
  const popupLeft = Math.max(16, Math.min(centerX, window.innerWidth - 16));
  const popupBottomOffset = window.innerHeight - popupAnchorTop + 10;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-200">
      {!panelOpen ? (
        <div
          className="pointer-events-auto absolute flex -translate-x-1/2 items-stretch rounded-lg border border-[#3c3c3c] bg-[#252526] px-1 py-0.5 shadow-[0_4px_24px_rgba(0,0,0,0.55)]"
          style={{ left: barLeft, top: barTop }}
          role="toolbar"
          aria-label="Selection"
        >
          <button
            type="button"
            disabled
            title="Coming soon"
            className="flex cursor-not-allowed items-center gap-2 rounded-md px-3 py-1.5 font-sans text-[13px] text-[#6e6e6e]"
          >
            <span>Add to Chat</span>
            <span className="font-mono text-[11px] text-[#5a5a5a]">
              {addToChatShortcutLabel()}
            </span>
          </button>
          <div className="my-1 w-px shrink-0 bg-[#3e3e42]" aria-hidden />
          <button
            type="button"
            onClick={() => onPanelOpenChange(true)}
            className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 font-sans text-[13px] text-[#e4e4e4] transition-colors hover:bg-[#ffffff0d]"
          >
            <span>Quick Edit</span>
            <span className="font-mono text-[11px] text-[#858585]">
              {quickEditShortcutLabel()}
            </span>
          </button>
        </div>
      ) : null}

      {panelOpen ? (
        <div
          ref={popupRef}
          className={cn(
            "pointer-events-auto absolute flex w-[min(440px,92vw)] -translate-x-1/2 flex-col overflow-hidden rounded-lg border border-[#3c3c3c]",
            "bg-[#1e1e1e] shadow-[0_8px_32px_rgba(0,0,0,0.65)]",
          )}
          style={{ left: popupLeft, bottom: popupBottomOffset }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={panelId}
        >
          <span id={panelId} className="sr-only">
            Quick edit
          </span>
          <div className="relative px-3 pb-1 pt-2">
            <button
              type="button"
              onClick={() => {
                onPanelOpenChange(false);
                getView()?.focus();
              }}
              className="absolute right-2 top-2 rounded p-1 text-[#858585] transition-colors hover:bg-[#ffffff0d] hover:text-[#cccccc]"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
            <textarea
              ref={instructionRef}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void handleApplyEdit();
                }
              }}
              placeholder="Edit selected code"
              rows={2}
              disabled={loading}
              className={cn(
                "min-h-[52px] w-full resize-none bg-transparent pr-8 pt-0.5 font-sans text-[13px] leading-relaxed text-[#cccccc]",
                "placeholder:text-[#6e6e6e] focus:outline-none",
              )}
            />
          </div>

          <div className="flex items-center gap-1 border-t border-[#2a2a2a] px-2 py-2">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
              <button
                type="button"
                className="inline-flex cursor-pointer items-center gap-0.5 rounded px-2 py-1 font-sans text-[12px] text-[#cccccc] transition-colors hover:bg-[#ffffff0d]"
                aria-haspopup="listbox"
                aria-expanded={false}
              >
                Edit Selection
                <ChevronDown className="size-3.5 shrink-0 text-[#858585]" />
              </button>
              <button
                type="button"
                title="Coming soon"
                className="inline-flex cursor-pointer items-center rounded px-2 py-1 font-sans text-[12px] text-[#cccccc] transition-colors hover:bg-[#ffffff0d]"
                onClick={() => toast.info("Quick question — coming soon")}
              >
                Quick question
              </button>
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={() => void handleApplyEdit()}
              className={cn(
                "flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-0",
                "bg-[#2d2d2d] text-[#cccccc] transition-colors hover:bg-[#3c3c3c] hover:text-white",
                "focus-visible:ring-2 focus-visible:ring-[#007fd4] focus-visible:ring-offset-0",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
              aria-label="Apply edit"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <ArrowUp className="size-4" aria-hidden />
              )}
            </button>
          </div>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}

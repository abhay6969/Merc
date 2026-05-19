"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type PreviewTerminalChromeProps = {
  children: ReactNode;
  className?: string;
  title?: string;
};

export function PreviewTerminalChrome({
  children,
  className,
  title = "bash — Mercenary",
}: PreviewTerminalChromeProps) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden bg-[#0c0c0c]",
        className,
      )}
    >
      <div className="flex h-9 shrink-0 items-center gap-3 border-b border-white/[0.08] bg-[#1a1a1a] px-3">
        <div className="flex shrink-0 items-center gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
        </div>
        <span className="min-w-0 flex-1 truncate text-center font-mono text-[11px] font-medium text-white/50">
          {title}
        </span>
        <span className="w-[52px] shrink-0" aria-hidden />
      </div>
      <div className="relative min-h-0 flex-1">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-6 bg-gradient-to-b from-[#0c0c0c]/80 to-transparent" />
        {children}
      </div>
    </div>
  );
}

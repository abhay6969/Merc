"use client";

import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

import "@xterm/xterm/css/xterm.css";

type PreviewTerminalProps = {
  output: string;
  className?: string;
};

export function PreviewTerminal({ output, className }: PreviewTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const writtenLengthRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) {
      return;
    }

    const terminal = new Terminal({
      convertEol: true,
      cursorBlink: false,
      disableStdin: true,
      fontSize: 13,
      fontFamily:
        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      theme: {
        background: "#0a0a0a",
        foreground: "#e5e5e5",
        cursor: "#e5e5e5",
      },
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(container);
    fitAddon.fit();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;
    writtenLengthRef.current = 0;

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        try {
          fitAddon.fit();
        } catch {
          // Container may be hidden during layout transitions.
        }
      });
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
      writtenLengthRef.current = 0;
    };
  }, []);

  useEffect(() => {
    const terminal = terminalRef.current;
    if (terminal === null) {
      return;
    }

    if (output.length < writtenLengthRef.current) {
      terminal.clear();
      writtenLengthRef.current = 0;
    }

    const delta = output.slice(writtenLengthRef.current);
    if (delta.length === 0) {
      return;
    }

    terminal.write(delta);
    writtenLengthRef.current = output.length;

    requestAnimationFrame(() => {
      try {
        fitAddonRef.current?.fit();
      } catch {
        // Ignore fit errors during teardown.
      }
    });
  }, [output]);

  return (
    <div
      ref={containerRef}
      className={cn("h-full w-full min-h-0 bg-[#0a0a0a] p-1", className)}
    />
  );
}

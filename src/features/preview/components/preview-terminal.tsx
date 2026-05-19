"use client";

import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";
import { PreviewTerminalChrome } from "./preview-terminal-chrome";

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
      cursorBlink: true,
      cursorStyle: "bar",
      disableStdin: true,
      fontSize: 12,
      lineHeight: 1.35,
      fontFamily:
        '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      theme: {
        background: "#0c0c0c",
        foreground: "#d4d4d4",
        cursor: "#22c55e",
        cursorAccent: "#0c0c0c",
        selectionBackground: "#264f78",
        black: "#0c0c0c",
        red: "#f14c4c",
        green: "#23d18b",
        yellow: "#f5f543",
        blue: "#3b8eea",
        magenta: "#d670d6",
        cyan: "#29b8db",
        white: "#d4d4d4",
        brightBlack: "#666666",
        brightRed: "#f14c4c",
        brightGreen: "#23d18b",
        brightYellow: "#f5f543",
        brightBlue: "#3b8eea",
        brightMagenta: "#d670d6",
        brightCyan: "#29b8db",
        brightWhite: "#ffffff",
      },
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(container);
    terminal.writeln("\x1b[32m$\x1b[0m mercenary preview — waiting for output…");
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
    <PreviewTerminalChrome className={className}>
      <div
        ref={containerRef}
        className={cn("h-full w-full min-h-0 px-2 pb-2 pt-1")}
      />
    </PreviewTerminalChrome>
  );
}

"use client";

import { Allotment } from "allotment";
import {
  AlertCircle,
  Loader2,
  PanelBottom,
  RefreshCw,
  Settings2,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { PreviewSettingsPopover } from "@/features/preview/components/preview-settings-popover";
import { PreviewTerminal } from "@/features/preview/components/preview-terminal";
import { isCrossOriginIsolatedForPreview } from "@/features/preview/lib/cross-origin-isolation";
import { useWebContainer } from "@/features/preview/hooks/use-webcontainer";
import type { PreviewStatus } from "@/features/preview/types";
import { useFiles } from "@/features/projects/hooks/use-files";
import { useProject } from "@/features/projects/hooks/use-projects";
import { cn } from "@/lib/utils";

import type { Id } from "../../../../convex/_generated/dataModel";

const TERMINAL_MIN = 120;
const TERMINAL_MAX = 480;
const TERMINAL_PREFERRED = 220;

function statusLabel(status: PreviewStatus): string {
  switch (status) {
    case "booting":
      return "Booting WebContainer…";
    case "installing":
      return "Installing dependencies…";
    case "running":
      return "Dev server running";
    case "error":
      return "Preview error";
    default:
      return "Starting preview…";
  }
}

function isLoadingStatus(status: PreviewStatus): boolean {
  return status === "idle" || status === "booting" || status === "installing";
}

type PreviewViewProps = {
  projectId: Id<"project">;
  enabled: boolean;
};

export function PreviewView({ projectId, enabled }: PreviewViewProps) {
  const project = useProject(projectId);
  const files = useFiles(projectId, { skip: !enabled });
  const [terminalVisible, setTerminalVisible] = useState(true);

  const settings = useMemo(
    () => ({
      installCommand: project?.settings?.installCommand,
      devCommand: project?.settings?.devCommand,
    }),
    [project?.settings?.devCommand, project?.settings?.installCommand],
  );

  const { status, previewUrl, error, terminalOutput, restart } = useWebContainer({
    projectId,
    enabled,
    settings,
    files,
  });

  const isolationReady = isCrossOriginIsolatedForPreview();
  const showIframe =
    previewUrl !== null && error === null && status === "running";
  const showLoading =
    enabled && isolationReady && error === null && isLoadingStatus(status);
  const showError = error !== null;
  const showIsolationWarning = enabled && !isolationReady;

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex h-9 shrink-0 items-center gap-2 border-b bg-sidebar px-3">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => restart()}
          title="Restart preview"
        >
          <RefreshCw className="size-4" />
        </Button>

        <span
          className="min-w-0 flex-1 truncate text-xs text-muted-foreground"
          title={previewUrl ?? undefined}
        >
          {previewUrl ?? "No preview URL yet"}
        </span>

        {(showLoading || status === "running") && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {showLoading && (
              <Loader2 className="size-3.5 shrink-0 animate-spin" />
            )}
            <span className="hidden sm:inline">{statusLabel(status)}</span>
          </div>
        )}

        <Button
          type="button"
          variant={terminalVisible ? "secondary" : "ghost"}
          size="icon-sm"
          onClick={() => setTerminalVisible((visible) => !visible)}
          title="Toggle terminal"
        >
          <PanelBottom className="size-4" />
        </Button>

        <PreviewSettingsPopover
          projectId={projectId}
          settings={settings}
          onSaved={() => restart()}
          trigger={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title="Preview settings"
            >
              <Settings2 className="size-4" />
            </Button>
          }
        />
      </header>

      <div className="relative min-h-0 flex-1">
        {files === undefined && enabled && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="size-8 animate-spin" />
            <p className="text-sm">Loading project files…</p>
          </div>
        )}

        {files !== undefined && (
          <Allotment vertical>
            <Allotment.Pane className="min-h-0">
              <div className="relative h-full min-h-0">
                {showIsolationWarning && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-background p-6">
                    <AlertCircle className="size-10 text-amber-500" />
                    <div className="max-w-md space-y-2 text-center">
                      <p className="text-sm font-medium">
                        Preview needs a secure page context
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Hard-refresh this tab (Ctrl+Shift+R) or open the project
                        URL in a new tab. Use Chrome or Edge for large projects.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => window.location.reload()}
                    >
                      <RefreshCw className="size-4" />
                      Reload page
                    </Button>
                  </div>
                )}

                {showLoading && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/90">
                    <Loader2 className="size-10 animate-spin text-primary" />
                    <p className="text-sm font-medium">{statusLabel(status)}</p>
                    <p className="max-w-sm px-6 text-center text-xs text-muted-foreground">
                      Booting an in-browser Node runtime, mounting your project files,
                      and starting the dev server.
                    </p>
                  </div>
                )}

                {showError && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-background p-6">
                    <AlertCircle className="size-10 text-destructive" />
                    <div className="max-w-md space-y-2 text-center">
                      <p className="text-sm font-medium">Preview failed</p>
                      <p className="text-sm text-muted-foreground">{error}</p>
                    </div>
                    <Button type="button" variant="outline" onClick={() => restart()}>
                      <RefreshCw className="size-4" />
                      Restart
                    </Button>
                  </div>
                )}

                {showIframe && (
                  <iframe
                    key={previewUrl}
                    src={previewUrl}
                    title="Project preview"
                    className={cn(
                      "h-full w-full border-0 bg-white",
                      (showLoading || showError) && "invisible",
                    )}
                    allow="cross-origin-isolated"
                  />
                )}

                {!showIframe && !showLoading && !showError && enabled && (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                    Waiting for dev server…
                  </div>
                )}
              </div>
            </Allotment.Pane>

            {terminalVisible && (
              <Allotment.Pane
                minSize={TERMINAL_MIN}
                maxSize={TERMINAL_MAX}
                preferredSize={TERMINAL_PREFERRED}
                className="min-h-0 border-t"
              >
                <PreviewTerminal output={terminalOutput} className="h-full" />
              </Allotment.Pane>
            )}
          </Allotment>
        )}
      </div>
    </div>
  );
}

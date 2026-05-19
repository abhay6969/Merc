"use client";

import { AlertTriangle } from "lucide-react";

import { Id } from "../../../../convex/_generated/dataModel";
import { useFile } from "@/features/projects/hooks/use-files";
import { isTextProjectFile } from "@/features/preview/utils/file-tree";
import { useEditor } from "../hooks/use-editor";
import { CodeEditor } from "./code-editor";
import { EditorFileBreadcrumb } from "./editor-file-breadcrumb";
import { MercLogo } from "./merc-logo";
import { TopNavigation } from "./top-navigation";
import { cn } from "@/lib/utils";

export const EditorView = ({
  projectId,
}: {
  projectId: Id<"project">;
}) => {
  const { activeTab } = useEditor(projectId);
  const file = useFile(activeTab);

  const isBinaryFile =
    activeTab !== null &&
    file !== undefined &&
    file !== null &&
    file.type === "file" &&
    !isTextProjectFile(file);

  const showEditor =
    activeTab !== null &&
    file !== undefined &&
    file !== null &&
    file.type === "file" &&
    isTextProjectFile(file);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex h-9 w-full min-w-0 shrink-0">
        <TopNavigation projectId={projectId} />
      </div>

      {activeTab !== null ? (
        <div className="flex shrink-0 items-center border-b border-border/60 bg-muted/15 px-3 py-2 transition-colors duration-200">
          <EditorFileBreadcrumb fileId={activeTab} />
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {activeTab === null && (
          <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 p-8">
            <MercLogo variant="full" />
          </div>
        )}

        {activeTab !== null && file === undefined && (
          <div className="flex h-full items-center justify-center p-6">
            <p className="text-muted-foreground text-sm">Loading…</p>
          </div>
        )}

        {activeTab !== null && file === null && (
          <div className="flex h-full items-center justify-center p-6">
            <p className="text-muted-foreground text-sm">File not found.</p>
          </div>
        )}

        {isBinaryFile ? (
          <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-4 p-8 text-center">
            <AlertTriangle className="size-10 text-amber-500" />
            <div className="max-w-md space-y-2">
              <p className="text-sm font-medium">Binary or unsupported file</p>
              <p className="text-sm text-muted-foreground">
                This file is not displayed in the text editor because it is
                either binary or uses an unsupported text encoding.
              </p>
            </div>
          </div>
        ) : null}

        {showEditor ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
            <div
              className={cn(
                "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border/70",
                "bg-background shadow-sm",
              )}
            >
              <CodeEditor
                key={activeTab}
                fileId={activeTab}
                fileName={file.name}
                content={file.content ?? ""}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

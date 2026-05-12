"use client";

import { Id } from "../../../../convex/_generated/dataModel";
import { useFile } from "@/features/projects/hooks/use-files";
import { useEditor } from "../hooks/use-editor";
import { TopNavigation } from "./top-navigation";

export const EditorView = ({
  projectId,
}: {
  projectId: Id<"project">;
}) => {
  const { activeTab } = useEditor(projectId);
  const file = useFile(activeTab);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex shrink-0 items-stretch">
        <TopNavigation projectId={projectId} />
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        {activeTab === null && (
          <p className="text-sm text-muted-foreground">
            Choose a file in the sidebar to open it here.
          </p>
        )}
        {activeTab !== null && file === undefined && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
        {activeTab !== null && file === null && (
          <p className="text-sm text-muted-foreground">File not found.</p>
        )}
        {file !== undefined && file !== null && file.type === "file" && (
          <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground">
            {file.content ?? ""}
          </pre>
        )}
      </div>
    </div>
  );
};

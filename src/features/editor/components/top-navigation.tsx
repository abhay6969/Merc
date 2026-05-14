"use client";

import { FileIcon } from "@react-symbols/icons/utils";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Id } from "../../../../convex/_generated/dataModel";
import { useFile } from "@/features/projects/hooks/use-files";
import { useEditor } from "../hooks/use-editor";

const EditorTab = ({
  fileId,
  projectId,
}: {
  fileId: Id<"files">;
  projectId: Id<"project">;
}) => {
  const file = useFile(fileId);
  const { activeTab, previewTabId, closeTab, setActiveTab } =
    useEditor(projectId);
  const isActive = activeTab === fileId;
  const isPreview = previewTabId === fileId;
  const label = file?.name ?? "…";

  return (
    <div
      role="tab"
      aria-selected={isActive}
      className={cn(
        "group flex h-9 max-w-[200px] shrink-0 items-center gap-0 border-r border-border/70 bg-muted/25 transition-colors",
        isActive &&
          "bg-background text-foreground shadow-[inset_0_-2px_0_0_hsl(var(--primary))]",
        !isActive && "hover:bg-muted/45",
      )}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-1.5 px-2 py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/80 focus-visible:ring-offset-1"
        onClick={() => setActiveTab(fileId)}
      >
        <FileIcon
          fileName={label}
          autoAssign
          className="size-3.5 shrink-0 opacity-80"
        />
        <span
          className={cn(
            "min-w-0 truncate text-xs",
            isPreview && "italic text-muted-foreground",
            isActive && !isPreview && "font-medium",
          )}
        >
          {label}
        </span>
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="mr-0.5 shrink-0 text-muted-foreground opacity-70 hover:opacity-100"
        aria-label={`Close ${label}`}
        onClick={(e) => {
          e.stopPropagation();
          closeTab(fileId);
        }}
      >
        <X className="size-3.5" />
      </Button>
    </div>
  );
};

export const TopNavigation = ({
  projectId,
}: {
  projectId: Id<"project">;
}) => {
  const { openTabs } = useEditor(projectId);

  if (openTabs.length === 0) {
    return (
      <div className="flex h-9 min-h-9 flex-1 items-center border-b bg-muted/20 px-3 text-xs text-muted-foreground">
        Open a file from the sidebar
      </div>
    );
  }

  return (
    <div className="flex min-h-9 flex-1 min-w-0 items-end overflow-x-auto border-b bg-muted/20 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {openTabs.map((fileId) => (
        <EditorTab key={fileId} fileId={fileId} projectId={projectId} />
      ))}
    </div>
  );
};

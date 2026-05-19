"use client";

import { Id } from "../../../../convex/_generated/dataModel";
import { useProject } from "../hooks/use-projects";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { useState } from "react";
import { FaGithub } from "react-icons/fa";
import { Allotment } from "allotment";
import { ExportPopover } from "@/features/projects/components/export-popover";
import { Loader2 } from "lucide-react";

const PaneLoading = ({ label }: { label: string }) => (
  <div className="flex h-full items-center justify-center gap-2 text-muted-foreground">
    <Loader2 className="size-5 animate-spin" />
    <p className="text-sm">{label}</p>
  </div>
);

const FileExplorer = dynamic(() => import("./file-explorar"), {
  ssr: false,
  loading: () => <PaneLoading label="Loading files…" />,
});

const EditorView = dynamic(
  () =>
    import("@/features/editor/components/editor-view").then((mod) => ({
      default: mod.EditorView,
    })),
  {
    ssr: false,
    loading: () => <PaneLoading label="Loading editor…" />,
  },
);

const PreviewView = dynamic(
  () =>
    import("@/features/projects/components/preview-view").then((mod) => ({
      default: mod.PreviewView,
    })),
  {
    ssr: false,
    loading: () => <PaneLoading label="Loading preview…" />,
  },
);

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 800;
const DEFAULT_SIDEBAR_WIDTH = 350;
const DEFAULT_EDITOR_MAIN = 880;

const Tab = ({label,isActive,onClick}:{label:string,isActive:boolean,onClick:()=>void})=>{
  return(
    <div className={
      cn(
        "flex items-center justify-center h-full px-3 cursor-pointer bg-background text-muted-foreground border-r hover:bg-accent/30 ",
        isActive && "bg-background text-foreground"
      )}              
      onClick={onClick}>
      <span className="text-sm">{label}</span>
    </div>
    
  ) 
}

export const ProjectIdView = ({
  projectId,
}: {
  projectId: Id<"project">;
}) => {
  const project = useProject(projectId);
  const [activeView, setActiveView] = useState<"editor" | "preview">("editor");

  if (project === undefined) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (project === null) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Project not found.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <nav className="h-8.75 flex items-center bg-sidebar border-b">
        <Tab
          label="Code"
          isActive={activeView === "editor"}
          onClick={() => {
            setActiveView("editor");
          }}
        />
        <Tab
          label="Preview"
          isActive={activeView === "preview"}
          onClick={() => {
            setActiveView("preview");
          }}
        />
        <div className="flex flex-1 justify-end h-full">
          <ExportPopover
            projectId={projectId}
            trigger={
              <button
                type="button"
                className="flex h-full cursor-pointer items-center justify-center gap-1.5 border-l bg-background px-3 text-muted-foreground hover:bg-accent/30"
              >
                <FaGithub className="size-3.5" />
                <span className="text-sm">Export</span>
              </button>
            }
          />
        </div>
      </nav>
      <div className="flex-1 relative">
        <div
          className={cn(
            "absolute inset-0",
            activeView === "editor" ? "visible" : "invisible",
          )}
        >
          <Allotment
            defaultSizes={[DEFAULT_SIDEBAR_WIDTH, DEFAULT_EDITOR_MAIN]}
          >
            <Allotment.Pane
              snap
              minSize={MIN_SIDEBAR_WIDTH}
              maxSize={MAX_SIDEBAR_WIDTH}
              preferredSize={DEFAULT_SIDEBAR_WIDTH}
              className="min-h-0"
            >
              <FileExplorer projectId={projectId} />
            </Allotment.Pane>
            <Allotment.Pane
              preferredSize={DEFAULT_EDITOR_MAIN}
              className="min-h-0"
            >
              <EditorView projectId={projectId} />
            </Allotment.Pane>
          </Allotment>
        </div>
        <div
          className={cn(
            "absolute inset-0",
            activeView === "preview" ? "visible" : "invisible",
          )}
        >
          <PreviewView projectId={projectId} enabled={activeView === "preview"} />
        </div>
      </div>
    </div>
  );
};

export default ProjectIdView;

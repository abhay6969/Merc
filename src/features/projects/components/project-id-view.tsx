"use client";

import { Id } from "../../../../convex/_generated/dataModel";
import { useProject } from "../hooks/use-projects";
import { cn } from "@/lib/utils";
import { Poppins } from "next/font/google";
import { useState } from "react";
import { FaGithub } from "react-icons/fa";
import { Allotment } from "allotment";
import FileExplorer from "./file-explorar";
import { EditorView } from "@/features/editor/components/editor-view";

const font = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 800;
const DEFAULT_SIDEBAR_WIDTH = 350;
const DEFAULT_MAIN_SIZE = 1000;

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
        <div className="flex-1 flex  justify-end h-full">
          <div className="flex items-center justify-center h-full px-3 cursor-pointer bg-background text-muted-foreground border-l hover:bg-accent/30 gap-1.5">
          <FaGithub className="size-3.5" />
          <span className="text-sm">Export</span>
          </div>
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
            defaultSizes={[DEFAULT_SIDEBAR_WIDTH, DEFAULT_MAIN_SIZE]}
          >
            <Allotment.Pane
              snap
              minSize={MIN_SIDEBAR_WIDTH}
              maxSize={MAX_SIDEBAR_WIDTH}
              preferredSize={DEFAULT_SIDEBAR_WIDTH}
            >
              <FileExplorer projectId={projectId} />
            </Allotment.Pane>
            <Allotment.Pane preferredSize={DEFAULT_MAIN_SIZE} className="min-h-0">
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
          <div>Preview</div>
        </div>
      </div>
    </div>
  );
};

export default ProjectIdView;

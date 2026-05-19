import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { ChevronRightIcon, CopyMinusIcon, FilePlusCorner, FolderPlusIcon } from "lucide-react"
import { useState } from "react";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useProject } from "../../hooks/use-projects";
import { Button } from "@/components/ui/button";
import { useCreateFile, useCreateFolder, useFolderContents } from "../../hooks/use-files";
import { CreateInput } from "./create-input";
import { LoadingRow } from "./loading-row";
import { Tree } from "./tree";

const FileExplorer = ({projectId}:{projectId:Id<"project">}) => {
  const [open, setOpen] = useState(false);
  const [collapseKey, setCollapseKey] = useState(0);
  const [creating, setCreating] = useState<"file" | "folder" | null>(null);
  
  const project = useProject(projectId);
  const rootFiles = useFolderContents({projectId, enabled:open})

  const rootScope = { projectId, parentId: undefined as Id<"files"> | undefined };
  const createFile = useCreateFile(rootScope);
  const createFolder = useCreateFolder(rootScope);
  const handleCreate = (name:string)=>{
    setCreating(null);
    if(creating === "file"){
      createFile({
        projectId,
        name,
        content: "",
        parentId:undefined
      });
    }else if(creating === "folder"){
      createFolder({
        projectId,
        name,
        parentId:undefined
      });
    }
    setOpen(false);
  }
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-sidebar">
      <ScrollArea className="h-0 min-h-0 flex-1">
        <div
          role="button"
          onClick={() => {
            setOpen(!open);
          }}
          className="group/project cursor-pointer hover:bg-sidebar-accent/50 rounded-md p-2 flex items-center gap-0.5 h-5.5 bg-accent font-bold"
        >
          <ChevronRightIcon
            className={cn(
              "size-4 shrink-0 text-foreground ",
              open && "rotate-90",
            )}
          />
          <p className="text-xs uppercase line-clamp-1 text-ellipsis">
            {project?.name}
          </p>
          <div className="opacity-0 group-hover/project:opacity-100 transition-opacity duration-200 flex items-center gap-1">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setOpen(true);
                setCreating("file");
              }}
              variant="highlight"
              size="icon-xs"
            >
              <FilePlusCorner className="size-3.5" />
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setOpen(true);
                setCreating("folder");
              }}
              variant="highlight"
              size="icon-xs"
            >
              <FolderPlusIcon className="size-3.5" />
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setCollapseKey((prev)=>prev+1);
              }}
              variant="highlight"
              size="icon-xs"
            >
              <CopyMinusIcon className="size-3.5" />
            </Button>
          </div>
        </div>
        {open && (
          <>
          {rootFiles === undefined && <LoadingRow level={0} />}
            {creating && (
              <CreateInput type={creating} level = {0}  onCancel={()=>setCreating(null)} onSubmit={handleCreate} />
            )}
            {rootFiles?.map((item) => (
              <Tree
                key={`${item._id}-${collapseKey}`}
                item={item}
                level={0}
                projectId={projectId}
              />
            ))}
          </>
        )}
      </ScrollArea>
    </div>
  );
}

export default FileExplorer;
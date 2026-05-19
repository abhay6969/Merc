import { useState } from "react";
import { Doc, Id } from "../../../../../convex/_generated/dataModel";
import { useCreateFile, useCreateFolder, useDeleteFile, useFolderContents, useRenameFile } from "../../hooks/use-files";
import { TreeItemWrapper } from "./tree-item-wrapper";
import { FileIcon, FolderIcon } from "@react-symbols/icons/utils";
import { ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { LoadingRow } from "./loading-row";
import { CreateInput } from "./create-input";
import { RenameInput } from "./rename-input";
import { useEditor } from "@/features/editor/hooks/use-editor";

export const Tree = ({
  item, 
  level, 
  projectId}:{
  item:Doc<"files">, 
  level:number, 
  projectId:Id<"project">}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    const [creating, setCreating] = useState<"file" | "folder" | null>(null);

    const folderScope = {
      projectId,
      parentId: item.parentId,
    };
    const childScope = {
      projectId,
      parentId: item._id,
    };
    const renameFile = useRenameFile(folderScope);
    const deleteFile = useDeleteFile(folderScope);
    const createFile = useCreateFile(childScope);
    const createFolder = useCreateFolder(childScope);

    const {openFile, closeTab, activeTab} = useEditor(projectId);

    const folderContents = useFolderContents({
      projectId, 
      parentId:item._id, 
      enabled:isOpen && isOpen,});

    const handleRename = (newName:string) =>{
      setIsRenaming(false);
      if(newName === item.name) return;
      renameFile({id:item._id, newName});
    }

    const handleCreate = (name:string)=>{
      setCreating(null);
      if(creating === "file"){
        createFile({
          projectId,
          name,
          content: "",
          parentId:item._id
        })
      }
      else{
        createFolder({
          projectId,
          name,
          parentId:item._id
        })
      }
    }

    const startCreating = (type:"file" | "folder")=>{
      setIsOpen(true);
      setCreating(type);
    }

    if(item.type === "file"){
      const fileName = item.name;
      const isActive = activeTab === item._id;
      if(isRenaming){
        return (
          <RenameInput 
          type="file" 
          isOpen={isRenaming} 
          level={level} 
          onCancel={()=>setIsRenaming(false)} 
          onSubmit={handleRename} 
          initialValue={fileName} 
          />
        )
      }
      return (
        <TreeItemWrapper 
        item={item}
        level={level}
        isActive={isActive}
        onClick={()=> openFile(item._id, {pinned:false})}
        onDoubleClick={()=> openFile(item._id, {pinned:true})}
        onRename={()=>setIsRenaming(true)}
        onDelete={()=>{closeTab(item._id); deleteFile({id:item._id})}}
        >
          <FileIcon fileName={fileName} autoAssign className="size-4 " />
          <span className="truncate text-sm">{fileName}</span>
        </TreeItemWrapper>
      )
    }

    if(item.type === "folder"){
      const folderName = item.name;

      const FolderRender = (
        <>
        <div className="flex items-center gap-0.5">
          <ChevronRightIcon className={cn("size-4 shrink-0 text-muted-foreground", isOpen && "rotate-90")} />
          <FolderIcon folderName={folderName} className="size-4 " />
        </div>
          <span className="truncate text-sm">{folderName}</span>
        </>
      )

      if(isRenaming){
        return (
          <RenameInput 
          type="folder" 
          isOpen={isOpen} 
          level={level} 
          onCancel={()=>setIsRenaming(false)} 
          onSubmit={handleRename} 
          initialValue={folderName} 
          />
        )
      }

      if(creating){
        return(
          <>
          <button
          onClick={()=> setIsOpen((val)=>!val)}
          className="group flex items-center gap-1 h-5.5 hover:bg-accent/30 w-full"
          >
            {FolderRender}
          </button>
          {
            isOpen && (
              <>
              {folderContents === undefined && <LoadingRow level={level+1} />}
              <CreateInput type={creating} level={level+1} onCancel={()=>setCreating(null)} onSubmit={handleCreate} />
                {
                  folderContents?.map((child)=>(
                    <Tree
                      key={child._id}
                      item={child}
                      level={level+1}
                      projectId={projectId}
                    />
                  ))
                }
              </>

            )
          }
          </>
        )
      }

      return (
        <>
          <TreeItemWrapper 
          item={item}
          level={level}
          isActive={false}
          onClick={()=>setIsOpen(!isOpen)}
          onDoubleClick={()=>setIsOpen(!isOpen)}
          onRename={()=>setIsRenaming(true)}
          onDelete={()=>deleteFile({id:item._id})}
          onCreateFile={()=>{startCreating("file")}}
          onCreateFolder={()=>{startCreating("folder")}}
          >
            {FolderRender}
          </TreeItemWrapper>    
          {isOpen && (
            <>
            {folderContents === undefined && <LoadingRow level={level+1} />}
            {folderContents?.map((item)=>(
              <Tree key={item._id} item={item} level={level+1} projectId={projectId} />
            ))}
            </>
          )}
        </>
      )
    }

  return null;
}
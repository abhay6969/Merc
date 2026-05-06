import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuShortcut, ContextMenuTrigger } from "@/components/ui/context-menu"
import { Doc } from "../../../../../convex/_generated/dataModel"
import { getItemPAdding } from "./constants"
import { cn } from "@/lib/utils"
import { ContextMenuSeparator } from "@radix-ui/react-context-menu"

export const TreeItemWrapper = ({
  item,
  children,
  level,
  isActive,
  onClick,
  onDoubleClick,
  onRename,
  onDelete,
  onCreateFile,
  onCreateFolder,
}:{
  item:Doc<"files">,
  children:React.ReactNode, 
  level:number, 
  isActive:boolean, 
  onClick:()=>void, 
  onDoubleClick:()=>void, 
  onRename:()=>void, 
  onDelete:()=>void, 
  onCreateFile:()=>void, 
  onCreateFolder:()=>void,
}) => {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          onClick={onClick}
          onDoubleClick={onDoubleClick}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onRename();
            }
          }}
          className={cn(
            "group flex items-center gap-1 h-5.5 w-full hover:bg-accent/30 outline-none focus:ring-1 focus:ring-inset focus:ring-ring",
            isActive && "bg-accent/30",
          )}
          style={{ paddingLeft: getItemPAdding(level, item.type === "file") }}
        >
          {children}
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent onCloseAutoFocus={(e) => e.preventDefault()}>
        {item.type === "folder" && (
          <>
            <ContextMenuItem onClick={onCreateFile} className="text-sm">
              New File....
            </ContextMenuItem>
            <ContextMenuItem onClick={onCreateFolder} className="text-sm">
              New Folder....
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}
        <ContextMenuItem onClick={onRename} className="text-sm">
          Rename
          <ContextMenuShortcut>Enter</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={onDelete} className="text-sm">
          xBackspace
          <ContextMenuShortcut>Enter</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
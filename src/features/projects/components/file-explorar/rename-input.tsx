import { ChevronRightIcon } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import {FileIcon,FolderIcon} from "@react-symbols/icons/utils";
// import { Input } from "@/components/ui/input";
import { getItemPAdding } from "./constants";
import { cn } from "@/lib/utils";

export const RenameInput = ({
  type, 
  isOpen,
  level, 
  onCancel, 
  onSubmit,
  initialValue,
}:{
  type:"file" | "folder", 
  isOpen?:boolean,
  level:number, 
  onCancel:()=>void, 
  onSubmit:(name:string)=>void,
  initialValue:string,
}) => {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();

    // Select immediately even if onFocus doesn't fire (autofocus timing).
    if (type === "folder") {
      el.select();
      return;
    }

    const current = el.value;
    const lastDotIndex = current.lastIndexOf(".");
    if (lastDotIndex > 0) {
      el.setSelectionRange(0, lastDotIndex);
    } else {
      el.select();
    }
  }, [type]);
  const handleSubmit = ()=>{
    const trimmedValue = value.trim();
    if(trimmedValue){
      onSubmit(trimmedValue);
    }
    else{
      onCancel();
    }
  }
  return (
    <div className="w-full flex items-center gap-1 h-5.5  bg-accent/30" style={{paddingLeft:getItemPAdding(level, type === "file")}}>
      <div className="flex items-center gap-0.5">
        {type === "folder" && (
          <ChevronRightIcon className={cn("size-4 shrink-0 text-muted-foreground", isOpen && "rotate-90")} />
        )}
        {type === "file" && (
          <FileIcon fileName={value} autoAssign className="size-4 " />
        )}
        {type === "folder" && (
          <FolderIcon folderName={value}  className="size-4 " />
        )}
      </div>
      <input 
      ref={inputRef}
      autoFocus
      type="text"
       value={value}
        onChange={(e)=>setValue(e.target.value)}
        placeholder="Enter a name for the file or folder"
        className="h-full bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0"
        onBlur={handleSubmit}
        onKeyDown={(e)=>{
          if(e.key === "Enter"){
            handleSubmit();
          }
          else if(e.key === "Escape"){
            onCancel();
          }
        }}
      />
    </div>
  );
}
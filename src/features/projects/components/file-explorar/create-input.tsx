import { ChevronRightIcon } from "lucide-react";
import { useState } from "react";
import {FileIcon,FolderIcon} from "@react-symbols/icons/utils";
// import { Input } from "@/components/ui/input";
import { getItemPAdding } from "./constants";

export const CreateInput = ({type, level, onCancel, onSubmit}:{type:"file" | "folder", level:number, onCancel:()=>void, onSubmit:(name:string)=>void}) => {
  const [value, setValue] = useState("");
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
          <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
        )}
        {type === "file" && (
          <FileIcon fileName={value} autoAssign className="size-4 " />
        )}
        {type === "folder" && (
          <FolderIcon folderName={value}  className="size-4 " />
        )}
      </div>
      <input autoFocus type="text"
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
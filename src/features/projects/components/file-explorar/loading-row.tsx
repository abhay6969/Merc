import { cn } from "@/lib/utils"
import { getItemPAdding } from "./constants"
import { Spinner } from "@/components/ui/spinner"

export const LoadingRow = ({className, level = 0}:{className?:string, level?:number}) => {
  return (
    <div className={cn("flex items-center gap-1 h-5.5 text-muted-foreground", className)} style={{paddingLeft:getItemPAdding(level, false)}}>
      <Spinner className="size-4 text-ring ml-0.5" />
    </div>
  )
}
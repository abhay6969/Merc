import { Spinner } from "@/components/ui/spinner"

export const AuthLoadingView = ()=>{
  return(
    <div className="flex justify-center items-center h-screen">
      <Spinner className = "size-6 text-ring"/>
    </div>
  )
}
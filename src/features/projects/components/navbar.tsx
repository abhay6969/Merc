"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Poppins } from "next/font/google";
import { UserButton } from "@clerk/nextjs";
import {
  useProject,
  useRenameProject,
} from "@/features/projects/hooks/use-projects";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CloudCheckIcon, LoaderIcon } from "lucide-react";
import { RelativeTime } from "@/components/relative-time";

const font = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const Navbar = ({ projectId }: { projectId: Id<"project"> }) => {
  const project = useProject(projectId);
  const renameProject = useRenameProject({ projectId });

  const [isRenaming, setIsRenaming] = useState(false);
  const [name, setName] = useState("");

  const handleStartRename = () => {
    if (!project) return;
    setIsRenaming(true);
    setName(project?.name ?? "");
  };

  const handleStopRename = () => {
    setIsRenaming(false);
  };

  const handleSubmit = ()=>{
    if (!project) return;
    setIsRenaming(false);
    const trimmedName = name.trim();
    if (trimmedName === "") return;
    if (trimmedName === project?.name) return;
    renameProject({id: projectId, name: trimmedName});
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
    else if (e.key === "Escape") {
      handleStopRename();
    }
  };

  return (
    <div className="flex  justify-between items-center gap-x-2 p-2 bg-sidebar border-b">
      <div className="flex items-center gap-x-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                href="/"
                className="flex items-center gap-1.5"
                asChild
              >
                <Button variant="ghost" size="sm">
                  <Link href="/">
                    <Image src="/logo.svg" alt="logo" width={20} height={20} />
                    <span className={cn("text-sm font-medium", font.className)}>
                      Merc
                    </span>
                  </Link>
                </Button>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="ml-0 mr-1" />
            <BreadcrumbItem>
              {isRenaming ? (
                <Input
                  autoFocus
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={handleSubmit}
                  onFocus={(e) => e.currentTarget.select()}
                  onKeyDown={handleKeyDown}
                  className="text-sm bg-transparent outline-none focus:ring-1 focus:ring-inset focus:ring-ring/50 font-medium max-w-40
                   truncate w-full"
                />
              ) : (
                <BreadcrumbPage
                  onClick={handleStartRename}
                  className="text-sm cursor-pointer hover:text-primary font-medium max-w-40 truncate"
                >
                  {project?.name ?? "…"}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        {project?.importStatus === "importing" ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <LoaderIcon className="size-4 text-muted-foreground animate-spin" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Importing project...</p>
            </TooltipContent>
          </Tooltip>
        ) : (

            <Tooltip>
              <TooltipTrigger asChild>
                <CloudCheckIcon className="size-4 text-muted-foreground " />
              </TooltipTrigger>
              <TooltipContent>
                {project?.updatedAt ? (
                  <p>
                    Saved <RelativeTime date={project.updatedAt} />
                  </p>
                ) : (
                  <p>Loading...</p>
                )}
                
              </TooltipContent>
            </Tooltip>
        )}
      </div>
      <div className="flex items-center gap-2">
        <UserButton />
      </div>
    </div>
  );
};

export default Navbar;

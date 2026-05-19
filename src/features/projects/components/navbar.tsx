"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { MercenaryLogo } from "@/components/brand/mercenary-logo";
import { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import {
  useProject,
  useRenameProject,
} from "@/features/projects/hooks/use-projects";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CloudCheckIcon, LoaderIcon, MessageSquareIcon } from "lucide-react";
import { RelativeTime } from "@/components/relative-time";
import { useChatPanel } from "@/features/chat/state/chat-panel";

export const Navbar = ({ projectId }: { projectId: Id<"project"> }) => {
  const project = useProject(projectId);
  const renameProject = useRenameProject({ projectId });
  const { isDocked, openMobileChat } = useChatPanel();

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

  const handleSubmit = () => {
    if (!project) return;
    setIsRenaming(false);
    const trimmedName = name.trim();
    if (trimmedName === "") return;
    if (trimmedName === project?.name) return;
    renameProject({ id: projectId, name: trimmedName });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit();
    } else if (e.key === "Escape") {
      handleStopRename();
    }
  };

  return (
    <div className="flex items-center justify-between gap-x-2 border-b border-white/[0.06] bg-[#0f172a] p-2">
      <div className="flex min-w-0 items-center gap-x-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/" className="flex items-center" asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 cursor-pointer gap-2 px-2 hover:bg-white/5"
                  asChild
                >
                  <Link href="/">
                    <MercenaryLogo size="sm" showWordmark={false} />
                    <span className="hidden text-sm font-medium text-slate-300 sm:inline">
                      Mercenary
                    </span>
                  </Link>
                </Button>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="mr-1 ml-0 text-slate-600" />
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
                  className="h-8 max-w-40 w-full truncate bg-transparent text-sm font-medium outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
              ) : (
                <BreadcrumbPage
                  onClick={handleStartRename}
                  className="max-w-[40vw] cursor-pointer truncate text-sm font-medium hover:text-emerald-400 sm:max-w-48"
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
              <LoaderIcon className="size-4 shrink-0 animate-spin text-slate-400" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Importing project...</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <CloudCheckIcon className="size-4 shrink-0 text-slate-500" />
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
      <div className="flex items-center gap-1.5">
        {!isDocked ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 cursor-pointer gap-1.5 border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-[#f8fafc]"
            onClick={openMobileChat}
          >
            <MessageSquareIcon className="size-4" />
            <span className="text-xs font-medium">Chat</span>
          </Button>
        ) : null}
        <UserButton />
      </div>
    </div>
  );
};

export default Navbar;

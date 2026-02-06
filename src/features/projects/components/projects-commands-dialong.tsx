import { useRouter } from "next/navigation";
import { FaGithub } from "react-icons/fa";
import { AlertCircleIcon,GlobeIcon,Loader2Icon, XIcon } from "lucide-react";

import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
  CommandGroup,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { useProjects } from "../hooks/use-projects";
import { Spinner } from "@/components/ui/spinner";
import { Doc } from "../../../../convex/_generated/dataModel";

interface ProjectsCommandsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getProjectIcons = (data: Doc<"projects">) => {
  if (data?.importStatus === "completed")
    return <FaGithub className="size-4 text-muted-foreground" />;
  if (data?.importStatus === "importing")
    return <Spinner className="size-4 text-muted-foreground" />;
  if (data?.importStatus === "failed")
    return <XIcon className="size-4 text-muted-foreground" />;
  return <GlobeIcon className="size-4 text-muted-foreground" />;
};

export const ProjectsCommandsDialog = ({ open, onOpenChange }: ProjectsCommandsDialogProps) => {
  const router = useRouter();
  const projects = useProjects();

  const handleSelect = (projectId: string) => {
    router.push(`/projects/${projectId}`);
    onOpenChange(false);
  };
  return (       
    <CommandDialog open={open} onOpenChange={onOpenChange} 
    title="SearchProjects"
    description="Search for a project to open"
    >
      <CommandInput placeholder="Search for a project..." />
        <CommandEmpty>No project found.</CommandEmpty>
        <CommandGroup heading="Projects">
          {projects?.map((project) => (
            <CommandItem key={project._id} value={`${project.name} - ${project._id}`} onSelect={() => handleSelect(project._id)}>
              {getProjectIcons(project)} 
              <span className="truncate">{project.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
    </CommandDialog>
  )
  
}

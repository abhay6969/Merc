import { Spinner } from "@/components/ui/spinner";
import { usePartialProjects } from "../hooks/use-projects";
import { Kbd } from "@/components/ui/kbd";
import { Doc } from "../../../../convex/_generated/dataModel";
import Link from "next/link";
import { ArrowRightIcon, GlobeIcon, XIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { FaGithub } from "react-icons/fa";
import { Button } from "@/components/ui/button";

const formatTimestamp = (timestamp: number) => {
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
};

interface ProjectsListProps {
  onViewAll: () => void;
}

const getProjectIcons = (data: Doc<"projects">) => {
  if(data?.importStatus === "completed") return <FaGithub className="size-3.5 text-muted-foreground" />;
  if(data?.importStatus === "importing") return <Spinner className="size-3.5 text-muted-foreground" />;
  if(data?.importStatus === "failed") return <XIcon className="size-3.5 text-muted-foreground" />;
  return <GlobeIcon className="size-3.5 text-muted-foreground" />;
}

const ContinueCard = ({ data }: { data: Doc<"projects"> }) => {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-muted-foreground">Last Updated</span>
      <Button
        variant="outline"
        className="h-auto items-start justify-start p-4 bg-background border rounded-none flex flex-col gap-2"
      >
        <Link href={`/projects/${data?._id}`} className="group">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {getProjectIcons(data)}
              <span className="font-medium truncate">{data?.name}</span>
            </div>
            <ArrowRightIcon className="size-4  text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>
        <span className="text-xs text-muted-foreground group-hover:text-foreground/60 transition-colors">
          {data?.updatedAt != null ? formatTimestamp(data?.updatedAt) : "—"}
        </span>
      </Button>
    </div>
  );
}

const ProjectItem = ({ data }: { data: Doc<"projects"> }) => {
  return (

      <Link href={`/projects/${data._id}`} className="text-sm text-foreground/60 font-medium hover:text-foreground py-1 flex items-center justify-between gap-2 transition-colors group">
      <div className="flex items-center gap-2"> 
        {getProjectIcons(data)}
        <span className="truncate">{data.name}</span>
      </div>
      <span className="text-xs text-muted-foreground group-hover:text-foreground/60 transition-colors">
        {data.updatedAt != null ? formatTimestamp(data.updatedAt) : "—"}
      </span>
      </Link>

  );
};

export const ProjectsList = ({ onViewAll }: ProjectsListProps) => {
  const projects = usePartialProjects({ limit: 6 });
  if (projects === undefined) return <Spinner className="size-4 text-ring" />;
  const [mostRecent, ...rest] = projects;
  return (
    <div className="flex flex-col gap-4">
      {mostRecent != null && <ContinueCard data={mostRecent} />}
      {rest.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              Recent Projects
            </span>
            <button onClick={onViewAll} className="flex items-center gap-2 text-muted-foreground text-xs hover:text-foreground transition-colors">
              <span>View All</span>
              <Kbd className="bg-accent-border">xK</Kbd>
            </button>
          </div>
          <ul className="flex flex-col">
            {rest.map((project) => (
              <ProjectItem key={project._id} data={project as Doc<"projects">} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

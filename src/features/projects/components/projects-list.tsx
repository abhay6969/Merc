import { Spinner } from "@/components/ui/spinner";
import { usePartialProjects } from "../hooks/use-projects";
import { Kbd } from "@/components/ui/kbd";
import { Doc } from "../../../../convex/_generated/dataModel";
import Link from "next/link";
import { ArrowRightIcon, GlobeIcon, XIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { FaGithub } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const formatTimestamp = (timestamp: number) => {
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
};

interface ProjectsListProps {
  onViewAll: () => void;
}

const getProjectIcons = (data: Doc<"project">) => {
  if (data?.importStatus === "completed")
    return <FaGithub className="size-3.5 text-slate-400" />;
  if (data?.importStatus === "importing")
    return <Spinner className="size-3.5 text-slate-400" />;
  if (data?.importStatus === "failed")
    return <XIcon className="size-3.5 text-red-400/80" />;
  return <GlobeIcon className="size-3.5 text-slate-400" />;
};

const ContinueCard = ({ data }: { data: Doc<"project"> }) => {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
        Continue where you left off
      </span>
      <Button
        variant="outline"
        asChild
        className={cn(
          "h-auto cursor-pointer flex-col items-start justify-start gap-2 rounded-lg border-white/[0.08] bg-white/[0.04] p-4 text-left transition-colors duration-200",
          "hover:border-emerald-500/30 hover:bg-white/[0.07]",
        )}
      >
        <Link href={`/projects/${data?._id}`} className="group w-full">
          <div className="flex w-full items-center justify-between">
            <div className="flex min-w-0 items-center gap-2">
              {getProjectIcons(data)}
              <span className="truncate font-medium text-[#f8fafc]">
                {data?.name}
              </span>
            </div>
            <ArrowRightIcon className="size-4 shrink-0 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-400" />
          </div>
          <span className="text-xs text-slate-500 group-hover:text-slate-400">
            {data?.updatedAt != null ? formatTimestamp(data?.updatedAt) : "—"}
          </span>
        </Link>
      </Button>
    </div>
  );
};

const ProjectItem = ({ data }: { data: Doc<"project"> }) => {
  return (
    <Link
      href={`/projects/${data._id}`}
      className="group flex cursor-pointer items-center justify-between gap-2 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:text-[#f8fafc]"
    >
      <div className="flex min-w-0 items-center gap-2">
        {getProjectIcons(data)}
        <span className="truncate">{data.name}</span>
      </div>
      <span className="shrink-0 text-xs text-slate-600 group-hover:text-slate-400">
        {data.updatedAt != null ? formatTimestamp(data.updatedAt) : "—"}
      </span>
    </Link>
  );
};

export const ProjectsList = ({ onViewAll }: ProjectsListProps) => {
  const projects = usePartialProjects({ limit: 6 });
  if (projects === undefined) {
    return (
      <div className="flex justify-center py-8">
        <Spinner className="size-5 text-emerald-500/80" />
      </div>
    );
  }
  const [mostRecent, ...rest] = projects;
  return (
    <div className="flex flex-col gap-5">
      {mostRecent != null && <ContinueCard data={mostRecent} />}
      {rest.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Recent projects
            </span>
            <button
              type="button"
              onClick={onViewAll}
              className="flex cursor-pointer items-center gap-2 text-xs text-slate-500 transition-colors hover:text-[#f8fafc]"
            >
              <span>View all</span>
              <Kbd className="border-white/10 bg-white/5 text-[10px]">Ctrl K</Kbd>
            </button>
          </div>
          <ul className="flex flex-col divide-y divide-white/[0.06]">
            {rest.map((project) => (
              <ProjectItem key={project._id} data={project as Doc<"project">} />
            ))}
          </ul>
        </div>
      )}
      {projects.length === 0 && (
        <p className="py-6 text-center text-sm text-slate-500">
          No projects yet. Create one or import from GitHub to get started.
        </p>
      )}
    </div>
  );
};

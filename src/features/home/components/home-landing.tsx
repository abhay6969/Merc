"use client";

import { MercenaryLogo } from "@/components/brand/mercenary-logo";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import {
  Code2Icon,
  GithubIcon,
  SparklesIcon,
  TerminalIcon,
  ZapIcon,
} from "lucide-react";
import { FaGithub } from "react-icons/fa";
import { ProjectsList } from "@/features/projects/components/projects-list";

type HomeLandingProps = {
  onNewProject: () => void;
  onImportGithub: () => void;
  onViewAllProjects: () => void;
};

const features = [
  {
    icon: SparklesIcon,
    title: "AI-native workspace",
    description:
      "Describe features in chat; Mercenary edits your project in real time.",
  },
  {
    icon: Code2Icon,
    title: "Editor + preview",
    description:
      "CodeMirror, file tree, and in-browser WebContainer preview in one tab.",
  },
  {
    icon: TerminalIcon,
    title: "Live dev logs",
    description: "Watch install and dev-server output while the preview boots.",
  },
  {
    icon: GithubIcon,
    title: "GitHub sync",
    description: "Import repos and export changes when you are ready to ship.",
  },
] as const;

export function HomeLanding({
  onNewProject,
  onImportGithub,
  onViewAllProjects,
}: HomeLandingProps) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0b1220] text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(34,197,94,0.14),transparent),radial-gradient(ellipse_60%_40%_at_100%_0%,rgba(99,102,241,0.08),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(rgba(248,250,252,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(248,250,252,0.03)_1px,transparent_1px)] [background-size:48px_48px]"
      />

      <div className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pb-10 pt-8 sm:px-6 sm:pt-12 lg:px-8">
        <header className="flex items-center justify-between gap-4">
          <MercenaryLogo size="md" />
          <div className="hidden items-center gap-1.5 text-xs text-slate-400 sm:flex">
            <ZapIcon className="size-3.5 text-emerald-400" />
            <span>Built for shipping fast</span>
          </div>
        </header>

        <section className="mt-10 sm:mt-14">
          <p className="text-xs font-medium uppercase tracking-widest text-emerald-400/90">
            AI development environment
          </p>
          <h1 className="mt-3 max-w-2xl text-3xl font-bold leading-tight tracking-tight text-[#f8fafc] sm:text-4xl lg:text-5xl">
            Build, preview, and ship from one mercenary-grade workspace.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg">
            Mercenary combines chat, code, and a live preview so you can go from
            idea to running app without leaving the browser.
          </p>
        </section>

        <section className="mt-8 grid gap-3 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            onClick={onNewProject}
            className={cn(
              "group h-auto cursor-pointer flex-col items-start gap-4 rounded-xl border-white/10 bg-white/[0.04] p-5 text-left shadow-lg transition-colors duration-200",
              "hover:border-emerald-500/40 hover:bg-white/[0.07]",
            )}
          >
            <div className="flex w-full items-center justify-between">
              <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                <SparklesIcon className="size-4" />
              </span>
              <Kbd className="border-white/10 bg-white/5 text-[10px]">Ctrl J</Kbd>
            </div>
            <div>
              <p className="font-semibold text-[#f8fafc]">New project</p>
              <p className="mt-1 text-sm text-slate-400">
                Start with a prompt; AI scaffolds code and opens the editor.
              </p>
            </div>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onImportGithub}
            className={cn(
              "group h-auto cursor-pointer flex-col items-start gap-4 rounded-xl border-white/10 bg-white/[0.04] p-5 text-left shadow-lg transition-colors duration-200",
              "hover:border-white/20 hover:bg-white/[0.07]",
            )}
          >
            <div className="flex w-full items-center justify-between">
              <span className="flex size-9 items-center justify-center rounded-lg bg-white/10 text-slate-200">
                <FaGithub className="size-4" />
              </span>
              <Kbd className="border-white/10 bg-white/5 text-[10px]">Ctrl I</Kbd>
            </div>
            <div>
              <p className="font-semibold text-[#f8fafc]">Import from GitHub</p>
              <p className="mt-1 text-sm text-slate-400">
                Clone a repository into a new workspace in seconds.
              </p>
            </div>
          </Button>
        </section>

        <section className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors duration-200 hover:bg-white/[0.04]"
            >
              <Icon className="size-4 text-emerald-400/90" aria-hidden />
              <p className="mt-3 text-sm font-medium text-[#f8fafc]">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {description}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-10 flex-1">
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 sm:p-5">
            <ProjectsList onViewAll={onViewAllProjects} />
          </div>
        </section>
      </div>
    </div>
  );
}

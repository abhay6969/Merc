"use client";

import { Poppins } from "next/font/google";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SparkleIcon } from "lucide-react";
import { Kbd } from "@/components/ui/kbd";
import { FaGithub } from "react-icons/fa";
import { ProjectsList } from "./projects-list";
import { useCreateProject } from "../hooks/use-projects";
import { adjectives, animals, colors, uniqueNamesGenerator } from "unique-names-generator";
import { useEffect, useState } from "react";
import { ProjectsCommandsDialog } from "./projects-commands-dialong";


const font = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
const ProjectsView = () => {
  const createProject = useCreateProject();
  const [commandsDialogOpen, setCommandsDialogOpen] = useState(false);

  useEffect(()=>{
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey) {
        if (event.key === "k") {
          event.preventDefault();        
          setCommandsDialogOpen(true);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
  return (
    <>
    <ProjectsCommandsDialog 
    open = {commandsDialogOpen}
    onOpenChange={setCommandsDialogOpen}/>
      <div className="min-h-screen bg-sidebar flex flex-col items-center justify-center p-6 md:p-16">
        <div className="w-full max-w-sm mx-auto flex flex-col gap-4 items-center">
          <div className="flex justify-between gap-4 w-full items-center">
            <div className="flex items-center gap-2 w-full group/logo">
              <img
                src="/logo.svg"
                alt="Merc"
                className="size-[32px] md:size-[46px]"
              />
              <h1 className={cn("text-4xl font-semibold", font.className)}>
                Merc
              </h1>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4 w-full">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={"outline"}
              onClick={() => {
                const projectName = uniqueNamesGenerator({
                  dictionaries: [adjectives, animals, colors],
                  separator: "-",
                  length: 3,
                });
                createProject({ name: projectName });
              }}
              size={"lg"}
              className="h-full items-start justify-start p-4 bg-background border flex flex-col gap-6 rounded-none"
            >
              <div className="flex items-center justify-between w-full">
                <SparkleIcon className="size-4" />

                <Kbd className="bg-accent-border">ctrlJ</Kbd>
              </div>
              <div>
                <span className="text-sm">New</span>
              </div>
            </Button>
            <Button
              variant={"outline"}
              onClick={() => {}}
              size={"lg"}
              className="h-full items-start justify-start p-4 bg-background border flex flex-col gap-6 rounded-none"
            >
              <div className="flex items-center justify-between w-full">
                <FaGithub className="size-4" />

                <Kbd className="bg-accent-border">xI</Kbd>
              </div>
              <div>
                <span className="text-sm">Import</span>
              </div>
            </Button>
          </div>
          <ProjectsList onViewAll={() => setCommandsDialogOpen(true)} />
        </div>
      </div>
    </>
  );
};

export default ProjectsView;

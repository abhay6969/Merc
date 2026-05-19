"use client";

import { useEffect, useState } from "react";
import { HomeLanding } from "@/features/home/components/home-landing";
import { ImportGithubDialog } from "./import-github-dialog";
import { NewProjectDialog } from "./new-project-dialog";
import { ProjectsCommandsDialog } from "./projects-commands-dialong";

const ProjectsView = () => {
  const [commandsDialogOpen, setCommandsDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [newProjectDialogOpen, setNewProjectDialogOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey) {
        if (event.key === "k") {
          event.preventDefault();
          setCommandsDialogOpen(true);
        }
        if (event.key === "j" || event.key === "J") {
          event.preventDefault();
          setNewProjectDialogOpen(true);
        }
        if (event.key === "i" || event.key === "I") {
          event.preventDefault();
          setImportDialogOpen(true);
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
        open={commandsDialogOpen}
        onOpenChange={setCommandsDialogOpen}
      />
      <ImportGithubDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />
      <NewProjectDialog
        open={newProjectDialogOpen}
        onOpenChange={setNewProjectDialogOpen}
      />
      <HomeLanding
        onImportGithub={() => setImportDialogOpen(true)}
        onNewProject={() => setNewProjectDialogOpen(true)}
        onViewAllProjects={() => setCommandsDialogOpen(true)}
      />
    </>
  );
};

export default ProjectsView;

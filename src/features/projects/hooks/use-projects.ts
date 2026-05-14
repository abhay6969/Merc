import { useMutation, useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { Id } from "../../../../convex/_generated/dataModel";

export const useProjects = () => {
  return useQuery(api.projects.get);
}

export const usePartialProjects = ({ limit }: { limit: number }) => {
  return useQuery(api.projects.getPartial, { limit });
};

export const useProject = (projectId: Id<"project"> | null) => {
  return useQuery(
    api.projects.getById,
    projectId === null ? "skip" : { id: projectId }
  );
};

export const useCreateProject = () => {
  const { userId } = useAuth();
  return useMutation(api.projects.create).withOptimisticUpdate(
    (localStore, args) => {
      if (userId == null) return;
      const existingProjects = localStore.getQuery(api.projects.get);
      if (existingProjects === undefined) return;
      const now = new Date().getTime();
      const newProject = {
        _id: crypto.randomUUID() as Id<"project">,
        _creationTime: now,
        name: args.name,
        ownerId: userId,
        updatedAt: now,
      };
      localStore.setQuery(api.projects.get, {}, [newProject, ...existingProjects]);
    }
  );
};

export const useRenameProject = ({projectId}:{projectId:Id<"project">}) => {
  return useMutation(api.projects.rename).withOptimisticUpdate(
    (localStore, args) => {
      const existingProjects = localStore.getQuery(api.projects.getById, { id: args.id });
      if (existingProjects !== undefined && existingProjects !== null) {
        localStore.setQuery(api.projects.getById, { id: args.id }, {
          ...existingProjects,
          name: args.name,
          updatedAt: new Date().getTime(),
        });
      }

      const existingProject = localStore.getQuery(api.projects.get);
      if (existingProject !== undefined){
        localStore.setQuery(api.projects.get, {}, 
          existingProject.map((project)=>{
            return project._id === args.id ? {
              ...project,
              name: args.name,
              updatedAt: new Date().getTime(),
            } : project;
          })
        );
      }
    }
  );
};
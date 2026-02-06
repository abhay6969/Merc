import { useMutation, useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { Id } from "../../../../convex/_generated/dataModel";

export const useProjects = () => {
  return useQuery(api.projects.get);
}

export const usePartialProjects = ({limit}: {limit: number}) => {
  return useQuery(api.projects.getPartial, {limit});
}

export const useCreateProject = () => {
  const { userId } = useAuth();
  return useMutation(api.projects.create).withOptimisticUpdate(
    (localStore, args) => {
      if (userId == null) return;
      const existingProjects = localStore.getQuery(api.projects.get);
      if (existingProjects === undefined) return;
      const now = Date.now();
      const newProject = {
        _id: crypto.randomUUID() as Id<"projects">,
        _creationTime: now,
        name: args.name,
        ownerId: userId,
        updatedAt: now,
      };
      localStore.setQuery(api.projects.get, {}, [newProject, ...existingProjects]);
    }
  );
};
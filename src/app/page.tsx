"use client";

import { Button } from "@/components/ui/button";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import ProjectsView from "@/features/projects/components/projects-view";

const Home = () => {
  return <ProjectsView />
};

export default Home;
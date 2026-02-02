"use client";

import { Button } from "@/components/ui/button";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const X = ()=>{
  const projects = useQuery(api.projects.get);
  const createProject  = useMutation(api.projects.create);
  return(
    <div className="flex flex-col gap-2 p-4">
      <Button onClick={()=>createProject({name:"Project 1"})}>Create Project</Button>
    {
      projects?.map((projects)=>(
        <div key={projects._id} className=" items-center border border-gray-200 rounded-md p-2">
          <p>{projects.name}</p>
          <p>{projects.ownerId}</p>
          <p>{projects.importStatus}</p>
        </div>
      ))
    }
    </div>
  );
};

export default X;
"use client";

import { Id } from "../../../../convex/_generated/dataModel";
import Navbar from "./navbar";
import { Allotment } from "allotment";
import "allotment/dist/style.css";

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 800;
const DEFAULT_CONVERSATION_SIDEBAR_WIDTH = 400;
const DEFAULT_MAIN_SIZE =1000

export const ProjectIdLayout = ({
  children,
  projectId,
}: {
  children: React.ReactNode;
  projectId: Id<"project">;
}) => {
  return (
    <div className=" w-full h-screen flex flex-col">
      <Navbar projectId={projectId} />
      <div className="flex-1 flex overflow-hidden">
        <Allotment
          defaultSizes={[DEFAULT_CONVERSATION_SIDEBAR_WIDTH, DEFAULT_MAIN_SIZE]}
          proportionalLayout={false}
          separator={true}
          sizes={[DEFAULT_CONVERSATION_SIDEBAR_WIDTH, DEFAULT_MAIN_SIZE]}
          onDragEnd={(sizes) => {
            console.log(sizes);
          }}
        >
          <Allotment.Pane
            snap
            minSize={MIN_SIDEBAR_WIDTH}
            maxSize={MAX_SIDEBAR_WIDTH}
            preferredSize={DEFAULT_CONVERSATION_SIDEBAR_WIDTH}
          >
            <div className="w-full h-full ">Conversation Sidebar</div>
          </Allotment.Pane>
          <Allotment.Pane preferredSize={DEFAULT_MAIN_SIZE}>
            {children}
          </Allotment.Pane>
        </Allotment>
      </div>
    </div>
  );
};

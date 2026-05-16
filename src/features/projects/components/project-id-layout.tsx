"use client";

import { Id } from "../../../../convex/_generated/dataModel";
import Navbar from "./navbar";
import { Allotment } from "allotment";
import "allotment/dist/style.css";
import { ActiveConversationProvider } from "@/features/chat/state/active-conversation";
import { ConversationSidebar } from "@/features/chat/components/conversation-sidebar";

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 800;
const DEFAULT_CONVERSATION_SIDEBAR_WIDTH = 400;
const DEFAULT_MAIN_SIZE = 1000;

export const ProjectIdLayout = ({
  children,
  projectId,
}: {
  children: React.ReactNode;
  projectId: Id<"project">;
}) => {
  return (
    <div className="w-full h-screen flex flex-col">
      <Navbar projectId={projectId} />
      <ActiveConversationProvider projectId={projectId}>
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <Allotment
            defaultSizes={[
              DEFAULT_CONVERSATION_SIDEBAR_WIDTH,
              DEFAULT_MAIN_SIZE,
            ]}
            proportionalLayout={false}
            separator={true}
          >
            <Allotment.Pane
              snap
              minSize={MIN_SIDEBAR_WIDTH}
              maxSize={MAX_SIDEBAR_WIDTH}
              preferredSize={DEFAULT_CONVERSATION_SIDEBAR_WIDTH}
              className="min-h-0"
            >
              <ConversationSidebar variant="dockLeft" />
            </Allotment.Pane>
            <Allotment.Pane
              preferredSize={DEFAULT_MAIN_SIZE}
              className="min-h-0 min-w-0"
            >
              {children}
            </Allotment.Pane>
          </Allotment>
        </div>
      </ActiveConversationProvider>
    </div>
  );
};

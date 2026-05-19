"use client";

import { Id } from "../../../../convex/_generated/dataModel";
import Navbar from "./navbar";
import { Allotment } from "allotment";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { ActiveConversationProvider } from "@/features/chat/state/active-conversation";
import { ChatPanelProvider, useChatPanel } from "@/features/chat/state/chat-panel";
import { ConversationSidebarMobileSheet } from "@/features/chat/components/conversation-sidebar-mobile-sheet";

const ConversationSidebar = dynamic(
  () =>
    import("@/features/chat/components/conversation-sidebar").then((mod) => ({
      default: mod.ConversationSidebar,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center gap-2 border-r bg-sidebar text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        <p className="text-sm">Loading chat…</p>
      </div>
    ),
  },
);

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 800;
const DEFAULT_CONVERSATION_SIDEBAR_WIDTH = 400;
const DEFAULT_MAIN_SIZE = 1000;

function ProjectWorkspace({
  children,
  projectId,
}: {
  children: React.ReactNode;
  projectId: Id<"project">;
}) {
  const { isDocked } = useChatPanel();

  if (!isDocked) {
    return (
      <>
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</div>
        <ConversationSidebarMobileSheet />
      </>
    );
  }

  return (
    <Allotment
      defaultSizes={[DEFAULT_CONVERSATION_SIDEBAR_WIDTH, DEFAULT_MAIN_SIZE]}
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
      <Allotment.Pane preferredSize={DEFAULT_MAIN_SIZE} className="min-h-0 min-w-0">
        {children}
      </Allotment.Pane>
    </Allotment>
  );
}

export const ProjectIdLayout = ({
  children,
  projectId,
}: {
  children: React.ReactNode;
  projectId: Id<"project">;
}) => {
  return (
    <div className="flex h-screen w-full flex-col">
      <ActiveConversationProvider projectId={projectId}>
        <ChatPanelProvider>
          <Navbar projectId={projectId} />
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <ProjectWorkspace projectId={projectId}>{children}</ProjectWorkspace>
          </div>
        </ChatPanelProvider>
      </ActiveConversationProvider>
    </div>
  );
};

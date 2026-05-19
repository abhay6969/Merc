"use client";

import { Button } from "@/components/ui/button";
import type { Doc } from "../../../../convex/_generated/dataModel";
import type { Id } from "../../../../convex/_generated/dataModel";
import { HistoryIcon, MessageSquarePlusIcon } from "lucide-react";
import { useState } from "react";
import type { ChatModelId } from "../lib/chat-models";
import { ConversationSidebarModelPicker } from "./conversation-sidebar-model-picker";
import { PastConversationsDialog } from "./past-conversations-dialog";

type ConversationSidebarHeaderProps = {
  title: string;
  conversations: Doc<"conversations">[] | undefined;
  activeConversationId: Id<"conversations"> | null;
  selectedModelId: ChatModelId;
  onModelChange: (id: ChatModelId) => void;
  isProcessing: boolean;
  onNewChat: () => void;
  onSelectConversation: (id: Id<"conversations">) => void;
};

export function ConversationSidebarHeader({
  title,
  conversations,
  activeConversationId,
  selectedModelId,
  onModelChange,
  isProcessing,
  onNewChat,
  onSelectConversation,
}: ConversationSidebarHeaderProps) {
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <>
      <header className="flex shrink-0 flex-col gap-0 border-b border-border/60">
        <div className="flex items-center gap-1 px-2 py-2">
          <h2
            className="min-w-0 flex-1 truncate px-1 font-medium text-sm"
            title={title}
          >
            {title}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            title="New conversation"
            onClick={onNewChat}
          >
            <MessageSquarePlusIcon className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            title="Conversation history"
            onClick={() => setHistoryOpen(true)}
          >
            <HistoryIcon className="size-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2 border-t border-border/40 px-2 pb-2 pt-1.5">
          <span className="shrink-0 text-muted-foreground text-xs">Model</span>
          <ConversationSidebarModelPicker
            disabled={isProcessing}
            onChange={onModelChange}
            value={selectedModelId}
          />
        </div>
      </header>

      <PastConversationsDialog
        activeConversationId={activeConversationId}
        conversations={conversations}
        onOpenChange={setHistoryOpen}
        onSelect={onSelectConversation}
        open={historyOpen}
      />
    </>
  );
}


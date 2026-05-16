"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Doc } from "../../../../convex/_generated/dataModel";
import type { Id } from "../../../../convex/_generated/dataModel";
import { HistoryIcon, MessageSquarePlusIcon } from "lucide-react";
import type { ChatModelId } from "../lib/chat-models";
import { ConversationSidebarModelPicker } from "./conversation-sidebar-model-picker";

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
  return (
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              title="Conversation history"
            >
              <HistoryIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-72 w-64">
            <DropdownMenuLabel>Conversations</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-56 overflow-y-auto">
              {(conversations ?? []).map((conversation) => (
                <DropdownMenuItem
                  key={conversation._id}
                  className="cursor-pointer"
                  data-active={
                    conversation._id === activeConversationId ? true : undefined
                  }
                  onClick={() => onSelectConversation(conversation._id)}
                >
                  <span className="truncate">{conversation.title}</span>
                </DropdownMenuItem>
              ))}
              {conversations?.length === 0 ? (
                <p className="px-2 py-3 text-muted-foreground text-xs">
                  No conversations yet.
                </p>
              ) : null}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
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
  );
}

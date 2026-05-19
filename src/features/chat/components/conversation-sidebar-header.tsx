"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Doc } from "../../../../convex/_generated/dataModel";
import type { Id } from "../../../../convex/_generated/dataModel";
import { HistoryIcon, MessageSquarePlusIcon, SparklesIcon } from "lucide-react";
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
      <header className="shrink-0 border-b border-white/[0.06] bg-white/[0.02] backdrop-blur-sm">
        <div className="flex items-center gap-1 px-2 py-2.5 sm:px-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 px-0.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-400">
              <SparklesIcon className="size-3.5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h2
                className="truncate text-sm font-semibold text-[#f8fafc]"
                title={title}
              >
                {title}
              </h2>
              {isProcessing ? (
                <Badge
                  variant="outline"
                  className="mt-0.5 h-5 border-emerald-500/30 bg-emerald-500/10 px-1.5 text-[10px] font-normal text-emerald-400"
                >
                  Generating…
                </Badge>
              ) : (
                <p className="truncate text-[11px] text-slate-500">
                  Mercenary · project assistant
                </p>
              )}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 cursor-pointer text-slate-400 hover:bg-white/5 hover:text-[#f8fafc]"
            title="New conversation"
            onClick={onNewChat}
          >
            <MessageSquarePlusIcon className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 cursor-pointer text-slate-400 hover:bg-white/5 hover:text-[#f8fafc]"
            title="Conversation history"
            onClick={() => setHistoryOpen(true)}
          >
            <HistoryIcon className="size-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2 border-t border-white/[0.04] px-2 pb-2.5 pt-2 sm:px-3">
          <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Model
          </span>
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

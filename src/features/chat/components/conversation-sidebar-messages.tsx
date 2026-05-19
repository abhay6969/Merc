"use client";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { Loader2Icon, MessageSquareIcon, SparklesIcon } from "lucide-react";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { CHAT_STARTER_SUGGESTIONS } from "../lib/chat-starters";
import { ConversationSidebarMessage } from "./conversation-sidebar-message";

type ConversationSidebarMessagesProps = {
  messages: Doc<"messages">[] | undefined;
  onSuggestionClick: (text: string) => void;
};

export function ConversationSidebarMessages({
  messages,
  onSuggestionClick,
}: ConversationSidebarMessagesProps) {
  return (
    <Conversation className="min-h-0 flex-1">
      <ConversationContent className="gap-5 p-3 sm:p-4">
        {messages === undefined ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-500">
            <Loader2Icon className="size-5 animate-spin text-emerald-500/80" />
            <p className="text-xs">Loading messages…</p>
          </div>
        ) : messages.length === 0 ? (
          <ConversationEmptyState
            description="Pick a model, ask a question, or try a starter below."
            icon={
              <span className="flex size-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <MessageSquareIcon className="size-6" />
              </span>
            }
            title="New chat"
          >
            <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
              <SparklesIcon className="size-3 text-emerald-400/80" />
              <span>Powered by Mercenary</span>
            </div>
            <Suggestions className="mt-4 max-w-full px-1">
              {CHAT_STARTER_SUGGESTIONS.map((suggestion) => (
                <Suggestion
                  key={suggestion}
                  className="cursor-pointer border-white/[0.08] bg-white/[0.04] text-slate-300 hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-[#f8fafc]"
                  onClick={onSuggestionClick}
                  suggestion={suggestion}
                />
              ))}
            </Suggestions>
          </ConversationEmptyState>
        ) : (
          messages.map((message) => (
            <ConversationSidebarMessage key={message._id} message={message} />
          ))
        )}
      </ConversationContent>
      <ConversationScrollButton className="border-white/10 bg-[#1e293b]/90 text-slate-300 hover:bg-[#334155]" />
    </Conversation>
  );
}

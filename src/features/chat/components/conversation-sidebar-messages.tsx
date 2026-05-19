"use client";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { MessageSquareIcon } from "lucide-react";
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
      <ConversationContent className="gap-6 p-3">
        {messages === undefined ? (
          <p className="px-2 py-6 text-center text-muted-foreground text-xs">
            Loading messages…
          </p>
        ) : messages.length === 0 ? (
          <ConversationEmptyState
            description="Pick a model, ask a question, or try a starter below."
            icon={<MessageSquareIcon className="size-8" />}
            title="New chat"
          >
            <Suggestions className="mt-2 max-w-full px-2">
              {CHAT_STARTER_SUGGESTIONS.map((suggestion) => (
                <Suggestion
                  key={suggestion}
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
      <ConversationScrollButton />
    </Conversation>
  );
}

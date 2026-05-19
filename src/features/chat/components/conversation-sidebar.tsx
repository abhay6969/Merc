"use client";

import { cn } from "@/lib/utils";
import { useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import { useActiveConversationContext } from "../state/active-conversation";
import { useConversation } from "../hooks/use-conversations";
import {
  useMessages,
  useSubmitUserPrompt,
} from "../hooks/use-messages";
import { useSelectedChatModel } from "../hooks/use-selected-chat-model";
import {
  dispatchMessageCancel,
  dispatchMessageSent,
  dispatchProjectCancel,
} from "../lib/dispatch-inngest";
import { ConversationSidebarComposer } from "./conversation-sidebar-composer";
import { ConversationSidebarHeader } from "./conversation-sidebar-header";
import { ConversationSidebarMessages } from "./conversation-sidebar-messages";

export type ConversationSidebarVariant =
  | "dockLeft"
  | "dockRight"
  | "embeddedLeft";

type ConversationSidebarProps = {
  variant?: ConversationSidebarVariant;
};

export function ConversationSidebar({
  variant = "dockRight",
}: ConversationSidebarProps) {
  const {
    projectId,
    activeConversationId,
    setManualConversationId,
    conversations,
  } = useActiveConversationContext();

  const conversation = useConversation(activeConversationId);
  const messagesQuery = useMessages(activeConversationId);
  const messages = useMemo(
    () => (activeConversationId === null ? [] : messagesQuery),
    [activeConversationId, messagesQuery],
  );
  const submitPrompt = useSubmitUserPrompt();
  const { selectedModelId, setSelectedModelId } = useSelectedChatModel(projectId);
  const isSubmittingRef = useRef(false);

  const processingAssistantId = useMemo(() => {
    if (!messages?.length) return null;
    const last = messages[messages.length - 1];
    if (last.role === "assistant" && last.status === "processing") {
      return last._id;
    }
    return null;
  }, [messages]);

  const isProcessing = processingAssistantId !== null;

  const title = !activeConversationId
    ? "New chat"
    : conversation === undefined
      ? "Loading…"
      : conversation === null
        ? "New chat"
        : conversation.title;

  const handleNewChat = useCallback(() => {
    setManualConversationId(null);
  }, [setManualConversationId]);

  const handleSubmit = useCallback(
    async (text: string) => {
      if (isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      try {
        const result = await submitPrompt({
          projectId,
          conversationId: activeConversationId ?? undefined,
          content: text,
          newConversationTitle: activeConversationId ? undefined : "New chat",
          modelId: selectedModelId,
        });
        setManualConversationId(result.conversationId);

        await dispatchMessageSent({
          messageId: result.assistantMessageId,
          conversationId: result.conversationId,
          projectId,
          nonce: result.nonce,
          modelId: result.modelId,
          content: text,
        });

        for (const job of result.cancelledJobs ?? []) {
          if (job.assistantMessageId === result.assistantMessageId) continue;
          await dispatchMessageCancel({
            messageId: job.assistantMessageId,
            nonce: job.nonce,
          });
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Send failed");
        throw e;
      } finally {
        isSubmittingRef.current = false;
      }
    },
    [
      activeConversationId,
      projectId,
      selectedModelId,
      setManualConversationId,
      submitPrompt,
    ],
  );

  const handleStop = useCallback(async () => {
    try {
      await dispatchProjectCancel(projectId);
      toast.message("Generation stopped");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Stop failed");
    }
  }, [projectId]);

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      void handleSubmit(suggestion);
    },
    [handleSubmit],
  );

  return (
    <div
      className={cn(
        "flex h-full min-h-0 min-w-0 flex-col",
        variant === "dockLeft" &&
          "border-r border-border/70 bg-sidebar/30",
        variant === "dockRight" &&
          "border-l border-border/70 bg-sidebar/30",
        variant === "embeddedLeft" && "border-0 bg-sidebar",
      )}
    >
      <ConversationSidebarHeader
        activeConversationId={activeConversationId}
        conversations={conversations}
        isProcessing={isProcessing}
        onModelChange={setSelectedModelId}
        onNewChat={() => void handleNewChat()}
        onSelectConversation={setManualConversationId}
        selectedModelId={selectedModelId}
        title={title}
      />

      <ConversationSidebarMessages
        messages={messages}
        onSuggestionClick={handleSuggestionClick}
      />

      <ConversationSidebarComposer
        isProcessing={isProcessing}
        onStop={() => void handleStop()}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

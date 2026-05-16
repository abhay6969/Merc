"use client";

import { cn } from "@/lib/utils";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useActiveConversationContext } from "../state/active-conversation";
import { useConversation, useCreateConversation } from "../hooks/use-conversations";
import {
  useMessages,
  useRequestCancelGeneration,
  useSubmitUserPrompt,
} from "../hooks/use-messages";
import { useSelectedChatModel } from "../hooks/use-selected-chat-model";
import {
  dispatchMessageCancel,
  dispatchMessageSent,
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
  const messages = useMessages(activeConversationId);
  const createConversation = useCreateConversation();
  const submitPrompt = useSubmitUserPrompt();
  const cancelGeneration = useRequestCancelGeneration();
  const { selectedModelId, setSelectedModelId } = useSelectedChatModel(projectId);

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
    ? "Chat"
    : conversation === undefined
      ? "Loading…"
      : conversation === null
        ? "Chat"
        : conversation.title;

  const handleNewChat = useCallback(async () => {
    try {
      const id = await createConversation({
        projectId,
        title: "New chat",
      });
      setManualConversationId(id);
      toast.success("New conversation");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create chat");
    }
  }, [createConversation, projectId, setManualConversationId]);

  const handleSubmit = useCallback(
    async (text: string) => {
      try {
        const result = await submitPrompt({
          projectId,
          conversationId: activeConversationId ?? undefined,
          content: text,
          newConversationTitle: undefined,
          modelId: selectedModelId,
        });
        setManualConversationId(result.conversationId);
        await dispatchMessageSent({
          assistantMessageId: result.assistantMessageId,
          conversationId: result.conversationId,
          projectId,
          nonce: result.nonce,
          modelId: result.modelId,
        });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Send failed");
        throw e;
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
    if (!processingAssistantId || !messages?.length) return;
    const processingMsg = messages.find((m) => m._id === processingAssistantId);
    const nonce = processingMsg?.generationNonce;
    try {
      const result = await cancelGeneration({
        assistantMessageId: processingAssistantId,
      });
      if (result.cancelled && nonce) {
        await dispatchMessageCancel({
          assistantMessageId: processingAssistantId,
          nonce,
        });
      }
      toast.message("Generation stopped");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Stop failed");
    }
  }, [cancelGeneration, messages, processingAssistantId]);

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

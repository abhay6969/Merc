"use client";

import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { CHAT_MODEL_OPTIONS } from "../lib/chat-models";

type ConversationSidebarMessageProps = {
  message: Doc<"messages">;
};

export function ConversationSidebarMessage({
  message,
}: ConversationSidebarMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const isProcessing =
    message.role === "assistant" && message.status === "processing";
  const isCancelled =
    message.role === "assistant" && message.status === "cancelled";

  const modelLabel = useMemo(() => {
    if (message.role !== "assistant" || !message.modelId || isProcessing) {
      return null;
    }
    return (
      CHAT_MODEL_OPTIONS.find((m) => m.id === message.modelId)?.label ??
      message.modelId
    );
  }, [isProcessing, message.modelId, message.role]);

  const handleCopy = useCallback(async () => {
    if (!message.content) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast.success("Copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed");
    }
  }, [message.content]);

  return (
    <Message from={isUser ? "user" : "assistant"}>
      <MessageContent>
        {isProcessing ? (
          <Shimmer className="text-sm text-muted-foreground">
            Thinking…
          </Shimmer>
        ) : isCancelled ? (
          <p className="text-muted-foreground text-sm italic">
            {message.content || "Request cancelled"}
          </p>
        ) : isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <MessageResponse>{message.content || " "}</MessageResponse>
        )}
      </MessageContent>
      {!isUser && !isProcessing && !isCancelled && message.content.length > 0 ? (
        <MessageActions>
          <MessageAction
            tooltip={copied ? "Copied" : "Copy"}
            label="Copy message"
            onClick={() => void handleCopy()}
          >
            {copied ? (
              <CheckIcon className="size-3.5" />
            ) : (
              <CopyIcon className="size-3.5" />
            )}
          </MessageAction>
        </MessageActions>
      ) : null}
      {modelLabel ? (
        <p className="text-[10px] text-muted-foreground">{modelLabel}</p>
      ) : null}
    </Message>
  );
}

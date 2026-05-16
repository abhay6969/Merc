"use client";

import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import type { ChatStatus } from "ai";
import { useCallback, useMemo } from "react";

type ConversationSidebarComposerProps = {
  isProcessing: boolean;
  onSubmit: (text: string) => Promise<void>;
  onStop: () => void;
};

export function ConversationSidebarComposer({
  isProcessing,
  onSubmit,
  onStop,
}: ConversationSidebarComposerProps) {
  const chatStatus: ChatStatus = isProcessing ? "streaming" : "ready";

  const handleSubmit = useCallback(
    async (message: PromptInputMessage) => {
      const trimmed = message.text.trim();
      if (!trimmed || isProcessing) return;
      await onSubmit(trimmed);
    },
    [isProcessing, onSubmit],
  );

  const submitHint = useMemo(
    () =>
      isProcessing
        ? "Click stop to cancel generation"
        : "Enter to send · Shift+Enter for newline",
    [isProcessing],
  );

  return (
    <div className="shrink-0 border-t border-border/60 bg-background/80 backdrop-blur-sm">
      <PromptInput
        className="border-0 bg-transparent shadow-none"
        onSubmit={handleSubmit}
      >
        <PromptInputBody>
          <PromptInputTextarea
            className="min-h-14 text-sm"
            disabled={isProcessing}
            placeholder="Ask about your project…"
          />
        </PromptInputBody>
        <PromptInputFooter className="justify-end gap-2 pb-1">
          <PromptInputSubmit
            onStop={onStop}
            status={chatStatus}
            variant="default"
          />
        </PromptInputFooter>
      </PromptInput>
      <p className="px-3 pb-2 text-[10px] text-muted-foreground">{submitHint}</p>
    </div>
  );
}

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
    <div className="shrink-0 border-t border-white/[0.06] bg-[#0b1220]/90 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:p-3">
      <PromptInput
        className="rounded-xl border border-white/[0.08] bg-white/[0.04] shadow-lg shadow-black/20"
        onSubmit={handleSubmit}
      >
        <PromptInputBody>
          <PromptInputTextarea
            className="min-h-12 text-sm text-[#f8fafc] placeholder:text-slate-500"
            disabled={isProcessing}
            placeholder="Ask Mercenary about your project…"
          />
        </PromptInputBody>
        <PromptInputFooter className="justify-end gap-2 px-2 pb-2">
          <PromptInputSubmit
            className="bg-emerald-600 text-white hover:bg-emerald-500"
            onStop={onStop}
            status={chatStatus}
            variant="default"
          />
        </PromptInputFooter>
      </PromptInput>
      <p className="px-1 pt-1.5 text-center text-[10px] text-slate-500">
        {submitHint}
      </p>
    </div>
  );
}

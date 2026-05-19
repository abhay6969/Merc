"use client";

import ky, { HTTPError } from "ky";
import { Loader2Icon, SparklesIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type NewProjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function NewProjectDialog({ open, onOpenChange }: NewProjectDialogProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (message: PromptInputMessage) => {
      const prompt = message.text.trim();
      if (!prompt || submitting) return;

      setSubmitting(true);
      try {
        const { projectId, conversationId } = await ky
          .post("/api/projects/create-with-prompt", {
            json: { prompt },
          })
          .json<{ projectId: string; conversationId: string }>();

        try {
          sessionStorage.setItem(`merc:pendingConv:${projectId}`, conversationId);
        } catch {
          /* ignore */
        }

        toast.success("Project created — Polaris is building");
        onOpenChange(false);
        router.push(`/projects/${projectId}`);
      } catch (e) {
        if (e instanceof HTTPError) {
          const body = (await e.response.json().catch(() => null)) as {
            error?: string;
          } | null;
          toast.error(body?.error ?? "Could not create project");
          return;
        }
        toast.error(e instanceof Error ? e.message : "Could not create project");
      } finally {
        setSubmitting(false);
      }
    },
    [onOpenChange, router, submitting],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <SparklesIcon className="size-4 text-primary" />
            New project
          </DialogTitle>
          <DialogDescription>
            Describe what you want to build. Merc creates a project and starts
            the first AI response automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="px-3 pb-4">
          <PromptInput
            className="rounded-xl border border-border/80 bg-muted/20 shadow-sm"
            onSubmit={handleSubmit}
          >
            <PromptInputBody>
              <PromptInputTextarea
                className="min-h-[88px] text-sm"
                disabled={submitting}
                placeholder="Ask Polaris to build…"
              />
            </PromptInputBody>
            <PromptInputFooter className="justify-end gap-2 px-2 pb-2">
              <PromptInputSubmit
                disabled={submitting}
                status={submitting ? "submitted" : "ready"}
              />
            </PromptInputFooter>
          </PromptInput>
          {submitting && (
            <p className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2Icon className="size-3.5 animate-spin" />
              Creating project and starting AI…
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

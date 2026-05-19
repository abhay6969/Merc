"use client";

import { useClerk } from "@clerk/nextjs";
import { useForm } from "@tanstack/react-form";
import ky, { HTTPError } from "ky";
import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { PRO_PLAN_REQUIRED } from "@/lib/pro-plan";
import { parseGitHubUrl } from "../lib/parse-github-url";

const importSchema = z.object({
  url: z
    .string()
    .min(1, "Repository URL is required")
    .superRefine((value, ctx) => {
      try {
        parseGitHubUrl(value);
      } catch (e) {
        ctx.addIssue({
          code: "custom",
          message:
            e instanceof Error
              ? e.message
              : "Use https://github.com/owner/repo or owner/repo",
        });
      }
    }),
  name: z.string().max(120).optional(),
});

type ImportGithubDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ImportGithubDialog({ open, onOpenChange }: ImportGithubDialogProps) {
  const router = useRouter();
  const { openUserProfile } = useClerk();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    defaultValues: {
      url: "",
      name: "",
    },
    onSubmit: async ({ value }) => {
      const parsed = importSchema.safeParse(value);
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
        return;
      }

      setSubmitting(true);
      try {
        const result = await ky
          .post("/api/github/import", {
            json: {
              url: parsed.data.url,
              ...(parsed.data.name?.trim()
                ? { name: parsed.data.name.trim() }
                : {}),
            },
          })
          .json<{ projectId: string }>();

        toast.success("Import started");
        onOpenChange(false);
        form.reset();
        router.push(`/projects/${result.projectId}`);
      } catch (e) {
        if (e instanceof HTTPError) {
          const body = (await e.response.json().catch(() => null)) as {
            error?: string;
            code?: string;
          } | null;
          if (body?.code === "GITHUB_NOT_CONNECTED") {
            toast.error("Connect GitHub in your account settings");
            openUserProfile();
            return;
          }
          if (
            body?.code === "PRO_PLAN_REQUIRED" ||
            body?.error === PRO_PLAN_REQUIRED
          ) {
            toast.error("Upgrade to import repositories", {
              action: {
                label: "Upgrade",
                onClick: () => openUserProfile(),
              },
            });
            return;
          }
          toast.error(body?.error ?? "Import failed");
          return;
        }
        toast.error(e instanceof Error ? e.message : "Import failed");
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import from GitHub</DialogTitle>
          <DialogDescription>
            Clone a public or private repository into a new Merc project. GitHub
            must be connected with the <code className="text-xs">repo</code>{" "}
            scope.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
        >
          <form.Field name="url">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="github-url">Repository URL</Label>
                <Input
                  id="github-url"
                  placeholder="https://github.com/owner/repo"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(ev) => field.handleChange(ev.target.value)}
                  disabled={submitting}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="name">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="project-name">Project name (optional)</Label>
                <Input
                  id="project-name"
                  placeholder="Defaults to repository name"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(ev) => field.handleChange(ev.target.value)}
                  disabled={submitting}
                />
              </div>
            )}
          </form.Field>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Importing…
                </>
              ) : (
                "Import"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

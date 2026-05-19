"use client";

import { useClerk } from "@clerk/nextjs";
import { useForm } from "@tanstack/react-form";
import { HTTPError } from "ky";
import ky from "ky";
import {
  CheckCircle2Icon,
  ExternalLinkIcon,
  Loader2Icon,
  XCircleIcon,
} from "lucide-react";
import { useState } from "react";
import { FaGithub } from "react-icons/fa";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useProject } from "@/features/projects/hooks/use-projects";
import { PRO_PLAN_REQUIRED } from "@/lib/pro-plan";
import { githubExportSchema } from "@/features/projects/lib/github-repo-name";

import type { Id } from "../../../../convex/_generated/dataModel";

type ExportPopoverProps = {
  projectId: Id<"project">;
  trigger: React.ReactNode;
};

async function readApiError(error: unknown): Promise<string> {
  if (error instanceof HTTPError) {
    const body = (await error.response.json().catch(() => null)) as {
      error?: string;
      code?: string;
    } | null;
    return body?.error ?? error.message;
  }
  return error instanceof Error ? error.message : "Request failed";
}

export function ExportPopover({ projectId, trigger }: ExportPopoverProps) {
  const project = useProject(projectId);
  const { openUserProfile } = useClerk();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const exportStatus = project?.exportStatus;
  const isExporting = exportStatus === "exporting";
  const isCompleted = exportStatus === "completed";
  const isFailed = exportStatus === "failed";
  const isCancelled = exportStatus === "cancelled";
  const isIdle = !exportStatus || isCancelled || isFailed;

  const form = useForm({
    defaultValues: {
      repositoryName: project?.name ?? "",
      visibility: "private" as "public" | "private",
      description: "",
    },
    onSubmit: async ({ value }) => {
      const parsed = githubExportSchema.safeParse({
        projectId,
        ...value,
      });
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
        return;
      }

      setBusy(true);
      try {
        await ky.post("/api/github/export", { json: parsed.data });
        toast.success("Export started");
      } catch (e) {
        if (e instanceof HTTPError) {
          const body = (await e.response.json().catch(() => null)) as {
            code?: string;
            error?: string;
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
            toast.error("Upgrade to export repositories", {
              action: {
                label: "Upgrade",
                onClick: () => openUserProfile(),
              },
            });
            return;
          }
        }
        toast.error(await readApiError(e));
      } finally {
        setBusy(false);
      }
    },
  });

  const handleCancel = async () => {
    setBusy(true);
    try {
      await ky.post("/api/github/export/cancel", { json: { projectId } });
      toast.success("Export cancelled");
    } catch (e) {
      toast.error(await readApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    setBusy(true);
    try {
      await ky.post("/api/github/export/reset", { json: { projectId } });
      toast.success("Export reset — you can export to a new repository");
      form.reset();
    } catch (e) {
      toast.error(await readApiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <PopoverHeader>
          <PopoverTitle className="flex items-center gap-2">
            <FaGithub className="size-4" />
            Export to GitHub
          </PopoverTitle>
          <PopoverDescription>
            Push project files to a new GitHub repository.
          </PopoverDescription>
        </PopoverHeader>

        {isExporting && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
            <p className="text-sm font-medium">Exporting to GitHub…</p>
            <p className="text-xs text-muted-foreground">
              This may take a minute for larger projects.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => void handleCancel()}
            >
              Cancel export
            </Button>
          </div>
        )}

        {isCompleted && project?.exportRepoUrl && (
          <div className="flex flex-col gap-3 py-2">
            <div className="flex items-start gap-2 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle2Icon className="mt-0.5 size-4 shrink-0" />
              <span>Repository created successfully.</span>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a
                href={project.exportRepoUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLinkIcon className="size-4" />
                Open repository
              </a>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => void handleReset()}
            >
              Export to another repo
            </Button>
          </div>
        )}

        {isFailed && (
          <div className="flex flex-col gap-3 py-2">
            <div className="flex items-start gap-2 text-sm text-destructive">
              <XCircleIcon className="mt-0.5 size-4 shrink-0" />
              <span>Export failed. Try again or reset to start over.</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => void handleReset()}
            >
              Reset export
            </Button>
          </div>
        )}

        {isIdle && !isExporting && (
          <form
            className="flex flex-col gap-3 pt-2"
            onSubmit={(e) => {
              e.preventDefault();
              void form.handleSubmit();
            }}
          >
            <form.Field name="repositoryName">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor="repo-name">Repository name</Label>
                  <Input
                    id="repo-name"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(ev) => field.handleChange(ev.target.value)}
                    disabled={busy}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="visibility">
              {(field) => (
                <div className="space-y-1.5">
                  <Label>Visibility</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={(v) =>
                      field.handleChange(v as "public" | "private")
                    }
                    disabled={busy}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>

            <form.Field name="description">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor="repo-desc">Description (optional)</Label>
                  <Textarea
                    id="repo-desc"
                    rows={2}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(ev) => field.handleChange(ev.target.value)}
                    disabled={busy}
                  />
                </div>
              )}
            </form.Field>

            <Button type="submit" disabled={busy} className="w-full">
              {busy ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Starting…
                </>
              ) : (
                "Export"
              )}
            </Button>
          </form>
        )}
      </PopoverContent>
    </Popover>
  );
}

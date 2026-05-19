"use client";

import { useForm } from "@tanstack/react-form";
import { useEffect, useState, type ReactNode } from "react";
import { z } from "zod";

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
import { useUpdateProjectSettings } from "@/features/projects/hooks/use-update-project-settings";

import type { Id } from "../../../../convex/_generated/dataModel";
import type { ProjectPreviewSettings } from "../types";

const settingsSchema = z.object({
  installCommand: z.string(),
  devCommand: z.string(),
});

type PreviewSettingsPopoverProps = {
  projectId: Id<"project">;
  settings: ProjectPreviewSettings;
  onSaved?: () => void;
  trigger: ReactNode;
};

export function PreviewSettingsPopover({
  projectId,
  settings,
  onSaved,
  trigger,
}: PreviewSettingsPopoverProps) {
  const updateSettings = useUpdateProjectSettings();
  const [open, setOpen] = useState(false);

  const form = useForm({
    defaultValues: {
      installCommand: settings.installCommand ?? "",
      devCommand: settings.devCommand ?? "",
    },
    onSubmit: async ({ value }) => {
      const parsed = settingsSchema.parse(value);
      await updateSettings({
        projectId,
        settings: {
          installCommand:
            parsed.installCommand.trim().length > 0
              ? parsed.installCommand.trim()
              : undefined,
          devCommand:
            parsed.devCommand.trim().length > 0
              ? parsed.devCommand.trim()
              : undefined,
        },
      });
      onSaved?.();
      setOpen(false);
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    form.reset({
      installCommand: settings.installCommand ?? "",
      devCommand: settings.devCommand ?? "",
    });
  }, [open, settings.devCommand, settings.installCommand, form]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <PopoverHeader>
          <PopoverTitle>Preview settings</PopoverTitle>
          <PopoverDescription>
            Override install and dev commands for this project&apos;s WebContainer
            preview.
          </PopoverDescription>
        </PopoverHeader>
        <form
          className="mt-4 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <form.Field name="installCommand">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="installCommand">Install command</Label>
                <Input
                  id="installCommand"
                  placeholder="npm install"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to use npm install.
                </p>
              </div>
            )}
          </form.Field>
          <form.Field name="devCommand">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="devCommand">Dev command</Label>
                <Input
                  id="devCommand"
                  placeholder="npm run dev"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to use npm run dev.
                </p>
              </div>
            )}
          </form.Field>
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Save settings"}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </PopoverContent>
    </Popover>
  );
}

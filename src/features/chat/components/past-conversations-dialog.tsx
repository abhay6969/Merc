"use client";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { Doc } from "../../../../convex/_generated/dataModel";
import type { Id } from "../../../../convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";

type PastConversationsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversations: Doc<"conversations">[] | undefined;
  activeConversationId: Id<"conversations"> | null;
  onSelect: (id: Id<"conversations">) => void;
};

export function PastConversationsDialog({
  open,
  onOpenChange,
  conversations,
  activeConversationId,
  onSelect,
}: PastConversationsDialogProps) {
  const sorted = [...(conversations ?? [])].sort(
    (a, b) => b.updatedAt - a.updatedAt,
  );

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Past conversations"
      description="Search and open a previous chat"
    >
      <CommandInput placeholder="Search conversations…" />
      <CommandList>
        <CommandEmpty>No conversations found.</CommandEmpty>
        <CommandGroup heading="Recent">
          {sorted.map((conversation) => (
            <CommandItem
              key={conversation._id}
              value={`${conversation.title} ${conversation._id}`}
              onSelect={() => {
                onSelect(conversation._id);
                onOpenChange(false);
              }}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span
                  className={
                    conversation._id === activeConversationId
                      ? "truncate font-medium"
                      : "truncate"
                  }
                >
                  {conversation.title}
                </span>
                <span className="text-muted-foreground text-xs">
                  {formatDistanceToNow(conversation.updatedAt, {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

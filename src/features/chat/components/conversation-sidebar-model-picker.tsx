"use client";

import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon } from "lucide-react";
import { useMemo, useState } from "react";
import {
  SIDEBAR_CHAT_MODEL_OPTIONS,
  type ChatModelId,
} from "../lib/chat-models";

type ConversationSidebarModelPickerProps = {
  value: ChatModelId;
  onChange: (id: ChatModelId) => void;
  disabled?: boolean;
};

const MODEL_GROUPS = [
  { heading: "Gemini 2.5", prefix: "gemini-2.5-" },
  { heading: "Gemini 2.0", prefix: "gemini-2.0-" },
  { heading: "Gemini 1.5", prefix: "gemini-1.5-" },
  { heading: "Gemini 3", prefix: "gemini-3" },
  { heading: "Gemma", prefix: "gemma-" },
] as const;

export function ConversationSidebarModelPicker({
  value,
  onChange,
  disabled = false,
}: ConversationSidebarModelPickerProps) {
  const [open, setOpen] = useState(false);

  const selectedLabel = useMemo(
    () =>
      SIDEBAR_CHAT_MODEL_OPTIONS.find((m) => m.id === value)?.label ?? value,
    [value],
  );

  const grouped = useMemo(() => {
    const used = new Set<string>();
    const groups: { heading: string; items: typeof SIDEBAR_CHAT_MODEL_OPTIONS }[] =
      MODEL_GROUPS.map(({ heading, prefix }) => {
        const items = SIDEBAR_CHAT_MODEL_OPTIONS.filter((m) => {
          if (!m.id.startsWith(prefix)) return false;
          used.add(m.id);
          return true;
        });
        return { heading, items };
      }).filter((g) => g.items.length > 0);

    const other = SIDEBAR_CHAT_MODEL_OPTIONS.filter((m) => !used.has(m.id));
    if (other.length > 0) {
      groups.push({ heading: "Other", items: other });
    }
    return groups;
  }, []);

  return (
    <ModelSelector onOpenChange={setOpen} open={open}>
      <ModelSelectorTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className="h-8 min-w-0 max-w-full gap-1.5 px-2 text-xs"
        >
          <ModelSelectorLogo provider="google" className="size-3.5" />
          <ModelSelectorName className="text-xs">
            {selectedLabel}
          </ModelSelectorName>
          <ChevronDownIcon className="size-3 shrink-0 opacity-60" />
        </Button>
      </ModelSelectorTrigger>
      <ModelSelectorContent title="Choose a model">
        <ModelSelectorInput placeholder="Search models…" />
        <ModelSelectorList>
          <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
          {grouped.map((group) => (
            <ModelSelectorGroup heading={group.heading} key={group.heading}>
              {group.items.map((model) => (
                <ModelSelectorItem
                  key={model.id}
                  value={model.id}
                  onSelect={() => {
                    onChange(model.id);
                    setOpen(false);
                  }}
                >
                  <ModelSelectorLogo provider="google" />
                  <span className="flex-1 truncate">{model.label}</span>
                </ModelSelectorItem>
              ))}
            </ModelSelectorGroup>
          ))}
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  );
}

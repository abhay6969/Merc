"use client";

import { useEffect, useMemo, useState } from "react";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  DEFAULT_CHAT_MODEL_ID,
  SIDEBAR_CHAT_MODEL_OPTIONS,
  type ChatModelId,
} from "../lib/chat-models";

export function useSelectedChatModel(projectId: Id<"project">) {
  const storageKey = useMemo(
    () => `merc:projectChatModel:${projectId}`,
    [projectId],
  );

  const [selectedModelId, setSelectedModelId] =
    useState<ChatModelId>(DEFAULT_CHAT_MODEL_ID);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem(storageKey);
    if (raw && SIDEBAR_CHAT_MODEL_OPTIONS.some((opt) => opt.id === raw)) {
      setTimeout(() => setSelectedModelId(raw as ChatModelId), 0);
    }
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(storageKey, selectedModelId);
  }, [storageKey, selectedModelId]);

  const selectedModel = useMemo(
    () =>
      SIDEBAR_CHAT_MODEL_OPTIONS.find((m) => m.id === selectedModelId) ??
      SIDEBAR_CHAT_MODEL_OPTIONS[0],
    [selectedModelId],
  );

  return {
    selectedModelId,
    setSelectedModelId,
    selectedModel,
  };
}

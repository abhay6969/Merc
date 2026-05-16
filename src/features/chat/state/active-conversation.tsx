"use client";

import type { Doc } from "../../../../convex/_generated/dataModel";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useConversations } from "../hooks/use-conversations";

const STORAGE_PREFIX = "merc:activeConv:";

type ActiveConversationContextValue = {
  projectId: Id<"project">;
  /** Resolved conversation for UI (manual pick or newest). */
  activeConversationId: Id<"conversations"> | null;
  /** User-picked id; persisted in sessionStorage. */
  manualConversationId: Id<"conversations"> | null;
  setManualConversationId: (id: Id<"conversations"> | null) => void;
  conversations: Doc<"conversations">[] | undefined;
};

const ActiveConversationContext =
  createContext<ActiveConversationContextValue | null>(null);

function storageKey(projectId: Id<"project">) {
  return `${STORAGE_PREFIX}${projectId}`;
}

function readStoredManual(
  projectId: Id<"project">,
): Id<"conversations"> | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(storageKey(projectId));
    return raw && raw.length > 0 ? (raw as Id<"conversations">) : null;
  } catch {
    return null;
  }
}

export function ActiveConversationProvider({
  projectId,
  children,
}: {
  projectId: Id<"project">;
  children: React.ReactNode;
}) {
  const conversations = useConversations(projectId);
  const [manualConversationId, setManualConversationIdState] = useState<
    Id<"conversations"> | null
  >(() => readStoredManual(projectId));

  useEffect(() => {
    setManualConversationIdState(readStoredManual(projectId));
  }, [projectId]);

  const setManualConversationId = useCallback(
    (id: Id<"conversations"> | null) => {
      setManualConversationIdState(id);
      try {
        if (id === null) {
          sessionStorage.removeItem(storageKey(projectId));
        } else {
          sessionStorage.setItem(storageKey(projectId), id);
        }
      } catch {
        /* ignore */
      }
    },
    [projectId],
  );

  const sorted = useMemo(() => {
    if (!conversations) return [];
    return [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [conversations]);

  const newestId = sorted[0]?._id ?? null;

  const activeConversationId = useMemo(() => {
    if (manualConversationId) {
      const exists = conversations?.some((c) => c._id === manualConversationId);
      if (exists) return manualConversationId;
    }
    return newestId;
  }, [manualConversationId, conversations, newestId]);

  useEffect(() => {
    if (
      manualConversationId &&
      conversations &&
      !conversations.some((c) => c._id === manualConversationId)
    ) {
      setManualConversationId(null);
    }
  }, [manualConversationId, conversations, setManualConversationId]);

  const value = useMemo(
    () => ({
      projectId,
      activeConversationId,
      manualConversationId,
      setManualConversationId,
      conversations,
    }),
    [
      projectId,
      activeConversationId,
      manualConversationId,
      setManualConversationId,
      conversations,
    ],
  );

  return (
    <ActiveConversationContext.Provider value={value}>
      {children}
    </ActiveConversationContext.Provider>
  );
}

export function useActiveConversationContext(): ActiveConversationContextValue {
  const ctx = useContext(ActiveConversationContext);
  if (!ctx) {
    throw new Error(
      "useActiveConversationContext must be used within ActiveConversationProvider",
    );
  }
  return ctx;
}

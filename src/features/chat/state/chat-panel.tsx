"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const CHAT_DOCK_QUERY = "(min-width: 1024px)";

type ChatPanelContextValue = {
  isDocked: boolean;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  openMobileChat: () => void;
};

const ChatPanelContext = createContext<ChatPanelContextValue | null>(null);

export function ChatPanelProvider({ children }: { children: React.ReactNode }) {
  const [isDocked, setIsDocked] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(CHAT_DOCK_QUERY);
    const sync = () => {
      const docked = mql.matches;
      setIsDocked(docked);
      if (docked) {
        setMobileOpen(false);
      }
    };
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);

  const openMobileChat = useCallback(() => {
    setMobileOpen(true);
  }, []);

  const value = useMemo(
    () => ({
      isDocked,
      mobileOpen,
      setMobileOpen,
      openMobileChat,
    }),
    [isDocked, mobileOpen, openMobileChat],
  );

  return (
    <ChatPanelContext.Provider value={value}>
      {children}
    </ChatPanelContext.Provider>
  );
}

export function useChatPanel(): ChatPanelContextValue {
  const ctx = useContext(ChatPanelContext);
  if (!ctx) {
    throw new Error("useChatPanel must be used within ChatPanelProvider");
  }
  return ctx;
}

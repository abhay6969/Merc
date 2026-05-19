"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { ConversationSidebar } from "./conversation-sidebar";
import { useChatPanel } from "../state/chat-panel";

export function ConversationSidebarMobileSheet() {
  const { mobileOpen, setMobileOpen, isDocked } = useChatPanel();

  if (isDocked) {
    return null;
  }

  return (
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <SheetContent
        side="left"
        showCloseButton
        className="w-full max-w-full gap-0 border-r border-border/60 p-0 sm:max-w-[min(100vw,28rem)]"
      >
        <SheetTitle className="sr-only">Project chat</SheetTitle>
        <SheetDescription className="sr-only">
          AI assistant for this project
        </SheetDescription>
        <ConversationSidebar variant="embeddedLeft" />
      </SheetContent>
    </Sheet>
  );
}

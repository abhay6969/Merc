/**
 * Re-exports the canonical model registry from Convex.
 * Sidebar UI should use `SIDEBAR_CHAT_MODEL_OPTIONS` (chat capability only).
 */
export {
  CHAT_MODEL_OPTIONS,
  DEFAULT_CHAT_MODEL_ID,
  SIDEBAR_CHAT_MODEL_OPTIONS,
  hasModelCapability,
  parseChatModelId,
  parseSidebarChatModelId,
  resolveGoogleApiModelId,
  type ChatModelId,
  type ModelCapability,
} from "../../../../convex/lib/chatModels";

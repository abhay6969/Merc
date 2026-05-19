/**
 * Model registry for chat and related Google AI capabilities.
 * Re-exported by `src/features/chat/lib/chat-models.ts` for the UI.
 *
 * `id` — stored on messages and shown in the picker.
 * `apiModelId` — Google Generative AI model name for API calls.
 */
export type ModelCapability =
  | "chat"
  | "completion"
  | "embedding"
  | "tts"
  | "live";

export const CHAT_MODEL_OPTIONS = [
  // =========================
  // Gemini 2.5
  // =========================
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    apiModelId: "gemini-2.5-flash",
    capabilities: ["chat", "completion"],
  },
  {
    id: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    apiModelId: "gemini-2.5-pro",
    capabilities: ["chat", "completion"],
  },
  {
    id: "gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash Lite",
    apiModelId: "gemini-2.5-flash-lite",
    capabilities: ["chat", "completion"],
  },

  // =========================
  // Gemini 2.0
  // =========================
  {
    id: "gemini-2.0-flash",
    label: "Gemini 2.0 Flash",
    apiModelId: "gemini-2.0-flash",
    capabilities: ["chat", "completion"],
  },
  {
    id: "gemini-2.0-flash-lite",
    label: "Gemini 2.0 Flash Lite",
    apiModelId: "gemini-2.0-flash-lite",
    capabilities: ["chat", "completion"],
  },

  // =========================
  // Gemini 1.5
  // =========================
  {
    id: "gemini-1.5-pro",
    label: "Gemini 1.5 Pro",
    apiModelId: "gemini-1.5-pro",
    capabilities: ["chat", "completion"],
  },

  // =========================
  // Gemini 3
  // =========================
  {
    id: "gemini-3-flash",
    label: "Gemini 3 Flash",
    apiModelId: "gemini-3-flash",
    capabilities: ["chat", "completion"],
  },
  {
    id: "gemini-3.1-flash-lite",
    label: "Gemini 3.1 Flash Lite",
    apiModelId: "gemini-3.1-flash-lite",
    capabilities: ["chat", "completion"],
  },
  {
    id: "gemini-3.1-pro",
    label: "Gemini 3.1 Pro",
    apiModelId: "gemini-3.1-pro",
    capabilities: ["chat", "completion"],
  },

  // =========================
  // Gemma 4
  // =========================
  {
    id: "gemma-4-31b",
    label: "Gemma 4 31B",
    apiModelId: "gemma-4-31b-it",
    capabilities: ["chat", "completion"],
  },
  {
    id: "gemma-4-26b",
    label: "Gemma 4 26B",
    apiModelId: "gemma-4-26b-a4b-it",
    capabilities: ["chat", "completion"],
  },

  // =========================
  // Embeddings
  // =========================
  {
    id: "gemini-embedding-1",
    label: "Gemini Embedding 1",
    apiModelId: "text-embedding-004",
    capabilities: ["embedding"],
  },
  {
    id: "gemini-embedding-2",
    label: "Gemini Embedding 2",
    apiModelId: "gemini-embedding-002",
    capabilities: ["embedding"],
  },

  // =========================
  // TTS
  // =========================
  {
    id: "gemini-2.5-flash-tts",
    label: "Gemini 2.5 Flash TTS",
    apiModelId: "gemini-2.5-flash-tts-preview",
    capabilities: ["tts"],
  },
  {
    id: "gemini-3.1-flash-tts",
    label: "Gemini 3.1 Flash TTS",
    apiModelId: "gemini-3.1-flash-tts-preview",
    capabilities: ["tts"],
  },

  // =========================
  // Live API
  // =========================
  {
    id: "gemini-3-flash-live",
    label: "Gemini 3 Flash Live",
    apiModelId: "gemini-3-flash-live",
    capabilities: ["live"],
  },
] as const;

export type ChatModelId = (typeof CHAT_MODEL_OPTIONS)[number]["id"];

type ModelOption = (typeof CHAT_MODEL_OPTIONS)[number];

const ID_SET = new Set<string>(CHAT_MODEL_OPTIONS.map((m) => m.id));

const API_MODEL_BY_CHAT_ID = new Map<string, string>(
  CHAT_MODEL_OPTIONS.map((m) => [m.id, m.apiModelId]),
);

const MODEL_BY_ID = new Map<string, ModelOption>(
  CHAT_MODEL_OPTIONS.map((m) => [m.id, m]),
);

/** Models shown in the conversation sidebar picker. */
export const SIDEBAR_CHAT_MODEL_OPTIONS = CHAT_MODEL_OPTIONS.filter((m) =>
  (m.capabilities as readonly ModelCapability[]).includes("chat"),
);

export const DEFAULT_CHAT_MODEL_ID: ChatModelId =
  SIDEBAR_CHAT_MODEL_OPTIONS[0]?.id ?? "gemini-2.5-flash";

const DEFAULT_API_MODEL_ID =
  API_MODEL_BY_CHAT_ID.get(DEFAULT_CHAT_MODEL_ID) ?? "gemini-2.5-flash";

export function hasModelCapability(
  id: string,
  capability: ModelCapability,
): boolean {
  const model = MODEL_BY_ID.get(id);
  if (!model) return false;
  return (model.capabilities as readonly ModelCapability[]).includes(
    capability,
  );
}

export function parseChatModelId(
  raw: string | undefined,
): ChatModelId | undefined {
  if (raw === undefined || raw === "") {
    return undefined;
  }
  return ID_SET.has(raw) ? (raw as ChatModelId) : undefined;
}

/** Sidebar / Inngest text chat — must have the `chat` capability. */
export function parseSidebarChatModelId(
  raw: string | undefined,
): ChatModelId | undefined {
  const id = parseChatModelId(raw);
  if (!id || !hasModelCapability(id, "chat")) {
    return undefined;
  }
  return id;
}

/** Google Generative AI model id for generateContent (AI SDK). */
export function resolveGoogleApiModelId(chatModelId: string): string {
  return API_MODEL_BY_CHAT_ID.get(chatModelId) ?? DEFAULT_API_MODEL_ID;
}

export function isChatCompletionModelId(id: string): boolean {
  return hasModelCapability(id, "chat");
}

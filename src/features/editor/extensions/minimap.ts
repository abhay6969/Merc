import { showMinimap } from "@replit/codemirror-minimap";

export const minimapExtension = showMinimap.of({
  create: () => ({ dom: document.createElement("div") }),
});

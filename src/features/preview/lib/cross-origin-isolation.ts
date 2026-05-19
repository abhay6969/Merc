const PREVIEW_ISOLATION_ERROR =
  "Preview needs a cross-origin isolated page (SharedArrayBuffer). " +
  "Hard-refresh this tab (Ctrl+Shift+R), or open the project URL in a new tab. " +
  "Use Chrome or Edge for full WebContainer support.";

export function assertCrossOriginIsolatedForPreview(): void {
  if (typeof window === "undefined") {
    return;
  }
  if (window.crossOriginIsolated) {
    return;
  }
  throw new Error(PREVIEW_ISOLATION_ERROR);
}

export function isCrossOriginIsolatedForPreview(): boolean {
  return typeof window !== "undefined" && window.crossOriginIsolated;
}

export { PREVIEW_ISOLATION_ERROR };

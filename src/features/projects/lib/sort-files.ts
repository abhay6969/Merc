/** Folders first, then files; alphabetical within each group. */
export function sortFiles<T extends { type: "file" | "folder"; name: string }>(
  files: T[],
): T[] {
  return [...files].sort((a, b) => {
    if (a.type === "folder" && b.type === "file") return -1;
    if (a.type === "file" && b.type === "folder") return 1;
    return a.name.localeCompare(b.name);
  });
}

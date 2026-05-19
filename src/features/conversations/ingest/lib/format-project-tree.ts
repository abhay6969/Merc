import type { ProjectFileMeta } from "../types/pipeline";

const MAX_TREE_LINES = 200;

/**
 * Lightweight project tree for the system prompt (metadata only, no file bodies).
 */
export function formatProjectFileTree(files: ProjectFileMeta[]): string {
  if (files.length === 0) {
    return "_(No files in project yet.)_";
  }

  const byParent = new Map<string | null, ProjectFileMeta[]>();
  for (const file of files) {
    const key = file.parentId;
    const list = byParent.get(key) ?? [];
    list.push(file);
    byParent.set(key, list);
  }

  const lines: string[] = [];

  function walk(parentId: string | null, depth: number): void {
    if (lines.length >= MAX_TREE_LINES) return;
    const children = byParent.get(parentId) ?? [];
    const sorted = [...children].sort((a, b) => {
      if (a.type === "folder" && b.type === "file") return -1;
      if (a.type === "file" && b.type === "folder") return 1;
      return a.name.localeCompare(b.name);
    });

    for (const item of sorted) {
      if (lines.length >= MAX_TREE_LINES) {
        lines.push("…(truncated)");
        return;
      }
      const indent = "  ".repeat(depth);
      const label = item.type === "folder" ? "📁" : "📄";
      lines.push(`${indent}${label} ${item.name} (id: ${item.id})`);
      if (item.type === "folder") {
        walk(item.id, depth + 1);
      }
    }
  }

  walk(null, 0);
  return lines.join("\n");
}

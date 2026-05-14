"use client";

import { PathSegments } from "@/components/ui/path-segments";
import { useFilePath } from "@/features/projects/hooks/use-files";
import type { Id } from "../../../../convex/_generated/dataModel";

export function EditorFileBreadcrumb({
  fileId,
}: {
  fileId: Id<"files">;
}) {
  const path = useFilePath(fileId);

  if (path === undefined) {
    return (
      <div
        className="h-4 max-w-md animate-pulse rounded bg-muted/60"
        aria-hidden
      />
    );
  }

  if (path.length === 0) {
    return null;
  }

  const segments = path.map((segment) => ({
    id: segment._id,
    label: segment.name,
  }));

  return <PathSegments segments={segments} className="py-0.5" />;
}

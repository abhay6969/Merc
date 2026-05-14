import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** One crumb in a folder / file path trail */
export type PathSegment = {
  /** Stable key for list reconciliation */
  id?: string;
  label: string;
};

type PathSegmentsProps = {
  segments: PathSegment[];
  className?: string;
  separator?: React.ReactNode;
};

/**
 * Compact path trail (`Folder > Subfolder > file.ts`). Reusable outside the editor.
 */
export function PathSegments({
  segments,
  className,
  separator,
}: PathSegmentsProps) {
  if (segments.length === 0) {
    return null;
  }

  const sep =
    separator ?? (
      <ChevronRight
        className="size-3.5 shrink-0 text-muted-foreground/60"
        aria-hidden
      />
    );

  return (
    <nav aria-label="Path" className={cn("min-w-0", className)}>
      <ol className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 text-xs">
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;
          const key = segment.id ?? `${index}-${segment.label}`;
          return (
            <li key={key} className="flex min-w-0 items-center gap-1">
              {index > 0 ? sep : null}
              <span
                className={cn(
                  "min-w-0 truncate transition-colors duration-200",
                  isLast
                    ? "font-medium text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {segment.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

import { cn } from "@/lib/utils";

type MercLogoProps = {
  className?: string;
  /** Show wordmark next to mark */
  variant?: "mark" | "full";
};

/**
 * Merc brand mark — geometric “M” + accent bar (design tokens: slate + green CTA).
 */
export function MercLogo({ className, variant = "full" }: MercLogoProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 select-none",
        className,
      )}
    >
      <svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-sm"
        aria-label="Merc logo"
        role="img"
      >
        <title>Merc</title>
        <rect
          x="8"
          y="8"
          width="104"
          height="104"
          rx="20"
          className="fill-muted stroke-border"
          strokeWidth="1"
        />
        <path
          d="M36 88V36h14l16 28 16-28h14v52H84V56L68 84H52L36 56v32z"
          className="fill-foreground"
        />
        <rect x="28" y="24" width="6" height="72" rx="3" className="fill-primary" />
      </svg>
      {variant === "full" ? (
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="font-semibold tracking-tight text-foreground text-xl">
            Merc
          </span>
          <span className="max-w-xs text-muted-foreground text-sm leading-snug">
            Open a file from the sidebar to edit with CodeMirror.
          </span>
        </div>
      ) : null}
    </div>
  );
}

import Image from "next/image";
import { cn } from "@/lib/utils";

type MercenaryLogoProps = {
  className?: string;
  iconClassName?: string;
  showWordmark?: boolean;
  wordmarkClassName?: string;
  size?: "sm" | "md" | "lg";
};

const iconSizes = {
  sm: 20,
  md: 28,
  lg: 40,
} as const;

export function MercenaryLogo({
  className,
  iconClassName,
  showWordmark = true,
  wordmarkClassName,
  size = "md",
}: MercenaryLogoProps) {
  const px = iconSizes[size];

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Image
        src="/logo.svg"
        alt=""
        width={px}
        height={px}
        className={cn("shrink-0", iconClassName)}
        priority
      />
      {showWordmark ? (
        <span
          className={cn(
            "font-semibold tracking-tight text-foreground",
            size === "sm" && "text-sm",
            size === "md" && "text-base",
            size === "lg" && "text-2xl sm:text-3xl",
            wordmarkClassName,
          )}
        >
          Mercenary
        </span>
      ) : null}
    </span>
  );
}

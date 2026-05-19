"use client";

import { formatDistanceToNow } from "date-fns";
import { useSyncExternalStore } from "react";

type RelativeTimeProps = {
  date: number | Date;
  addSuffix?: boolean;
};

function noopSubscribe() {
  return () => {};
}

/** Renders relative time on the client only to avoid SSR/client clock skew. */
export function RelativeTime({ date, addSuffix = true }: RelativeTimeProps) {
  const label = useSyncExternalStore(
    noopSubscribe,
    () => formatDistanceToNow(date, { addSuffix }),
    () => null,
  );

  if (label === null) {
    return <span className="inline-block min-w-[4ch]">&nbsp;</span>;
  }

  return <>{label}</>;
}

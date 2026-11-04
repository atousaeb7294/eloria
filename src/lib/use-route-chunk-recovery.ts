"use client";

import { useEffect } from "react";

export function isRouteChunkError(error: Error) {
  return error.name === "ChunkLoadError" || /Loading (?:CSS )?chunk [\w-]+ failed|Failed to fetch dynamically imported module/i.test(error.message);
}

export function useRouteChunkRecovery(error: Error, reset: () => void, canReload: boolean) {
  const chunkFailed = isRouteChunkError(error);
  useEffect(() => {
    if (!chunkFailed || !canReload || !navigator.onLine) return;
    // Resetting the React boundary alone can keep the failed module promise.
    // Permit one automatic document request per route in a two-minute window.
    const key = "eloria:chunk-recovery:" + location.pathname;
    try {
      const now = Date.now();
      if (now - Number(sessionStorage.getItem(key)) < 120000) return;
      sessionStorage.setItem(key, String(now));
    } catch { return; }
    location.reload();
  }, [chunkFailed, canReload]);
  return chunkFailed ? () => location.reload() : reset;
}

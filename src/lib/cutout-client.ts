type Listener = (url: string) => void;
const entries = new Map<
  string,
  {
    listeners: Set<Listener>;
    attempts: number;
    url?: string;
    stopped?: boolean;
  }
>();
let timer: ReturnType<typeof setTimeout> | undefined;
let running = false;

function schedule(delay: number) {
  if (!timer && !running)
    timer = setTimeout(() => {
      timer = undefined;
      void poll();
    }, delay);
}
async function poll() {
  const ids = [...entries]
    .filter(
      ([, entry]) =>
        entry.listeners.size &&
        !entry.url &&
        !entry.stopped &&
        entry.attempts < 40,
    )
    .map(([id]) => id)
    .slice(0, 24);
  if (!ids.length) return;
  if (document.hidden) {
    schedule(15_000);
    return;
  }
  running = true;
  try {
    for (const id of ids) entries.get(id)!.attempts++;
    const response = await fetch(`/api/media/cutouts?images=${ids.join(",")}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error("Cutout status unavailable");
    const result = (await response.json()) as {
      ready: Record<string, string>;
      pending: string[];
    };
    for (const id of ids) {
      const entry = entries.get(id);
      if (!entry) continue;
      if (result.ready[id]) {
        entry.url = result.ready[id];
        entry.listeners.forEach((listener) => listener(entry.url!));
      } else if (!result.pending.includes(id)) entry.stopped = true;
    }
  } catch {
    /* Preserve the photograph and retry on a bounded timer. */
  } finally {
    running = false;
    schedule(15_000);
  }
}

/** Visible image seats share one request and one retry timer. */
export function observeCutout(id: string, listener: Listener) {
  let entry = entries.get(id);
  if (!entry) {
    entry = { listeners: new Set(), attempts: 0 };
    entries.set(id, entry);
  }
  const current = entry;
  current.listeners.add(listener);
  if (current.url) listener(current.url);
  else schedule(100);
  return () => {
    current.listeners.delete(listener);
    if (!current.listeners.size) entries.delete(id);
    if (!entries.size && timer) {
      clearTimeout(timer);
      timer = undefined;
    }
  };
}

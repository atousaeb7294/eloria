import { BusyError } from "./single-flight";

/** A small bounded queue avoids turning the ninth visible photo into HTTP 503.
 * Duplicate requests share work; only three DB/decode jobs run per process. */
export function createMediaFlight(maxActive = 3, maxPending = 32) {
  const pending = new Map<string, Promise<unknown>>();
  const queue: Array<() => void> = [];
  let active = 0;
  const drain = () => {
    while (active < maxActive && queue.length) {
      active++;
      queue.shift()!();
    }
  };
  return function run<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const existing = pending.get(key);
    if (existing) return existing as Promise<T>;
    if (pending.size >= maxPending) return Promise.reject(new BusyError("Media queue full"));
    let resolve!: (value: T) => void;
    let reject!: (error: unknown) => void;
    const result = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
    pending.set(key, result);
    queue.push(() => {
      void Promise.resolve().then(operation).then(resolve, reject).finally(() => {
        pending.delete(key);
        active--;
        drain();
      });
    });
    drain();
    return result;
  };
}

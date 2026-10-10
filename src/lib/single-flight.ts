/** Retain only active work, with an explicit admission limit per process. */
export class BusyError extends Error {}
export function createSingleFlight(limit: number) {
  const pending = new Map<string, Promise<unknown>>();
  return function run<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const existing = pending.get(key);
    if (existing) return existing as Promise<T>;
    if (pending.size >= limit) return Promise.reject(new BusyError("Capacity reached"));
    const result = Promise.resolve().then(operation).finally(() => {
      if (pending.get(key) === result) pending.delete(key);
    });
    pending.set(key, result);
    return result;
  };
}

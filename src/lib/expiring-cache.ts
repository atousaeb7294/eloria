export type ExpiringCacheEntry = {
  staleUntil: number;
};

export function getRecentlyUsedCacheEntry<Entry extends ExpiringCacheEntry>(
  cache: Map<string, Entry>,
  key: string,
): Entry | undefined {
  const entry =
    cache.get(
      key,
    );

  if (!entry) {
    return undefined;
  }

  cache.delete(
    key,
  );
  cache.set(
    key,
    entry,
  );

  return entry;
}

export function setBoundedExpiringCacheEntry<Entry extends ExpiringCacheEntry>(
  cache: Map<string, Entry>,
  key: string,
  entry: Entry,
  maximumEntries: number,
  now: number,
): void {
  if (
    !Number.isSafeInteger(
      maximumEntries,
    ) ||
    maximumEntries <
    1
  ) {
    throw new RangeError(
      "maximumEntries must be a positive safe integer.",
    );
  }

  for (
    const [cachedKey, cachedEntry] of cache
  ) {
    if (
      cachedEntry.staleUntil <=
      now
    ) {
      cache.delete(
        cachedKey,
      );
    }
  }

  cache.delete(
    key,
  );

  while (
    cache.size >=
    maximumEntries
  ) {
    const oldestKey =
      cache.keys().next()
        .value;

    if (
      typeof oldestKey !==
      "string"
    ) {
      break;
    }

    cache.delete(
      oldestKey,
    );
  }

  cache.set(
    key,
    entry,
  );
}

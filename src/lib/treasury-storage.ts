"use client";

export const TREASURY_STORAGE_KEY =
  "eloria:treasury:v1";

export const TREASURY_CHANGED_EVENT =
  "eloria:treasury-changed";

export type TreasuryStoredItem = {
  slug: string;
  savedAt: string;
};

function sanitize(
  value: unknown,
): TreasuryStoredItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen =
    new Set<string>();

  const result: TreasuryStoredItem[] =
    [];

  for (const item of value) {
    if (
      typeof item !== "object" ||
      item === null
    ) {
      continue;
    }

    const candidate =
      item as Partial<TreasuryStoredItem>;

    const slug =
      typeof candidate.slug === "string"
        ? candidate.slug.trim()
        : "";

    if (
      !slug ||
      seen.has(slug)
    ) {
      continue;
    }

    seen.add(slug);

    result.push({
      slug,
      savedAt:
        typeof candidate.savedAt === "string"
          ? candidate.savedAt
          : new Date().toISOString(),
    });
  }

  return result.slice(0, 100);
}

export function readTreasury(): TreasuryStoredItem[] {
  if (
    typeof window === "undefined"
  ) {
    return [];
  }

  try {
    const raw =
      window.localStorage.getItem(
        TREASURY_STORAGE_KEY,
      );

    if (!raw) {
      return [];
    }

    return sanitize(
      JSON.parse(raw),
    );
  } catch {
    return [];
  }
}

function writeTreasury(
  items: TreasuryStoredItem[],
) {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  const sanitized =
    sanitize(items);

  window.localStorage.setItem(
    TREASURY_STORAGE_KEY,
    JSON.stringify(sanitized),
  );

  window.dispatchEvent(
    new CustomEvent(
      TREASURY_CHANGED_EVENT,
    ),
  );
}

export function isInTreasury(
  slug: string,
) {
  const normalized =
    slug.trim();

  return readTreasury().some(
    (item) =>
      item.slug === normalized,
  );
}

export function addToTreasury(
  slug: string,
) {
  const normalized =
    slug.trim();

  if (!normalized) {
    return readTreasury();
  }

  const current =
    readTreasury();

  if (
    current.some(
      (item) =>
        item.slug === normalized,
    )
  ) {
    return current;
  }

  const next = [
    {
      slug: normalized,
      savedAt:
        new Date().toISOString(),
    },
    ...current,
  ];

  writeTreasury(next);

  return next;
}

export function removeFromTreasury(
  slug: string,
) {
  const normalized =
    slug.trim();

  const next =
    readTreasury().filter(
      (item) =>
        item.slug !== normalized,
    );

  writeTreasury(next);

  return next;
}

export function toggleTreasury(
  slug: string,
) {
  if (
    isInTreasury(slug)
  ) {
    removeFromTreasury(slug);
    return false;
  }

  addToTreasury(slug);
  return true;
}

export function subscribeToTreasury(
  listener: () => void,
) {
  if (
    typeof window === "undefined"
  ) {
    return () => undefined;
  }

  const onStorage = (
    event: StorageEvent,
  ) => {
    if (
      event.key ===
      TREASURY_STORAGE_KEY
    ) {
      listener();
    }
  };

  window.addEventListener(
    TREASURY_CHANGED_EVENT,
    listener,
  );

  window.addEventListener(
    "storage",
    onStorage,
  );

  return () => {
    window.removeEventListener(
      TREASURY_CHANGED_EVENT,
      listener,
    );

    window.removeEventListener(
      "storage",
      onStorage,
    );
  };
}

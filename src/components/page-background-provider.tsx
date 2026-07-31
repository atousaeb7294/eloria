"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  usePathname,
} from "next/navigation";

import {
  SECTION_BACKGROUND_PATHS,
  resolveSectionBackground,
  type ResolvedSectionBackground,
} from "@/lib/section-backgrounds";

const BACKGROUND_SESSION_KEY =
  "eloria-page-background-sequence-v1";

const BACKGROUND_SESSION_VERSION =
  1;

type StoredBackgroundSequence = {
  version: number;
  order: number[];
  cursor: number;
  currentPath: string;
  currentIndex: number;
};

export type PageBackgroundContextValue =
  ResolvedSectionBackground & {
    pathname: string;
    sessionReady: boolean;
  };

type PageBackgroundProviderProps = {
  children: ReactNode;
};

const PageBackgroundContext =
  createContext<PageBackgroundContextValue | null>(
    null,
  );

function isValidBackgroundIndex(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <
      SECTION_BACKGROUND_PATHS.length
  );
}

function isValidBackgroundOrder(
  value: unknown,
): value is number[] {
  if (
    !Array.isArray(value) ||
    value.length !==
      SECTION_BACKGROUND_PATHS.length
  ) {
    return false;
  }

  if (
    !value.every(
      isValidBackgroundIndex,
    )
  ) {
    return false;
  }

  return (
    new Set(value).size ===
    SECTION_BACKGROUND_PATHS.length
  );
}

function readStoredSequence():
  | StoredBackgroundSequence
  | null {
  try {
    const raw =
      window.sessionStorage.getItem(
        BACKGROUND_SESSION_KEY,
      );

    if (!raw) {
      return null;
    }

    const parsed: unknown =
      JSON.parse(raw);

    if (
      typeof parsed !== "object" ||
      parsed === null
    ) {
      return null;
    }

    const candidate =
      parsed as Partial<StoredBackgroundSequence>;

    if (
      candidate.version !==
        BACKGROUND_SESSION_VERSION ||
      !isValidBackgroundOrder(
        candidate.order,
      ) ||
      typeof candidate.cursor !==
        "number" ||
      !Number.isInteger(
        candidate.cursor,
      ) ||
      candidate.cursor < 0 ||
      candidate.cursor >
        SECTION_BACKGROUND_PATHS.length ||
      typeof candidate.currentPath !==
        "string" ||
      !isValidBackgroundIndex(
        candidate.currentIndex,
      )
    ) {
      return null;
    }

    return {
      version:
        BACKGROUND_SESSION_VERSION,

      order:
        candidate.order,

      cursor:
        candidate.cursor,

      currentPath:
        candidate.currentPath,

      currentIndex:
        candidate.currentIndex,
    };
  } catch {
    return null;
  }
}

function writeStoredSequence(
  value: StoredBackgroundSequence,
): void {
  try {
    window.sessionStorage.setItem(
      BACKGROUND_SESSION_KEY,
      JSON.stringify(value),
    );
  } catch {
    // در صورت غیرفعال بودن Session Storage،
    // پس‌زمینه همچنان در حافظه همین صفحه کار می‌کند.
  }
}

function getSecureRandomInteger(
  maximumExclusive: number,
): number {
  if (maximumExclusive <= 1) {
    return 0;
  }

  const cryptoObject =
    globalThis.crypto;

  if (
    cryptoObject &&
    typeof cryptoObject.getRandomValues ===
      "function"
  ) {
    const values =
      new Uint32Array(1);

    const range =
      0x1_0000_0000;

    const acceptableLimit =
      range -
      (range % maximumExclusive);

    let value = 0;

    do {
      cryptoObject.getRandomValues(
        values,
      );

      value =
        values[0];
    } while (
      value >=
      acceptableLimit
    );

    return (
      value %
      maximumExclusive
    );
  }

  return (
    Date.now() %
    maximumExclusive
  );
}

function createShuffledOrder(
  previousIndex?: number,
): number[] {
  const order =
    SECTION_BACKGROUND_PATHS.map(
      (_, index) => index,
    );

  for (
    let index =
      order.length - 1;
    index > 0;
    index -= 1
  ) {
    const randomIndex =
      getSecureRandomInteger(
        index + 1,
      );

    [
      order[index],
      order[randomIndex],
    ] = [
      order[randomIndex],
      order[index],
    ];
  }

  if (
    typeof previousIndex ===
      "number" &&
    order.length > 1 &&
    order[0] ===
      previousIndex
  ) {
    [
      order[0],
      order[1],
    ] = [
      order[1],
      order[0],
    ];
  }

  return order;
}

function getSessionBackground(
  pathname: string,
): ResolvedSectionBackground {
  const stored =
    readStoredSequence();

  if (
    stored &&
    stored.currentPath ===
      pathname
  ) {
    return {
      index:
        stored.currentIndex,

      src:
        SECTION_BACKGROUND_PATHS[
          stored.currentIndex
        ],
    };
  }

  let order =
    stored?.order ??
    createShuffledOrder();

  let cursor =
    stored?.cursor ?? 0;

  const previousIndex =
    stored?.currentIndex;

  if (
    cursor >=
    SECTION_BACKGROUND_PATHS.length
  ) {
    order =
      createShuffledOrder(
        previousIndex,
      );

    cursor = 0;
  }

  const selectedIndex =
    order[cursor];

  const nextStoredSequence: StoredBackgroundSequence =
    {
      version:
        BACKGROUND_SESSION_VERSION,

      order,

      cursor:
        cursor + 1,

      currentPath:
        pathname,

      currentIndex:
        selectedIndex,
    };

  writeStoredSequence(
    nextStoredSequence,
  );

  return {
    index:
      selectedIndex,

    src:
      SECTION_BACKGROUND_PATHS[
        selectedIndex
      ],
  };
}

export function PageBackgroundProvider({
  children,
}: PageBackgroundProviderProps) {
  const pathname =
    usePathname() ?? "/";

  const fallbackBackground =
    useMemo(
      () =>
        resolveSectionBackground({
          seed:
            `eloria-page::${pathname}`,
        }),
      [pathname],
    );

  const [
    background,
    setBackground,
  ] =
    useState<ResolvedSectionBackground>(
      fallbackBackground,
    );

  const [
    sessionReady,
    setSessionReady,
  ] =
    useState(false);

 useEffect(() => {
  const frameId =
    window.requestAnimationFrame(
      () => {
        const selectedBackground =
          getSessionBackground(
            pathname,
          );

        setBackground(
          selectedBackground,
        );

        setSessionReady(
          true,
        );
      },
    );

  return () => {
    window.cancelAnimationFrame(
      frameId,
    );
  };
}, [pathname]);

  const contextValue =
    useMemo<PageBackgroundContextValue>(
      () => ({
        ...background,
        pathname,
        sessionReady,
      }),
      [
        background,
        pathname,
        sessionReady,
      ],
    );

  return (
    <PageBackgroundContext.Provider
      value={contextValue}
    >
      {children}
    </PageBackgroundContext.Provider>
  );
}

export function usePageBackground():
  | PageBackgroundContextValue
  | null {
  return useContext(
    PageBackgroundContext,
  );
}
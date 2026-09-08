"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
} from "react";

import { usePathname } from "next/navigation";

import {
  resolveSectionBackground,
  type ResolvedSectionBackground,
} from "@/lib/section-backgrounds";

export type PageBackgroundContextValue =
  ResolvedSectionBackground & {
    pathname: string;
    sessionReady: boolean;
  };

type PageBackgroundProviderProps = {
  children: ReactNode;
};

const PageBackgroundContext =
  createContext<PageBackgroundContextValue | null>(null);

export function PageBackgroundProvider({
  children,
}: PageBackgroundProviderProps) {
  const pathname = usePathname() ?? "/";

  /*
   * The pathname is available during both the server render and hydration.
   * Deriving the image from it keeps the first HTML frame and the hydrated
   * frame identical, so the background never changes after the page appears.
   */
  const contextValue =
    useMemo<PageBackgroundContextValue>(() => {
      const background = resolveSectionBackground({
        seed: `eloria-page::${pathname}`,
      });

      return {
        ...background,
        pathname,
        sessionReady: true,
      };
    }, [pathname]);

  return (
    <PageBackgroundContext.Provider value={contextValue}>
      {children}
    </PageBackgroundContext.Provider>
  );
}

export function usePageBackground():
  | PageBackgroundContextValue
  | null {
  return useContext(PageBackgroundContext);
}

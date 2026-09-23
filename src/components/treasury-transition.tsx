"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  type ComponentProps,
  type ReactNode,
} from "react";

type Direction = "left" | "up";
const Navigate = createContext<
  ((href: string, direction: Direction) => void) | null
>(null);

/** One transition owner, outside the changing route. The old snapshot stays visible
 * until the destination commits; a slow request never leaves an empty viewport. */
export function TreasuryTransitionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const complete = useRef<(() => void) | null>(null);
  const active = useRef(false);
  useLayoutEffect(() => {
    complete.current?.();
    complete.current = null;
  }, [pathname]);
  useEffect(
    () => () => {
      complete.current?.();
    },
    [],
  );

  function navigate(href: string, direction: Direction) {
    if (!/^\/(fa|en)\/(collections|products)(\/|\?|$)/.test(href)) return;
    if (active.current) return;
    if (
      href.split(/[?#]/)[0] === pathname ||
      !document.startViewTransition ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      router.push(href);
      return;
    }
    active.current = true;
    document.documentElement.dataset.treasuryTransition = direction;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const transition = document.startViewTransition(
      () =>
        new Promise<void>((resolve) => {
          complete.current = resolve;
          // A slow destination must not hold an unresponsive snapshot for seconds.
          // Routing continues normally after the brief transition budget expires.
          timer = setTimeout(() => {
            transition.skipTransition();
            resolve();
          }, 700);
          router.push(href);
        }),
    );
    void transition.finished
      .catch(() => undefined)
      .finally(() => {
        clearTimeout(timer);
        complete.current = null;
        active.current = false;
        delete document.documentElement.dataset.treasuryTransition;
      });
  }
  return <Navigate.Provider value={navigate}>{children}</Navigate.Provider>;
}

export function TreasuryLink({
  direction = "left",
  href,
  onClick,
  ...props
}: Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
  direction?: Direction;
}) {
  const navigate = useContext(Navigate);
  return (
    <Link
      {...props}
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (
          !navigate ||
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          props.target === "_blank" ||
          props.download
        )
          return;
        event.preventDefault();
        navigate(href, direction);
      }}
    />
  );
}

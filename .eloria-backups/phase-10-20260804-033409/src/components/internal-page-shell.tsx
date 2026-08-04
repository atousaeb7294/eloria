"use client";

import type {
  ReactNode,
} from "react";

import {
  useMemo,
} from "react";

import {
  usePathname,
} from "next/navigation";

import {
  AmbientEffects,
} from "@/components/ambient-effects";

import {
  SectionBackground,
} from "@/components/section-background";

import {
  SiteHeader,
} from "@/components/site-header";

import {
  SiteFooter,
} from "@/components/site-footer";

type BackgroundTone =
  | "soft"
  | "dark"
  | "deep";

type InternalPageShellProps = {
  locale: string;
  children: ReactNode;
  className?: string;
};

type BackgroundProfile = {
  tone: BackgroundTone;
  objectPosition: string;
  imageClassName: string;
  overlayClassName: string;
};

function removeLocaleFromPath(
  pathname: string,
): string {
  return pathname.replace(
    /^\/(?:fa|en)(?=\/|$)/,
    "",
  );
}

function resolveBackgroundProfile(
  pathname: string,
): BackgroundProfile {
  const path =
    removeLocaleFromPath(
      pathname,
    );

  if (
    path.startsWith(
      "/checkout",
    )
  ) {
    return {
      tone: "deep",
      objectPosition:
        "center 45%",

      imageClassName:
        "scale-[1.05] blur-[1.5px]",

      overlayClassName:
        "bg-[linear-gradient(180deg,rgba(1,13,9,0.58),rgba(1,10,7,0.9))]",
    };
  }

  if (
    path.startsWith(
      "/cart",
    )
  ) {
    return {
      tone: "deep",
      objectPosition:
        "center 44%",

      imageClassName:
        "scale-[1.045]",

      overlayClassName:
        "bg-[linear-gradient(180deg,rgba(1,15,10,0.48),rgba(1,10,7,0.86))]",
    };
  }

  if (
    /^\/products\/[^/]+/.test(
      path,
    )
  ) {
    return {
      tone: "deep",
      objectPosition:
        "center 42%",

      imageClassName:
        "scale-[1.04]",

      overlayClassName:
        "bg-[linear-gradient(180deg,rgba(1,16,11,0.42),rgba(1,11,8,0.84))]",
    };
  }

  if (
    path.startsWith(
      "/products",
    )
  ) {
    return {
      tone: "dark",
      objectPosition:
        "center 43%",

      imageClassName:
        "scale-[1.035]",

      overlayClassName:
        "bg-[linear-gradient(180deg,rgba(1,18,12,0.34),rgba(1,12,8,0.76))]",
    };
  }

  if (
    /^\/collections\/[^/]+\/[^/]+/.test(
      path,
    )
  ) {
    return {
      tone: "dark",
      objectPosition:
        "center 44%",

      imageClassName:
        "scale-[1.035]",

      overlayClassName:
        "bg-[linear-gradient(180deg,rgba(1,19,13,0.28),rgba(1,12,8,0.73))]",
    };
  }

  if (
    path.startsWith(
      "/collections",
    )
  ) {
    return {
      tone: "soft",
      objectPosition:
        "center 44%",

      imageClassName:
        "scale-[1.03]",

      overlayClassName:
        "bg-[linear-gradient(180deg,rgba(1,20,14,0.2),rgba(1,13,9,0.65))]",
    };
  }

  return {
    tone: "dark",
    objectPosition:
      "center 44%",

    imageClassName:
      "scale-[1.035]",

    overlayClassName:
      "bg-[linear-gradient(180deg,rgba(1,18,12,0.34),rgba(1,11,8,0.78))]",
  };
}

export function InternalPageShell({
  locale,
  children,
  className = "",
}: InternalPageShellProps) {
  const pathname =
    usePathname() ?? "/";

  const isPersian =
    locale === "fa";

  const profile =
    useMemo(
      () =>
        resolveBackgroundProfile(
          pathname,
        ),
      [pathname],
    );

  return (
    <main
      dir={
        isPersian
          ? "rtl"
          : "ltr"
      }
      data-page-background-tone={
        profile.tone
      }
      className={[
        "relative isolate min-h-screen overflow-x-hidden bg-[#02140e] text-[#f8f0df]",
        className,
      ].join(" ")}
    >
      <SectionBackground
        sectionKey="internal-page-shell"
        tone={
          profile.tone
        }
        quality={88}
        objectPosition={
          profile.objectPosition
        }
        imageClassName={
          profile.imageClassName
        }
        className="fixed inset-0"
      />

      <div
        aria-hidden="true"
        className={[
          "pointer-events-none fixed inset-0 z-[1]",
          profile.overlayClassName,
        ].join(" ")}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[2] bg-[radial-gradient(circle_at_50%_18%,rgba(221,187,94,0.075),transparent_36%),radial-gradient(circle_at_12%_72%,rgba(15,111,77,0.07),transparent_32%)]"
      />

      <AmbientEffects />

      <SiteHeader />

      <div id="main-content" className="relative z-10" tabIndex={-1}>
        {children}

        <SiteFooter locale={locale} />
      </div>
    </main>
  );
}
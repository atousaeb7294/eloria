"use client";

import { TreasuryPageTransition } from "@/components/treasury-transition";

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
        "bg-[linear-gradient(180deg,rgba(6,10,33,0.58),rgba(6,9,29,0.9))]",
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
        "bg-[linear-gradient(180deg,rgba(6,10,35,0.48),rgba(6,9,29,0.86))]",
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
        "bg-[linear-gradient(180deg,rgba(6,10,36,0.42),rgba(6,9,30,0.84))]",
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
        "bg-[linear-gradient(180deg,rgba(6,11,38,0.34),rgba(6,9,31,0.76))]",
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
        "bg-[linear-gradient(180deg,rgba(7,11,39,0.28),rgba(6,9,31,0.73))]",
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
        "bg-[linear-gradient(180deg,rgba(7,11,40,0.2),rgba(6,10,33,0.65))]",
    };
  }

  return {
    tone: "dark",
    objectPosition:
      "center 44%",

    imageClassName:
      "scale-[1.035]",

    overlayClassName:
      "bg-[linear-gradient(180deg,rgba(6,11,38,0.34),rgba(6,9,30,0.78))]",
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
    <div
      dir={
        isPersian
          ? "rtl"
          : "ltr"
      }
      data-page-background-tone={
        profile.tone
      }
      className={[
        "relative isolate min-h-screen overflow-x-hidden bg-[#080d28] text-[#f8f0df]",
        className,
      ].join(" ")}
    >
      <SectionBackground
        sectionKey="internal-page-shell"
        priority
        tone={
          profile.tone
        }
        quality={84}
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
        className="pointer-events-none fixed inset-0 z-[2] bg-[radial-gradient(circle_at_50%_18%,rgba(221,187,94,0.075),transparent_36%),radial-gradient(circle_at_12%_72%,rgba(34,49,143,0.07),transparent_32%)]"
      />

      <AmbientEffects />

      <SiteHeader locale={locale} />

      <TreasuryPageTransition>
      <main
        id="main-content"
        tabIndex={-1}
        className="relative z-10 outline-none"
      >
        {children}
      </main>
      </TreasuryPageTransition>

      <div className="relative z-10">
        <SiteFooter locale={locale} />
      </div>
    </div>
  );
}
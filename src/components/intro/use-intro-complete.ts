"use client";

import { useEffect, useState } from "react";

import {
  INTRO_SESSION_KEY,
} from "@/components/intro/eloria-intro-config";

export function useIntroComplete() {
  const [complete, setComplete] =
    useState(false);

  useEffect(() => {
    let disposed = false;

    const finish = () => {
      if (!disposed) {
        setComplete(true);
      }
    };

    let alreadySeen = false;

    try {
      alreadySeen =
        window.sessionStorage.getItem(
          INTRO_SESSION_KEY,
        ) === "1";
    } catch {
      alreadySeen = false;
    }

    if (alreadySeen) {
      finish();
      return () => {
        disposed = true;
      };
    }

    window.addEventListener(
      "eloria:intro-complete",
      finish,
      { once: true },
    );

    const fallbackTimer =
      window.setTimeout(() => {
        if (
          !document.querySelector(
            ".eloria-intro-root",
          )
        ) {
          finish();
        }
      }, 250);

    return () => {
      disposed = true;
      window.clearTimeout(fallbackTimer);
      window.removeEventListener(
        "eloria:intro-complete",
        finish,
      );
    };
  }, []);

  return complete;
}

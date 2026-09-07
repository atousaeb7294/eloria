"use client";

import { useEffect, useState } from "react";

export function useIntroComplete() {
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    let disposed = false;

    const finish = () => {
      if (!disposed) setComplete(true);
    };

    window.addEventListener("eloria:intro-complete", finish, { once: true });

    // On non-home pages the intro component does not exist, so dependent
    // effects may start normally. On Home we never infer completion while
    // `.eloria-intro-root` is present.
    const fallbackTimer = window.setTimeout(() => {
      if (!document.querySelector(".eloria-intro-root")) finish();
    }, 600);

    return () => {
      disposed = true;
      window.clearTimeout(fallbackTimer);
      window.removeEventListener("eloria:intro-complete", finish);
    };
  }, []);

  return complete;
}

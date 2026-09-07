"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function VisualExperience() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const updateProgress = () => {
      if (frameRef.current !== null) {
        return;
      }

      frameRef.current = window.requestAnimationFrame(() => {
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        const nextProgress = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
        setProgress(Math.max(0, Math.min(100, nextProgress)));
        frameRef.current = null;
      });
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);

    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [pathname]);

  useEffect(() => {
    document.documentElement.dataset.visualReady = "true";

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));

    elements.forEach((element) => {
      element.classList.remove("is-revealed");
    });

    if (reducedMotion || !("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-revealed"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -7% 0px",
      },
    );

    elements.forEach((element) => {
      const bounds = element.getBoundingClientRect();
      if (bounds.top <= window.innerHeight * 0.92) {
        element.classList.add("is-revealed");
      } else {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [pathname]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[150] h-[2px] origin-left bg-[linear-gradient(90deg,#8f7027,#f9e1a0,#d3ad4f)] shadow-[0_0_14px_rgba(239,207,119,0.52)] transition-[width] duration-100 motion-reduce:hidden"
      style={{ width: `${progress}%` }}
    />
  );
}

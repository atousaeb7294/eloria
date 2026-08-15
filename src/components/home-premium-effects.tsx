"use client";

import { useEffect } from "react";

const REVEAL_SELECTOR = [
  '[data-eloria-narrative-section="true"]',
  '[data-eloria-trust-section="true"]',
  ".eloria-collection-card",
].join(",");

const CARD_SELECTOR =
  ".eloria-collection-card";

function clamp(
  value: number,
  min: number,
  max: number,
) {
  return Math.min(
    max,
    Math.max(min, value),
  );
}

export function HomePremiumEffects() {
  useEffect(() => {
    const reducedMotion =
      window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      );

    if (reducedMotion.matches) {
      return;
    }

    const finePointer =
      window.matchMedia(
        "(hover: hover) and (pointer: fine)",
      );

    const hero =
      document.getElementById("hero");

    const heroFrame =
      hero?.firstElementChild instanceof
      HTMLElement
        ? hero.firstElementChild
        : null;

    let heroRaf: number | null = null;
    let heroX = 0.5;
    let heroY = 0.5;
    let heroRevealAnimation:
      Animation | null = null;

    const resetHero = () => {
      if (!hero || !heroFrame) {
        return;
      }

      heroX = 0.5;
      heroY = 0.43;

      hero.style.setProperty(
        "--eloria-pointer-x",
        "50%",
      );

      hero.style.setProperty(
        "--eloria-pointer-y",
        "43%",
      );

      heroFrame.style.transform =
        "perspective(1600px) rotateX(0deg) rotateY(0deg) translate3d(0,0,0) scale(1)";

      heroFrame.style.transition =
        "transform 520ms cubic-bezier(0.16,1,0.3,1)";
    };

    const paintHero = () => {
      heroRaf = null;

      if (
        !hero ||
        !heroFrame ||
        !finePointer.matches
      ) {
        return;
      }

      const tiltX =
        clamp(
          (0.5 - heroY) * 1.4,
          -0.7,
          0.7,
        );

      const tiltY =
        clamp(
          (heroX - 0.5) * 1.8,
          -0.9,
          0.9,
        );

      hero.style.setProperty(
        "--eloria-pointer-x",
        `${(heroX * 100).toFixed(2)}%`,
      );

      hero.style.setProperty(
        "--eloria-pointer-y",
        `${(heroY * 100).toFixed(2)}%`,
      );

      heroFrame.style.transition =
        "transform 150ms linear";

      heroFrame.style.transform =
        `perspective(1600px) rotateX(${tiltX.toFixed(3)}deg) rotateY(${tiltY.toFixed(3)}deg) translate3d(0,0,0) scale(1.002)`;
    };

    const handleHeroPointerMove = (
      event: PointerEvent,
    ) => {
      if (
        !hero ||
        !finePointer.matches
      ) {
        return;
      }

      const rect =
        hero.getBoundingClientRect();

      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      ) {
        return;
      }

      heroX = clamp(
        (event.clientX - rect.left) /
          Math.max(rect.width, 1),
        0,
        1,
      );

      heroY = clamp(
        (event.clientY - rect.top) /
          Math.max(rect.height, 1),
        0,
        1,
      );

      if (heroRaf === null) {
        heroRaf =
          window.requestAnimationFrame(
            paintHero,
          );
      }
    };

    const revealHero = () => {
      if (!heroFrame) {
        return;
      }

      heroRevealAnimation?.cancel();

      heroRevealAnimation =
        heroFrame.animate(
          [
            {
              opacity: 0.84,
              transform:
                "perspective(1600px) translate3d(0,18px,-28px) scale(.992)",
            },
            {
              opacity: 1,
              transform:
                "perspective(1600px) translate3d(0,0,0) scale(1)",
            },
          ],
          {
            duration: 980,
            easing:
              "cubic-bezier(0.16,1,0.3,1)",
          },
        );
    };

    window.addEventListener(
      "pointermove",
      handleHeroPointerMove,
      {
        passive: true,
      },
    );

    hero?.addEventListener(
      "pointerleave",
      resetHero,
    );

    window.addEventListener(
      "eloria:intro-complete",
      revealHero,
    );

    let introAlreadyComplete = false;

    try {
      introAlreadyComplete =
        window.sessionStorage.getItem(
          "eloria_intro_seen_v5",
        ) === "1";
    } catch {
      introAlreadyComplete = false;
    }

    const initialHeroTimer =
      introAlreadyComplete
        ? window.setTimeout(
            revealHero,
            100,
          )
        : null;

    const revealed =
      new WeakSet<Element>();

    const observer =
      "IntersectionObserver" in window
        ? new IntersectionObserver(
            (entries) => {
              entries.forEach((entry) => {
                if (
                  !entry.isIntersecting ||
                  revealed.has(entry.target)
                ) {
                  return;
                }

                revealed.add(entry.target);
                observer?.unobserve(
                  entry.target,
                );

                const element =
                  entry.target as HTMLElement;

                const isCard =
                  element.matches(
                    CARD_SELECTOR,
                  );

                element.animate(
                  [
                    {
                      opacity:
                        isCard
                          ? 0.72
                          : 0.82,
                      transform:
                        isCard
                          ? "translate3d(0,18px,0) scale(.988)"
                          : "translate3d(0,24px,0)",
                    },
                    {
                      opacity: 1,
                      transform:
                        "translate3d(0,0,0) scale(1)",
                    },
                  ],
                  {
                    duration:
                      isCard
                        ? 620
                        : 820,
                    easing:
                      "cubic-bezier(0.16,1,0.3,1)",
                  },
                );
              });
            },
            {
              threshold: 0.12,
              rootMargin:
                "0px 0px -8% 0px",
            },
          )
        : null;

    const revealTargets =
      Array.from(
        document.querySelectorAll(
          REVEAL_SELECTOR,
        ),
      );

    revealTargets.forEach(
      (element) => {
        observer?.observe(element);
      },
    );

    const cardCleanups: Array<
      () => void
    > = [];

    const cards =
      Array.from(
        document.querySelectorAll<HTMLElement>(
          CARD_SELECTOR,
        ),
      );

    cards.forEach((card) => {
      let resetTimer:
        number | null = null;

      const handleMove = (
        event: PointerEvent,
      ) => {
        if (!finePointer.matches) {
          return;
        }

        if (resetTimer !== null) {
          window.clearTimeout(
            resetTimer,
          );

          resetTimer = null;
        }

        const rect =
          card.getBoundingClientRect();

        const x = clamp(
          (event.clientX - rect.left) /
            Math.max(rect.width, 1),
          0,
          1,
        );

        const y = clamp(
          (event.clientY - rect.top) /
            Math.max(rect.height, 1),
          0,
          1,
        );

        const rotateX =
          clamp(
            (0.5 - y) * 5,
            -2.5,
            2.5,
          );

        const rotateY =
          clamp(
            (x - 0.5) * 6,
            -3,
            3,
          );

        card.style.willChange =
          "transform";

        card.style.transition =
          "transform 100ms linear, border-color 300ms ease, box-shadow 300ms ease";

        card.style.transform =
          `perspective(980px) rotateX(${rotateX.toFixed(3)}deg) rotateY(${rotateY.toFixed(3)}deg) translate3d(0,-4px,10px) scale(1.006)`;
      };

      const handleLeave = () => {
        card.style.transition =
          "transform 420ms cubic-bezier(0.16,1,0.3,1), border-color 300ms ease, box-shadow 300ms ease";

        card.style.transform =
          "perspective(980px) rotateX(0deg) rotateY(0deg) translate3d(0,0,0) scale(1)";

        resetTimer =
          window.setTimeout(() => {
            card.style.removeProperty(
              "transform",
            );

            card.style.removeProperty(
              "will-change",
            );

            card.style.removeProperty(
              "transition",
            );

            resetTimer = null;
          }, 430);
      };

      card.addEventListener(
        "pointermove",
        handleMove,
        {
          passive: true,
        },
      );

      card.addEventListener(
        "pointerleave",
        handleLeave,
      );

      cardCleanups.push(() => {
        if (resetTimer !== null) {
          window.clearTimeout(
            resetTimer,
          );
        }

        card.removeEventListener(
          "pointermove",
          handleMove,
        );

        card.removeEventListener(
          "pointerleave",
          handleLeave,
        );

        card.style.removeProperty(
          "transform",
        );

        card.style.removeProperty(
          "will-change",
        );

        card.style.removeProperty(
          "transition",
        );
      });
    });

    return () => {
      if (heroRaf !== null) {
        window.cancelAnimationFrame(
          heroRaf,
        );
      }

      if (initialHeroTimer !== null) {
        window.clearTimeout(
          initialHeroTimer,
        );
      }

      heroRevealAnimation?.cancel();
      observer?.disconnect();

      window.removeEventListener(
        "pointermove",
        handleHeroPointerMove,
      );

      hero?.removeEventListener(
        "pointerleave",
        resetHero,
      );

      window.removeEventListener(
        "eloria:intro-complete",
        revealHero,
      );

      cardCleanups.forEach(
        (cleanup) => cleanup(),
      );

      if (heroFrame) {
        heroFrame.style.removeProperty(
          "transform",
        );

        heroFrame.style.removeProperty(
          "transition",
        );
      }
    };
  }, []);

  return (
    <style jsx global>{`
      #hero {
        --eloria-pointer-x: 50%;
        --eloria-pointer-y: 43%;
        perspective: 1600px;
      }

      #hero::after {
        content: "";
        position: absolute;
        inset: 0;
        z-index: 12;
        pointer-events: none;
        opacity: 0.42;
        background:
          radial-gradient(
            circle at
              var(--eloria-pointer-x)
              var(--eloria-pointer-y),
            rgba(255, 235, 174, 0.105)
              0%,
            rgba(218, 180, 87, 0.055)
              18%,
            rgba(15, 117, 83, 0.025)
              34%,
            transparent 56%
          );
        mix-blend-mode: screen;
        transition: opacity 240ms ease;
      }

      #hero > div {
        transform-style: preserve-3d;
        backface-visibility: hidden;
      }

      [data-eloria-narrative-section="true"]
        [aria-roledescription="carousel"] {
        perspective: 1400px;
        perspective-origin: 50% 42%;
      }

      @media (max-width: 768px),
        (hover: none),
        (pointer: coarse),
        (update: slow) {
        #hero::after {
          opacity: 0.14;
          mix-blend-mode: normal;
        }

        #hero > div {
          transform: none !important;
        }
      }

      @media (
        prefers-reduced-motion:
          reduce
      ) {
        #hero::after {
          display: none;
        }

        #hero > div {
          transform: none !important;
        }
      }
    `}</style>
  );
}

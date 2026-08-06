"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useCallback, useRef } from "react";

gsap.registerPlugin(useGSAP);

const ENTRY_LABEL_FA =
  "\u0648\u0631\u0648\u062f \u0628\u0647 \u062f\u0646\u06cc\u0627\u06cc \u0627\u0644\u0648\u0631\u06cc\u0627";

const ENTRY_SUBTITLE_FA =
  "\u0645\u064f\u0647\u0631 \u0627\u0644\u0648\u0631\u06cc\u0627 \u0631\u0627 \u0628\u06af\u0634\u0627";

type EloriaSigilEntryButtonProps = {
  isPersian: boolean;
  onActivate: () => void;
};

export function EloriaSigilEntryButton({
  isPersian,
  onActivate,
}: EloriaSigilEntryButtonProps) {
  const scopeRef =
    useRef<HTMLDivElement>(
      null,
    );

  const buttonRef =
    useRef<HTMLButtonElement>(
      null,
    );

  const frameRef =
    useRef<SVGSVGElement>(
      null,
    );

  const crystalRef =
    useRef<SVGGElement>(
      null,
    );

  const glowRef =
    useRef<HTMLSpanElement>(
      null,
    );

  const activatingRef =
    useRef(false);

  useGSAP(
    () => {
      const timeline =
        gsap.timeline({
          defaults: {
            ease:
              "power3.out",
          },
        });

      timeline
        .from(
          ".eloria-sigil-shell",
          {
            opacity:
              0,
            y:
              20,
            scale:
              0.94,
            filter:
              "blur(10px)",
            duration:
              0.8,
          },
        )
        .from(
          ".eloria-sigil-stroke",
          {
            strokeDashoffset:
              1,
            duration:
              1.15,
            stagger:
              0.08,
            ease:
              "power2.inOut",
          },
          "-=0.48",
        )
        .from(
          ".eloria-sigil-corner",
          {
            opacity:
              0,
            scale:
              0.45,
            transformOrigin:
              "center",
            duration:
              0.55,
            stagger:
              0.07,
          },
          "-=0.72",
        )
        .from(
          ".eloria-sigil-copy",
          {
            opacity:
              0,
            y:
              7,
            duration:
              0.55,
          },
          "-=0.42",
        );

      gsap.to(
        crystalRef.current,
        {
          scale:
            1.06,
          filter:
            "drop-shadow(0 0 11px rgba(255,225,141,0.85))",
          duration:
            1.8,
          repeat:
            -1,
          yoyo:
            true,
          ease:
            "sine.inOut",
          transformOrigin:
            "center",
        },
      );

      gsap.to(
        glowRef.current,
        {
          opacity:
            0.7,
          scaleX:
            1.06,
          duration:
            2.4,
          repeat:
            -1,
          yoyo:
            true,
          ease:
            "sine.inOut",
        },
      );

      const sparks =
        gsap.utils.toArray<HTMLElement>(
          ".eloria-sigil-spark",
        );

      sparks.forEach(
        (
          spark,
          index,
        ) => {
          gsap.to(
            spark,
            {
              y:
                index % 2 === 0
                  ? -8
                  : -12,
              x:
                index % 3 === 0
                  ? 4
                  : -3,
              opacity:
                0.95,
              scale:
                1.35,
              duration:
                1.7 +
                index *
                  0.14,
              repeat:
                -1,
              yoyo:
                true,
              delay:
                index *
                0.18,
              ease:
                "sine.inOut",
            },
          );
        },
      );

      gsap.fromTo(
        ".eloria-sigil-shimmer",
        {
          xPercent:
            -210,
          opacity:
            0,
        },
        {
          xPercent:
            520,
          opacity:
            0.58,
          duration:
            1.65,
          repeat:
            -1,
          repeatDelay:
            2.4,
          ease:
            "power2.inOut",
        },
      );
    },
    {
      scope:
        scopeRef,
    },
  );

  const handlePointerEnter =
    useCallback(() => {
      if (
        activatingRef.current
      ) {
        return;
      }

      const scope =
        scopeRef.current;

      gsap.to(
        buttonRef.current,
        {
          y:
            -3,
          scale:
            1.018,
          duration:
            0.35,
          ease:
            "power2.out",
        },
      );

      gsap.to(
        frameRef.current,
        {
          filter:
            "drop-shadow(0 0 8px rgba(255,226,145,0.55)) drop-shadow(0 0 22px rgba(86,151,105,0.28))",
          duration:
            0.35,
        },
      );

      gsap.to(
        scope?.querySelectorAll(
          ".eloria-sigil-primary",
        ) ?? [],
        {
          stroke:
            "#fff1bb",
          duration:
            0.32,
        },
      );

      gsap.to(
        crystalRef.current,
        {
          scale:
            1.16,
          duration:
            0.35,
          ease:
            "back.out(2)",
        },
      );

      gsap.to(
        glowRef.current,
        {
          opacity:
            0.92,
          scaleX:
            1.13,
          duration:
            0.35,
        },
      );
    }, []);

  const handlePointerLeave =
    useCallback(() => {
      if (
        activatingRef.current
      ) {
        return;
      }

      const scope =
        scopeRef.current;

      gsap.to(
        buttonRef.current,
        {
          y:
            0,
          scale:
            1,
          duration:
            0.38,
          ease:
            "power2.out",
        },
      );

      gsap.to(
        frameRef.current,
        {
          filter:
            "drop-shadow(0 0 0 rgba(0,0,0,0))",
          duration:
            0.38,
        },
      );

      gsap.to(
        scope?.querySelectorAll(
          ".eloria-sigil-primary",
        ) ?? [],
        {
          stroke:
            "#dfbf69",
          duration:
            0.38,
        },
      );

      gsap.to(
        crystalRef.current,
        {
          scale:
            1.04,
          duration:
            0.38,
        },
      );

      gsap.to(
        glowRef.current,
        {
          opacity:
            0.58,
          scaleX:
            1,
          duration:
            0.38,
        },
      );
    }, []);

  const handleClick =
    useCallback(() => {
      if (
        activatingRef.current
      ) {
        return;
      }

      activatingRef.current =
        true;

      const scope =
        scopeRef.current;

      gsap
        .timeline({
          onComplete:
            onActivate,
        })
        .to(
          crystalRef.current,
          {
            scale:
              1.35,
            filter:
              "drop-shadow(0 0 20px rgba(255,245,204,1))",
            duration:
              0.18,
            ease:
              "power2.out",
          },
        )
        .to(
          scope?.querySelectorAll(
            ".eloria-sigil-stroke",
          ) ?? [],
          {
            stroke:
              "#fff7d2",
            strokeWidth:
              1.7,
            duration:
              0.18,
          },
          "<",
        )
        .to(
          glowRef.current,
          {
            opacity:
              1,
            scaleX:
              1.22,
            scaleY:
              1.35,
            duration:
              0.2,
          },
          "<",
        )
        .to(
          buttonRef.current,
          {
            opacity:
              0,
            scale:
              1.035,
            y:
              -7,
            filter:
              "brightness(1.65)",
            duration:
              0.32,
            ease:
              "power2.in",
          },
        );
    }, [
      onActivate,
    ]);

  const clipPath =
    "polygon(10% 0, 44% 0, 50% 7%, 56% 0, 90% 0, 94% 13%, 100% 27%, 100% 73%, 94% 87%, 90% 100%, 10% 100%, 6% 87%, 0 73%, 0 27%, 6% 13%)";

  return (
    <div
      ref={scopeRef}
      className="absolute inset-x-0 bottom-[max(0.05rem,env(safe-area-inset-bottom))] z-[135] flex justify-center px-3 sm:bottom-[max(0.2rem,env(safe-area-inset-bottom))]"
    >
      <div className="eloria-sigil-shell relative w-full max-w-[304px] sm:max-w-[334px]">
        <span
          ref={glowRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-7 -bottom-1 h-8 bg-[radial-gradient(ellipse,rgba(233,194,101,0.35),rgba(72,130,91,0.17)_45%,transparent_74%)] opacity-55 blur-xl"
        />

        {[
          ["7%", "18%"],
          ["92%", "28%"],
          ["14%", "78%"],
          ["84%", "82%"],
          ["48%", "-4%"],
        ].map(
          (
            position,
            index,
          ) => (
            <span
              key={index}
              aria-hidden="true"
              className="eloria-sigil-spark pointer-events-none absolute z-30 size-[3px] rounded-full bg-[#fff0b4] opacity-25 shadow-[0_0_7px_#ffe29a,0_0_15px_rgba(154,217,169,0.52)]"
              style={{
                left:
                  position[0],
                top:
                  position[1],
              }}
            />
          ),
        )}

        <button
          ref={buttonRef}
          type="button"
          onClick={handleClick}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          aria-label={
            isPersian
              ? ENTRY_LABEL_FA
              : "Enter the World of Eloria"
          }
          className="relative isolate block min-h-[64px] w-full overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-[#f5dc94] focus-visible:ring-offset-2 focus-visible:ring-offset-[#03110b] sm:min-h-[68px]"
          style={{
            clipPath,
          }}
        >
          <span
            aria-hidden="true"
            className="absolute inset-[2px] bg-[linear-gradient(115deg,rgba(2,17,12,0.98),rgba(5,39,28,0.96)_48%,rgba(22,20,8,0.98))] shadow-[inset_0_1px_0_rgba(255,245,202,0.11),inset_0_-10px_24px_rgba(0,0,0,0.28),0_12px_34px_rgba(0,0,0,0.48)]"
            style={{
              clipPath,
            }}
          />

          <span
            aria-hidden="true"
            className="absolute inset-[3px] bg-[radial-gradient(circle_at_50%_-25%,rgba(255,231,157,0.16),transparent_42%),radial-gradient(circle_at_8%_50%,rgba(92,160,112,0.1),transparent_36%),radial-gradient(circle_at_92%_50%,rgba(202,158,63,0.1),transparent_36%)]"
            style={{
              clipPath,
            }}
          />

          <span
            aria-hidden="true"
            className="eloria-sigil-shimmer pointer-events-none absolute -inset-y-3 -left-1/4 z-10 w-12 -skew-x-[24deg] bg-gradient-to-r from-transparent via-[#fff3c6]/26 to-transparent blur-sm"
          />

          <svg
            ref={frameRef}
            aria-hidden="true"
            viewBox="0 0 360 84"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 z-20 size-full overflow-visible"
            fill="none"
          >
            <path
              className="eloria-sigil-stroke eloria-sigil-primary"
              pathLength="1"
              style={{
                strokeDasharray:
                  1,
                strokeDashoffset:
                  0,
              }}
              d="M43 3H151L164 10H196L209 3H317L328 14H345L357 27V57L345 70H328L317 81H43L32 70H15L3 57V27L15 14H32L43 3Z"
              stroke="#dfbf69"
              strokeWidth="1.15"
            />

            <path
              className="eloria-sigil-stroke"
              pathLength="1"
              style={{
                strokeDasharray:
                  1,
                strokeDashoffset:
                  0,
              }}
              d="M49 9H148L161 16H199L212 9H311L321 20H339L350 31V53L339 64H321L311 75H49L39 64H21L10 53V31L21 20H39L49 9Z"
              stroke="#7d6530"
              strokeOpacity="0.92"
              strokeWidth="0.7"
            />

            <path
              className="eloria-sigil-stroke"
              pathLength="1"
              style={{
                strokeDasharray:
                  1,
                strokeDashoffset:
                  0,
              }}
              d="M61 15H142M218 15H299M61 69H142M218 69H299"
              stroke="#b5964d"
              strokeOpacity="0.72"
              strokeWidth="0.65"
            />

            <g
              ref={crystalRef}
              className="eloria-sigil-corner"
            >
              <path
                d="M180 5L188 13L184 22H176L172 13L180 5Z"
                fill="#d5af57"
                fillOpacity="0.17"
                stroke="#f0d889"
                strokeWidth="0.9"
              />
              <path
                d="M180 9L184 14L180 20L176 14L180 9Z"
                fill="#fff0b4"
                fillOpacity="0.72"
              />
              <path
                d="M180 64L186 70L180 79L174 70L180 64Z"
                fill="#6f5a2c"
                fillOpacity="0.3"
                stroke="#c8a451"
                strokeWidth="0.7"
              />
            </g>

            <g className="eloria-sigil-corner">
              <path d="M17 27L32 18L43 18L35 26L35 34L27 39L17 34Z" stroke="#c7a653" strokeWidth="0.8" />
              <path d="M17 57L32 66L43 66L35 58L35 50L27 45L17 50Z" stroke="#c7a653" strokeWidth="0.8" />
            </g>

            <g className="eloria-sigil-corner">
              <path d="M343 27L328 18L317 18L325 26L325 34L333 39L343 34Z" stroke="#c7a653" strokeWidth="0.8" />
              <path d="M343 57L328 66L317 66L325 58L325 50L333 45L343 50Z" stroke="#c7a653" strokeWidth="0.8" />
            </g>

            <path
              d="M49 42H72M288 42H311"
              stroke="#d9b85f"
              strokeOpacity="0.65"
              strokeWidth="0.7"
            />
            <path
              d="M58 38L64 42L58 46M302 38L296 42L302 46"
              stroke="#e2c36c"
              strokeWidth="0.75"
            />
          </svg>

          <span
            className="eloria-sigil-copy relative z-30 flex min-h-[64px] items-center justify-center gap-3 px-10 sm:min-h-[68px]"
            dir={
              isPersian
                ? "rtl"
                : "ltr"
            }
            style={{
              unicodeBidi:
                "plaintext",
            }}
          >
            <span
              aria-hidden="true"
              className="grid size-8 shrink-0 place-items-center text-[#f0d789]"
            >
              <svg
                viewBox="0 0 32 32"
                className="size-6"
                fill="none"
              >
                <path
                  d="M16 3L19 12.5L28 16L19 19.5L16 29L13 19.5L4 16L13 12.5L16 3Z"
                  fill="currentColor"
                  fillOpacity="0.15"
                  stroke="currentColor"
                  strokeWidth="1"
                />
                <path
                  d="M16 9L18 14L23 16L18 18L16 23L14 18L9 16L14 14L16 9Z"
                  fill="currentColor"
                  fillOpacity="0.78"
                />
              </svg>
            </span>

            <span className="flex min-w-0 flex-col items-center justify-center text-center">
              <span className="font-eloria-brand text-[13px] font-medium leading-none text-[#fff0bd] drop-shadow-[0_0_9px_rgba(255,225,148,0.2)] sm:text-[15px]">
                {isPersian
                  ? ENTRY_LABEL_FA
                  : "Enter the World of Eloria"}
              </span>

              <span className="mt-1.5 text-[7px] leading-none text-[#d2b66e]/80 sm:text-[8px]">
                {isPersian
                  ? ENTRY_SUBTITLE_FA
                  : "Break the seal of Eloria"}
              </span>
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}

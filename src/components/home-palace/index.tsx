"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import type { PalaceProduct } from "./palace-runtime";
import { palaceMarkup } from "./palace-markup";
import "./palace.css";

const destinations = [
  { slug: "gold", name: "گنجینهٔ طلا" },
  { slug: "silver", name: "گنجینهٔ نقره" },
  { slug: "weave", name: "گنجینهٔ بافت" },
] as const;

function isProduct(value: unknown): value is PalaceProduct {
  if (!value || typeof value !== "object") return false;
  const product = value as Partial<PalaceProduct>;
  return (
    typeof product.slug === "string" &&
    typeof product.name === "string" &&
    typeof product.imageUrl === "string" &&
    (product.imageUrl.startsWith("/api/media/") ||
      product.imageUrl.startsWith("/images/"))
  );
}

export function HomePalace() {
  const root = useRef<HTMLDivElement>(null);
  const fallback = useRef<HTMLElement>(null);
  const router = useRouter();

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const controller = new AbortController();
    let disposed = false;
    let started = false;
    let cleanup: (() => void) | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    async function start() {
      if (started || disposed) return;
      started = true;
      timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const [runtime, data] = await Promise.all([
          import("./palace-runtime"),
          fetch("/api/treasury/preview?locale=fa", {
            signal: controller.signal,
          })
            .then((response) => (response.ok ? response.json() : null))
            .catch(() => null),
        ]);
        if (disposed || !element) return;
        element.innerHTML = palaceMarkup;
        const catalog: PalaceProduct[] =
          Array.isArray(data?.items) && data?.source !== "unavailable"
            ? data.items.filter(isProduct).slice(0, 15)
            : [];
        cleanup = runtime.mountHomePalace(element, {
          catalog,
          navigateToTreasury(slug) {
            if (!destinations.some((item) => item.slug === slug)) return;
            window.dispatchEvent(new Event("eloria:navigate"));
            router.push(`/fa/collections/${slug}`, { transitionTypes: [] });
          },
        });
      } catch {
        if (!disposed && fallback.current) {
          fallback.current.hidden = false;
          const loading = element?.querySelector<HTMLElement>(".ep-loading");
          if (loading) loading.hidden = true;
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          void start();
        }
      },
      { rootMargin: "500px" },
    );
    observer.observe(element);

    return () => {
      disposed = true;
      observer.disconnect();
      controller.abort();
      clearTimeout(timeout);
      cleanup?.();
    };
  }, [router]);

  return (
    <section id="treasury-gold" aria-label="گنجینه‌های الوریا">
      <div
        id="eloria-home-palace"
        dir="rtl"
        data-view="hall"
        ref={root}
        dangerouslySetInnerHTML={{ __html: palaceMarkup }}
      />
      <nav
        ref={fallback}
        hidden
        aria-label="ورود به گنجینه‌ها"
        className="flex justify-center gap-5 p-6"
      >
        {destinations.map((item) => (
          <Link key={item.slug} href={`/fa/collections/${item.slug}`}>
            {item.name}
          </Link>
        ))}
      </nav>
      <noscript>
        <nav aria-label="گنجینه‌ها" className="flex justify-center gap-5 p-6">
          {destinations.map((item) => (
            <a key={item.slug} href={`/fa/collections/${item.slug}`}>
              {item.name}
            </a>
          ))}
        </nav>
      </noscript>
    </section>
  );
}

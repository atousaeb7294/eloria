"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { House, Search, ShoppingBag, Sparkles } from "lucide-react";
import { TreasuryLink } from "@/components/treasury-transition";
import { getCartQuantity, subscribeToCart } from "@/lib/cart-storage";

const serverQuantity = () => 0;

export function MobileStoreNavigation({ locale }: { locale: string }) {
  const pathname = usePathname() ?? "";
  const quantity = useSyncExternalStore(subscribeToCart, getCartQuantity, serverQuantity);
  const fa = locale === "fa";
  const base = `/${locale}`;
  const route = pathname.slice(base.length).replace(/\/$/, "");
  const product = route.startsWith("/products/");
  const visible = route === "" || route === "/products" || product
    || route === "/collections" || route.startsWith("/collections/")
    || ["/story", "/about", "/contact", "/atelier", "/journal"].includes(route)
    || route.startsWith("/journal/");

  if (!visible) return null;

  const cartLabel = fa ? "سبد خرید" : "Bag";
  const displayedQuantity = quantity > 99 ? "99+" : quantity.toLocaleString(fa ? "fa-IR" : "en-US");

  return (
    <nav className="eloria-store-dock" aria-label={fa ? "دسترسی سریع فروشگاه" : "Shop navigation"}>
      <TreasuryLink href={`${base}#hero`} aria-current={route === "" ? "page" : undefined}>
        <House aria-hidden="true" size={21} />
        <span>{fa ? "خانه" : "Home"}</span>
      </TreasuryLink>
      <TreasuryLink href={`${base}/products`} aria-current={route === "/products" ? "page" : undefined}>
        <Sparkles aria-hidden="true" size={21} />
        <span>{fa ? "آثار" : "Creations"}</span>
      </TreasuryLink>
      {product ? (
        <a href="#product-purchase" className="eloria-dock-purchase">
          <ShoppingBag aria-hidden="true" size={21} />
          <span>{fa ? "انتخاب و خرید" : "Purchase"}</span>
        </a>
      ) : (
        <TreasuryLink href={`${base}/products#product-search`}>
          <Search aria-hidden="true" size={21} />
          <span>{fa ? "جست‌وجو" : "Search"}</span>
        </TreasuryLink>
      )}
      <TreasuryLink href={`${base}/cart`} aria-label={quantity ? `${cartLabel}، ${displayedQuantity}` : cartLabel}>
        <span className="eloria-dock-bag">
          <ShoppingBag aria-hidden="true" size={21} />
          {quantity > 0 && <span className="eloria-dock-count">{displayedQuantity}</span>}
        </span>
        <span>{cartLabel}</span>
      </TreasuryLink>
    </nav>
  );
}

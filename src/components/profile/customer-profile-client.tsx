"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Bell, Check, Heart, LogOut, MapPin, Package, Plus, Save, Trash2, UserRound } from "lucide-react";

type Order = {
  id: string; orderNumber: string; status: string; payableToman: string; createdAt: string; paidAt: string | null;
  items: Array<{ id: string; productSlug: string; productNameFa: string; productNameEn: string; quantity: number; lineTotalToman: string }>;
};
type Address = { id: string; title: string; recipientName: string; mobile: string; province: string; city: string; postalCode: string; address: string; isDefault: boolean };
type Favorite = { slug: string; nameFa: string; nameEn: string; status: string; imageUrl: string; savedAt: string };
type Notification = { id: string; type: string; titleFa: string; titleEn: string; bodyFa: string; bodyEn: string; orderId: string | null; readAt: string | null; createdAt: string };
type Data = {
  customer: { id: string; mobile: string; fullName: string | null; email: string | null; mobileVerifiedAt: Date | string | null; createdAt: Date | string };
  orders: Order[]; addresses: Address[]; favorites: Favorite[]; notifications: Notification[];
};

type AddressForm = Omit<Address, "id">;
const emptyAddress: AddressForm = { title: "", recipientName: "", mobile: "", province: "", city: "", postalCode: "", address: "", isDefault: false };

function toman(value: string, fa: boolean) {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return new Intl.NumberFormat(fa ? "fa-IR" : "en-US").format(n);
}

function statusLabel(status: string, fa: boolean) {
  const map: Record<string, [string, string]> = {
    PENDING_PAYMENT: ["در انتظار پرداخت", "Pending payment"], PAID: ["پرداخت‌شده", "Paid"], PROCESSING: ["در حال آماده‌سازی", "Processing"],
    SHIPPED: ["ارسال‌شده", "Shipped"], COMPLETED: ["تکمیل‌شده", "Completed"], PAYMENT_FAILED: ["پرداخت ناموفق", "Payment failed"],
    PAYMENT_REVIEW: ["نیازمند بررسی", "Payment review"], CANCELLED: ["لغوشده", "Cancelled"], EXPIRED: ["منقضی", "Expired"], REFUNDED: ["بازپرداخت‌شده", "Refunded"],
  };
  return map[status]?.[fa ? 0 : 1] ?? status;
}

export function CustomerProfileClient({ locale, initialData }: { locale: "fa" | "en"; initialData: Data }) {
  const fa = locale === "fa";
  const router = useRouter();
  const [profile, setProfile] = useState({ fullName: initialData.customer.fullName ?? "", email: initialData.customer.email ?? "" });
  const [addressForm, setAddressForm] = useState<AddressForm>({ ...emptyAddress, mobile: initialData.customer.mobile, recipientName: initialData.customer.fullName ?? "" });
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const unread = useMemo(() => initialData.notifications.filter(n => !n.readAt).length, [initialData.notifications]);

  async function jsonAction(url: string, method: string, body?: unknown) {
    const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const data = await response.json().catch(() => null) as { successful?: boolean; message?: string } | null;
    if (!response.ok || !data?.successful) throw new Error(data?.message || (fa ? "عملیات ناموفق بود." : "Action failed."));
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault(); setBusy("profile"); setMessage(null);
    try { await jsonAction("/api/customer/me", "PATCH", profile); setMessage(fa ? "اطلاعات حساب ذخیره شد." : "Account details saved."); router.refresh(); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Error"); } finally { setBusy(null); }
  }

  async function saveAddress(event: FormEvent) {
    event.preventDefault(); setBusy("address"); setMessage(null);
    try {
      await jsonAction(editingAddressId ? `/api/customer/addresses/${editingAddressId}` : "/api/customer/addresses", editingAddressId ? "PATCH" : "POST", addressForm);
      setEditingAddressId(null); setAddressForm({ ...emptyAddress, mobile: initialData.customer.mobile, recipientName: initialData.customer.fullName ?? "" });
      setMessage(fa ? "آدرس ذخیره شد." : "Address saved."); router.refresh();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Error"); } finally { setBusy(null); }
  }

  async function removeAddress(id: string) {
    setBusy(`address-${id}`); setMessage(null);
    try { await jsonAction(`/api/customer/addresses/${id}`, "DELETE"); router.refresh(); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Error"); } finally { setBusy(null); }
  }

  async function removeFavorite(slug: string) {
    setBusy(`fav-${slug}`);
    try { await jsonAction("/api/customer/favorites", "DELETE", { slug }); router.refresh(); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Error"); } finally { setBusy(null); }
  }

  async function markAllRead() {
    setBusy("notifications");
    try { await jsonAction("/api/customer/notifications", "PATCH", { all: true }); router.refresh(); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Error"); } finally { setBusy(null); }
  }

  async function continuePayment(orderId: string) {
    setBusy(`pay-${orderId}`); setMessage(null);
    try {
      const response = await fetch("/api/payments/zarinpal/start", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        cache: "no-store",
        body: JSON.stringify({ orderId, mobile: initialData.customer.mobile }),
      });
      const data = await response.json().catch(() => null) as { successful?: boolean; message?: string; payment?: { redirectUrl?: string | null } } | null;
      const redirectUrl = data?.payment?.redirectUrl;
      if (!response.ok || data?.successful !== true || !redirectUrl) throw new Error(data?.message || (fa ? "اتصال به درگاه ناموفق بود." : "Unable to start payment."));
      window.location.assign(redirectUrl);
    } catch (e) { setMessage(e instanceof Error ? e.message : "Error"); setBusy(null); }
  }

  async function cancelOrder(orderId: string) {
    if (typeof window !== "undefined" && !window.confirm(fa ? "این سفارش لغو شود و رزرو موجودی آزاد شود؟" : "Cancel this order and release its inventory reservation?")) return;
    setBusy(`cancel-${orderId}`); setMessage(null);
    try {
      await jsonAction(`/api/customer/orders/${orderId}/cancel`, "POST");
      setMessage(fa ? "سفارش لغو شد." : "Order cancelled.");
      router.refresh();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Error"); }
    finally { setBusy(null); }
  }

  async function logout() {
    setBusy("logout");
    try { await jsonAction("/api/customer/auth/logout", "POST"); router.replace(`/${locale}/login`); router.refresh(); }
    finally { setBusy(null); }
  }

  const card = "rounded-[28px] border border-[#d8b967]/12 bg-[linear-gradient(155deg,rgba(6,33,24,.72),rgba(2,17,12,.72))] p-5 sm:p-7";
  const input = "h-12 w-full rounded-2xl border border-[#d8b967]/12 bg-black/18 px-4 text-sm text-[#eee0bf] outline-none focus:border-[#dfc575]/35";

  return (
    <main dir={fa ? "rtl" : "ltr"} className="mx-auto max-w-7xl px-4 pb-24 pt-32 sm:px-6 sm:pt-40">
      <header className="rounded-[34px] border border-[#d8b967]/14 bg-[linear-gradient(145deg,rgba(8,42,30,.84),rgba(2,18,13,.9))] p-6 sm:p-9">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs text-[#d9c277]/65">{fa ? "حساب واقعی مشتری" : "Customer account"}</p>
            <h1 className={fa ? "font-persian-title mt-3 text-3xl text-[#f2e6c9] sm:text-4xl" : "mt-3 text-3xl font-semibold text-[#f2e6c9] sm:text-4xl"}>{initialData.customer.fullName || (fa ? "عضو الوریا" : "Eloria member")}</h1>
            <p className="mt-3 text-sm text-[#cbbd9a]/60">{initialData.customer.mobile}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2"><Link href={`/${locale}/profile/watches`} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#d8b967]/16 bg-[#d8b967]/[.05] px-4 text-xs text-[#e8d08a]/78"><Bell className="h-4 w-4" />{fa ? "پیگیری‌ها" : "Watches"}</Link><button onClick={() => void logout()} disabled={busy === "logout"} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-red-300/15 bg-red-300/[.04] px-5 text-xs text-red-100/70"><LogOut className="h-4 w-4" />{fa ? "خروج امن" : "Sign out"}</button></div>
        </div>
      </header>

      {message ? <div className="mt-5 rounded-2xl border border-[#d8b967]/12 bg-[#071d15]/80 p-4 text-sm text-[#e4d4ae]/75">{message}</div> : null}

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          [Package, fa ? "سفارش‌ها" : "Orders", initialData.orders.length],
          [MapPin, fa ? "آدرس‌ها" : "Addresses", initialData.addresses.length],
          [Heart, fa ? "علاقه‌مندی‌ها" : "Favorites", initialData.favorites.length],
          [Bell, fa ? "اعلان جدید" : "Unread", unread],
        ].map(([Icon, label, value], i) => {
          const C = Icon as typeof Package;
          return <div key={i} className={card}><C className="h-5 w-5 text-[#d9bd72]/65" /><p className="mt-4 text-2xl text-[#f0dfb4]">{String(value)}</p><p className="mt-1 text-xs text-[#c5b797]/55">{String(label)}</p></div>;
        })}
      </div>

      <section className={`${card} mt-6`}>
        <div className="flex items-center gap-3"><Package className="h-5 w-5 text-[#dfc577]" /><h2 className={fa ? "font-persian-title text-xl" : "text-xl font-semibold"}>{fa ? "سفارش‌های من" : "My orders"}</h2></div>
        <div className="mt-5 space-y-3">
          {initialData.orders.length ? initialData.orders.map(order => (
            <article key={order.id} className="rounded-2xl border border-[#d8b967]/9 bg-black/12 p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="font-mono text-sm text-[#ead391]">{order.orderNumber}</p><p className="mt-1 text-xs text-[#c5b798]/50">{new Date(order.createdAt).toLocaleString(fa ? "fa-IR" : "en-US")}</p></div>
                <div className="text-start sm:text-end"><p className="text-sm text-[#ead8ad]">{toman(order.payableToman, fa)} {fa ? "تومان" : "Toman"}</p><p className="mt-1 text-xs text-[#d9bd72]/65">{statusLabel(order.status, fa)}</p></div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">{order.items.map(item => <Link key={item.id} href={`/${locale}/products/${item.productSlug}`} className="rounded-full border border-[#d8b967]/10 px-3 py-1.5 text-[11px] text-[#d3c49f]/65">{fa ? item.productNameFa : item.productNameEn} × {item.quantity}</Link>)}</div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Link href={`/${locale}/order-tracking?code=${encodeURIComponent(order.orderNumber)}`} className="inline-flex text-xs text-[#e1c576]">{fa ? "پیگیری سفارش" : "Track order"}</Link>
                {order.status === "PENDING_PAYMENT" || order.status === "PAYMENT_FAILED" ? (
                  <>
                    <button type="button" disabled={busy === `pay-${order.id}`} onClick={() => void continuePayment(order.id)} className="inline-flex min-h-9 items-center justify-center rounded-full border border-[#d8b967]/20 bg-[#123829] px-4 text-xs text-[#edd58b] disabled:opacity-50">
                      {busy === `pay-${order.id}` ? (fa ? "در حال اتصال..." : "Connecting...") : (fa ? "ادامه پرداخت" : "Continue payment")}
                    </button>
                    <button type="button" disabled={busy === `cancel-${order.id}`} onClick={() => void cancelOrder(order.id)} className="inline-flex min-h-9 items-center justify-center rounded-full border border-red-300/15 px-4 text-xs text-red-100/60 disabled:opacity-50">
                      {busy === `cancel-${order.id}` ? (fa ? "در حال لغو..." : "Cancelling...") : (fa ? "لغو سفارش" : "Cancel order")}
                    </button>
                  </>
                ) : null}
              </div>
            </article>
          )) : <p className="py-6 text-sm text-[#c7b995]/55">{fa ? "هنوز سفارشی به این حساب متصل نشده است." : "No orders are linked to this account yet."}</p>}
        </div>
      </section>

      <section className={`${card} mt-6`}>
        <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><MapPin className="h-5 w-5 text-[#dfc577]" /><h2 className={fa ? "font-persian-title text-xl" : "text-xl font-semibold"}>{fa ? "آدرس‌های من" : "My addresses"}</h2></div><Plus className="h-4 w-4 text-[#d8bd72]/60" /></div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {initialData.addresses.map(a => <article key={a.id} className="rounded-2xl border border-[#d8b967]/9 bg-black/12 p-4">
            <div className="flex items-start justify-between gap-3"><div><p className="text-sm text-[#ead9b1]">{a.title}{a.isDefault ? <span className="ms-2 text-[10px] text-[#d9bd72]">{fa ? "پیش‌فرض" : "Default"}</span> : null}</p><p className="mt-2 text-xs leading-6 text-[#c5b797]/55">{a.province}، {a.city}، {a.address}</p><p className="mt-1 text-xs text-[#c5b797]/45">{a.postalCode} · {a.mobile}</p></div><div className="flex gap-1"><button onClick={() => { setEditingAddressId(a.id); setAddressForm({ title: a.title, recipientName: a.recipientName, mobile: a.mobile, province: a.province, city: a.city, postalCode: a.postalCode, address: a.address, isDefault: a.isDefault }); }} className="rounded-lg p-2 text-[#d9bd72]/60"><Save className="h-4 w-4" /></button><button disabled={busy === `address-${a.id}`} onClick={() => void removeAddress(a.id)} className="rounded-lg p-2 text-red-200/50"><Trash2 className="h-4 w-4" /></button></div></div>
          </article>)}
        </div>
        <form onSubmit={saveAddress} className="mt-5 grid gap-3 md:grid-cols-2">
          <input className={input} placeholder={fa ? "عنوان آدرس (خانه، محل کار...)" : "Address title"} value={addressForm.title} onChange={e => setAddressForm(v => ({ ...v, title: e.target.value }))} />
          <input className={input} placeholder={fa ? "نام تحویل‌گیرنده" : "Recipient name"} value={addressForm.recipientName} onChange={e => setAddressForm(v => ({ ...v, recipientName: e.target.value }))} />
          <input className={input} placeholder={fa ? "موبایل تحویل‌گیرنده" : "Recipient mobile"} value={addressForm.mobile} onChange={e => setAddressForm(v => ({ ...v, mobile: e.target.value }))} />
          <input className={input} placeholder={fa ? "استان" : "Province"} value={addressForm.province} onChange={e => setAddressForm(v => ({ ...v, province: e.target.value }))} />
          <input className={input} placeholder={fa ? "شهر" : "City"} value={addressForm.city} onChange={e => setAddressForm(v => ({ ...v, city: e.target.value }))} />
          <input className={input} placeholder={fa ? "کد پستی" : "Postal code"} value={addressForm.postalCode} onChange={e => setAddressForm(v => ({ ...v, postalCode: e.target.value }))} />
          <textarea className="min-h-28 rounded-2xl border border-[#d8b967]/12 bg-black/18 p-4 text-sm text-[#eee0bf] outline-none focus:border-[#dfc575]/35 md:col-span-2" placeholder={fa ? "نشانی کامل" : "Full address"} value={addressForm.address} onChange={e => setAddressForm(v => ({ ...v, address: e.target.value }))} />
          <label className="flex items-center gap-2 text-xs text-[#c7b998]/60"><input type="checkbox" checked={addressForm.isDefault} onChange={e => setAddressForm(v => ({ ...v, isDefault: e.target.checked }))} />{fa ? "آدرس پیش‌فرض" : "Default address"}</label>
          <button disabled={busy === "address"} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#d8b967]/20 bg-[#123829] text-xs text-[#e8d18b]"><Save className="h-4 w-4" />{editingAddressId ? (fa ? "ذخیره ویرایش" : "Save changes") : (fa ? "افزودن آدرس" : "Add address")}</button>
        </form>
      </section>

      <section className={`${card} mt-6`}>
        <div className="flex items-center gap-3"><Heart className="h-5 w-5 text-[#dfc577]" /><h2 className={fa ? "font-persian-title text-xl" : "text-xl font-semibold"}>{fa ? "علاقه‌مندی‌ها" : "Favorites"}</h2></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {initialData.favorites.map(item => <article key={item.slug} className="flex items-center gap-3 rounded-2xl border border-[#d8b967]/9 bg-black/12 p-3">
            <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-black/20">{item.imageUrl ? <Image src={item.imageUrl} alt={fa ? item.nameFa : item.nameEn} fill sizes="64px" className="object-cover" /> : null}</div>
            <Link href={`/${locale}/products/${item.slug}`} className="min-w-0 flex-1 text-sm text-[#ead9b1]">{fa ? item.nameFa : item.nameEn}</Link>
            <button disabled={busy === `fav-${item.slug}`} onClick={() => void removeFavorite(item.slug)} className="p-2 text-red-200/50"><Trash2 className="h-4 w-4" /></button>
          </article>)}
          {!initialData.favorites.length ? <p className="text-sm text-[#c7b995]/55">{fa ? "هنوز محصولی ذخیره نکرده‌اید." : "No saved products yet."}</p> : null}
        </div>
      </section>

      <section className={`${card} mt-6`}>
        <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><Bell className="h-5 w-5 text-[#dfc577]" /><h2 className={fa ? "font-persian-title text-xl" : "text-xl font-semibold"}>{fa ? "اعلان‌ها" : "Notifications"}</h2></div>{unread ? <button disabled={busy === "notifications"} onClick={() => void markAllRead()} className="inline-flex items-center gap-2 text-xs text-[#d8bd72]/70"><Check className="h-4 w-4" />{fa ? "خواندن همه" : "Mark all read"}</button> : null}</div>
        <div className="mt-5 space-y-2">{initialData.notifications.map(n => <article key={n.id} className={`rounded-2xl border p-4 ${n.readAt ? "border-[#d8b967]/7 bg-black/8" : "border-[#d8b967]/16 bg-[#0b2c20]/45"}`}><p className="text-sm text-[#e9d7ad]">{fa ? n.titleFa : n.titleEn}</p><p className="mt-2 text-xs leading-6 text-[#c4b696]/55">{fa ? n.bodyFa : n.bodyEn}</p></article>)}{!initialData.notifications.length ? <p className="text-sm text-[#c7b995]/55">{fa ? "اعلان جدیدی ندارید." : "No notifications yet."}</p> : null}</div>
      </section>

      <section className={`${card} mt-6`}>
        <div className="flex items-center gap-3"><UserRound className="h-5 w-5 text-[#dfc577]" /><h2 className={fa ? "font-persian-title text-xl" : "text-xl font-semibold"}>{fa ? "اطلاعات حساب" : "Account details"}</h2></div>
        <form onSubmit={saveProfile} className="mt-5 grid gap-3 sm:grid-cols-2"><input className={input} value={profile.fullName} onChange={e => setProfile(v => ({ ...v, fullName: e.target.value }))} placeholder={fa ? "نام و نام خانوادگی" : "Full name"} /><input className={input} value={profile.email} onChange={e => setProfile(v => ({ ...v, email: e.target.value }))} placeholder={fa ? "ایمیل" : "Email"} /><input className={`${input} opacity-65`} value={initialData.customer.mobile} disabled /><button disabled={busy === "profile"} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#d8b967]/20 bg-[#123829] text-xs text-[#e8d18b]"><Save className="h-4 w-4" />{fa ? "ذخیره اطلاعات" : "Save details"}</button></form>
      </section>
    </main>
  );
}

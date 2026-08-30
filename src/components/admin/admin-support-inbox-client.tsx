"use client";

import {
  CheckCheck,
  LoaderCircle,
  Mail,
  MessageCircleMore,
  Phone,
  RefreshCw,
  Send,
  XCircle,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type InboxItem = {
  id: string;
  status: "open" | "closed";
  locale: "fa" | "en";
  lastMessageAt: string;
  createdAt: string;
  visitor: { name: string | null; email: string | null; phone: string | null };
  unreadCount: number;
  lastMessage: { body: string; author: "visitor" | "admin"; createdAt: string } | null;
};

type ChatMessage = {
  id: string;
  author: "visitor" | "admin";
  body: string;
  createdAt: string;
};

type Conversation = Omit<InboxItem, "unreadCount" | "lastMessage"> & {
  messages: ChatMessage[];
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fa-IR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function parseJson(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

export function AdminSupportInboxClient() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const inboxBusy = useRef(false);
  const conversationBusy = useRef(false);
  const heartbeatBusy = useRef(false);

  const refreshInbox = useCallback(async () => {
    if (inboxBusy.current || document.visibilityState === "hidden") return;
    inboxBusy.current = true;
    try {
      const response = await fetch("/api/admin/support", { cache: "no-store" });
      const data = parseJson(await response.json().catch(() => null));
      if (!response.ok || data?.successful !== true || !Array.isArray(data.conversations)) {
        throw new Error("دریافت صندوق پشتیبانی ممکن نیست.");
      }
      const inbox = data.conversations as InboxItem[];
      setItems(inbox);
      setSelectedId((current) => current ?? inbox[0]?.id ?? null);
      setFeedback(null);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "دریافت صندوق پشتیبانی ممکن نیست.");
    } finally {
      inboxBusy.current = false;
      setLoading(false);
    }
  }, []);

  const refreshConversation = useCallback(async (id: string) => {
    if (conversationBusy.current || document.visibilityState === "hidden") return;
    conversationBusy.current = true;
    try {
      const response = await fetch(`/api/admin/support?conversation=${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      const data = parseJson(await response.json().catch(() => null));
      if (!response.ok || data?.successful !== true || !data.conversation) {
        throw new Error("دریافت گفت‌وگو ممکن نیست.");
      }
      setConversation(data.conversation as Conversation);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "دریافت گفت‌وگو ممکن نیست.");
    } finally {
      conversationBusy.current = false;
    }
  }, []);

  const heartbeat = useCallback(async () => {
    if (heartbeatBusy.current || document.visibilityState === "hidden") return;
    heartbeatBusy.current = true;
    try {
      await fetch("/api/admin/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "heartbeat" }),
      });
    } catch {
      // A later heartbeat retries automatically; avoid disrupting the inbox UI.
    } finally {
      heartbeatBusy.current = false;
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void refreshInbox();
      void heartbeat();
    }, 0);
    const inboxTimer = window.setInterval(() => void refreshInbox(), 15_000);
    const heartbeatTimer = window.setInterval(() => void heartbeat(), 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshInbox();
        void heartbeat();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(inboxTimer);
      window.clearInterval(heartbeatTimer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [heartbeat, refreshInbox]);

  useEffect(() => {
    if (!selectedId) {
      return;
    }
    const initialLoad = window.setTimeout(() => void refreshConversation(selectedId), 0);
    const timer = window.setInterval(() => void refreshConversation(selectedId), 12_000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, [refreshConversation, selectedId]);

  async function mutate(body: Record<string, unknown>) {
    const response = await fetch("/api/admin/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = parseJson(await response.json().catch(() => null));
    if (!response.ok || data?.successful !== true) {
      throw new Error(typeof data?.message === "string" ? data.message : "ثبت تغییر ممکن نیست.");
    }
    return data;
  }

  async function submitReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId || !reply.trim()) return;
    setSending(true);
    setFeedback(null);
    try {
      await mutate({ action: "reply", conversationId: selectedId, message: reply.trim() });
      setReply("");
      await Promise.all([refreshInbox(), refreshConversation(selectedId)]);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "ارسال پاسخ ممکن نیست.");
    } finally {
      setSending(false);
    }
  }

  async function updateStatus(status: "open" | "closed") {
    if (!selectedId) return;
    setSending(true);
    setFeedback(null);
    try {
      await mutate({ action: "status", conversationId: selectedId, status });
      await Promise.all([refreshInbox(), refreshConversation(selectedId)]);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "تغییر وضعیت ممکن نیست.");
    } finally {
      setSending(false);
    }
  }

  const openCount = useMemo(() => items.filter((item) => item.status === "open").length, [items]);
  const unreadCount = useMemo(() => items.reduce((total, item) => total + item.unreadCount, 0), [items]);

  return (
    <div className="grid min-h-[680px] overflow-hidden rounded-[2rem] border border-[#d7b95f]/18 bg-[#041b14]/85 shadow-[0_24px_70px_rgba(0,0,0,.24)] xl:grid-cols-[22rem_minmax(0,1fr)]">
      <aside className="border-l border-[#d7b95f]/14 bg-[#031811]/70">
        <header className="border-b border-[#d7b95f]/14 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-[#e4ca76]">صندوق گفت‌وگوها</p>
              <p className="mt-2 text-[11px] leading-6 text-[#c9b993]/60">
                {openCount.toLocaleString("fa-IR")} گفت‌وگوی باز · {unreadCount.toLocaleString("fa-IR")} پیام بی‌پاسخ
              </p>
            </div>
            <button type="button" onClick={() => void refreshInbox()} aria-label="تازه‌سازی" className="grid size-9 place-items-center rounded-xl border border-[#d7b95f]/18 text-[#e4ca76] transition hover:bg-[#d7b95f]/10">
              <RefreshCw className="size-4" />
            </button>
          </div>
        </header>

        <div className="max-h-[620px] space-y-2 overflow-y-auto p-3 xl:max-h-[calc(100vh-15rem)]">
          {loading ? <div className="grid min-h-40 place-items-center text-[#d8c39b]/56"><LoaderCircle className="size-5 animate-spin" /></div> : null}
          {!loading && items.length === 0 ? <p className="rounded-2xl border border-dashed border-[#d7b95f]/15 p-4 text-center text-xs leading-7 text-[#c9b993]/58">هنوز پیامی ثبت نشده است. وقتی پشتیبانی آنلاین هستید، حضور شما برای مشتری‌ها فعال می‌شود.</p> : null}
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedId(item.id)}
              className={`w-full rounded-2xl border p-3.5 text-right transition ${selectedId === item.id ? "border-[#e4ca76]/38 bg-[#d7b95f]/[.09]" : "border-transparent bg-white/[.018] hover:border-[#d7b95f]/16 hover:bg-white/[.035]"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-xs text-[#f1e3c3]">{item.visitor.name || item.visitor.email || item.visitor.phone || "مهمان الوریا"}</span>
                {item.unreadCount > 0 ? <span className="grid min-w-5 place-items-center rounded-full bg-[#e0bd65] px-1.5 py-0.5 text-[10px] text-[#162218]">{item.unreadCount.toLocaleString("fa-IR")}</span> : null}
              </div>
              <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-[#c9b993]/58">{item.lastMessage?.body || "بدون پیام"}</p>
              <div className="mt-2 flex items-center justify-between gap-2 text-[9px] text-[#bba96e]/55">
                <span className={item.status === "open" ? "text-emerald-200/75" : "text-white/38"}>{item.status === "open" ? "باز" : "بسته"}</span>
                <span>{formatDate(item.lastMessageAt)}</span>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <section className="flex min-w-0 flex-col">
        {selectedId && conversation ? (
          <>
            <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[#d7b95f]/14 p-5 sm:p-6">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <MessageCircleMore className="size-5 text-[#e3c774]" />
                  <h2 className="truncate text-base text-[#f2e5c7]">{conversation.visitor.name || "گفت‌وگوی مهمان"}</h2>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] ${conversation.status === "open" ? "border-emerald-200/18 bg-emerald-950/20 text-emerald-100/82" : "border-white/10 text-white/45"}`}>{conversation.status === "open" ? "باز" : "بسته"}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#cabd9d]/62">
                  {conversation.visitor.phone ? <a href={`tel:${conversation.visitor.phone}`} className="inline-flex items-center gap-1.5 hover:text-[#f0d98b]"><Phone className="size-3.5" />{conversation.visitor.phone}</a> : null}
                  {conversation.visitor.email ? <a href={`mailto:${conversation.visitor.email}`} className="inline-flex items-center gap-1.5 hover:text-[#f0d98b]"><Mail className="size-3.5" />{conversation.visitor.email}</a> : null}
                  {!conversation.visitor.phone && !conversation.visitor.email ? <span>راه تماس جداگانه ثبت نشده است.</span> : null}
                </div>
              </div>
              <button
                type="button"
                disabled={sending}
                onClick={() => void updateStatus(conversation.status === "open" ? "closed" : "open")}
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#d7b95f]/22 px-4 text-xs text-[#e6ca77] transition hover:bg-[#d7b95f]/10 disabled:opacity-50"
              >
                {conversation.status === "open" ? <XCircle className="size-4" /> : <CheckCheck className="size-4" />}
                {conversation.status === "open" ? "بستن گفت‌وگو" : "باز کردن دوباره"}
              </button>
            </header>

            <div className="min-h-72 flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(circle_at_80%_0%,rgba(183,147,59,.06),transparent_34%)] p-5 sm:p-6">
              {conversation.messages.map((item) => {
                const visitor = item.author === "visitor";
                return (
                  <div key={item.id} className={`flex ${visitor ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[min(38rem,85%)] rounded-2xl px-4 py-3 text-xs leading-7 ${visitor ? "rounded-es-md border border-white/[.09] bg-black/18 text-[#d8cbb1]/78" : "rounded-ee-md border border-[#e4ca76]/22 bg-[#d7b95f]/[.09] text-[#f1e1b6]"}`}>
                      <p className="whitespace-pre-wrap break-words">{item.body}</p>
                      <p className="mt-1 text-[9px] text-white/34">{formatDate(item.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={submitReply} className="border-t border-[#d7b95f]/14 bg-[#031711]/80 p-5 sm:p-6">
              <textarea value={reply} onChange={(event) => setReply(event.target.value)} placeholder="پاسخ پشتیبانی را بنویسید…" maxLength={1200} className="min-h-24 w-full resize-y rounded-2xl border border-white/[.09] bg-black/15 px-4 py-3 text-sm leading-7 text-[#f2e5c8] outline-none placeholder:text-white/30 focus:border-[#e5c970]/45" />
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-[10px] leading-6 text-[#c5b693]/52">ارسال پاسخ، پیام‌های بازدیدکننده را خوانده‌شده علامت می‌زند و حضور شما را آنلاین نگه می‌دارد.</p>
                <button type="submit" disabled={sending || !reply.trim()} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-[#e7cb78]/45 bg-[#d7b95f]/[.1] px-4 text-xs text-[#f2dc98] transition hover:bg-[#d7b95f]/[.16] disabled:opacity-50">
                  {sending ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
                  ارسال پاسخ
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="grid min-h-96 place-items-center p-8 text-center">
            <div className="max-w-sm">
              <MessageCircleMore className="mx-auto size-10 text-[#d8bd69]/62" />
              <h2 className="mt-5 text-lg text-[#eedfbf]">یک گفت‌وگو را انتخاب کنید</h2>
              <p className="mt-3 text-sm leading-8 text-[#c9b993]/60">با باز ماندن این صفحه، دکمهٔ پشتیبانی فروشگاه وضعیت واقعی «آنلاین» را نشان می‌دهد.</p>
            </div>
          </div>
        )}
      </section>

      {feedback ? <p role="alert" className="fixed bottom-5 start-5 z-[100] max-w-sm rounded-2xl border border-rose-200/18 bg-rose-950/88 px-4 py-3 text-xs leading-7 text-rose-100 shadow-xl">{feedback}</p> : null}
    </div>
  );
}

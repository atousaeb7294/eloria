"use client";

import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Headset,
  LoaderCircle,
  Mail,
  MessageCircle,
  Send,
  X,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { TurnstileWidget } from "@/components/turnstile-widget";

type ChatMessage = {
  id: string;
  author: "visitor" | "admin";
  body: string;
  createdAt: string;
};

type ChatSnapshot = {
  successful: boolean;
  enabled?: boolean;
  message?: string;
  agentOnline?: boolean;
  supportEmail?: string | null;
  conversationId?: string;
  conversation?: { id: string; status: "open" | "closed" } | null;
  messages?: ChatMessage[];
};

function parseSnapshot(value: unknown): ChatSnapshot | null {
  if (!value || typeof value !== "object") return null;
  return value as ChatSnapshot;
}

function dateLabel(value: string, locale: "fa" | "en") {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

export function CustomerSupportWidget({ locale }: { locale: "fa" | "en" }) {
  const pathname = usePathname() ?? `/${locale}`;
  const fa = locale === "fa";
  const isAdmin = pathname.includes(`/${locale}/admin`);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [agentOnline, setAgentOnline] = useState(false);
  const [supportEmail, setSupportEmail] = useState<string | null>(null);
  const [conversationOpen, setConversationOpen] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileGeneration, setTurnstileGeneration] = useState(0);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const loadInFlight = useRef(false);

  const copy = useMemo(
    () =>
      fa
        ? {
            title: "پشتیبانی الوریا",
            online: "پشتیبان آنلاین است",
            offline: "پشتیبان فعلاً آنلاین نیست",
            onlineNote: "پیام شما در همین گفت‌وگو پاسخ داده می‌شود.",
            offlineNote: "پیامتان ثبت می‌شود تا در اولین فرصت پاسخ دهیم.",
            start: "چه کمکی از دست ما برمی‌آید؟",
            placeholder: "پیام خود را بنویسید…",
            send: "ارسال پیام",
            sending: "در حال ثبت…",
            details: "ثبت راه تماس برای پاسخ بعدی",
            name: "نام شما",
            email: "ایمیل (اختیاری)",
            phone: "شماره تماس (اختیاری)",
            emailFallback: "ارسال ایمیل به پشتیبانی",
            closed: "این گفت‌وگو بسته شده است؛ با ارسال پیام، دوباره باز می‌شود.",
            disabled: "گفت‌وگوی پشتیبانی در حال حاضر فعال نیست.",
            failed: "ارتباط با پشتیبانی موقتاً ممکن نیست.",
            messageRequired: "ابتدا پیام خود را بنویسید.",
            success: "پیام شما ثبت شد.",
            widget: "گفت‌وگو با پشتیبانی",
            close: "بستن پشتیبانی",
          }
        : {
            title: "Eloria support",
            online: "A support agent is online",
            offline: "Support is currently offline",
            onlineNote: "Replies will appear in this conversation.",
            offlineNote: "Leave a message and we will reply when available.",
            start: "How can we help?",
            placeholder: "Write your message…",
            send: "Send message",
            sending: "Saving…",
            details: "Add contact details for a later reply",
            name: "Your name",
            email: "Email (optional)",
            phone: "Phone (optional)",
            emailFallback: "Email support",
            closed: "This conversation is closed. Sending a message will reopen it.",
            disabled: "Support chat is not enabled at the moment.",
            failed: "Support chat is temporarily unavailable.",
            messageRequired: "Write a message first.",
            success: "Your message was saved.",
            widget: "Chat with support",
            close: "Close support chat",
          },
    [fa],
  );

  const load = useCallback(async () => {
    if (loadInFlight.current || document.visibilityState === "hidden") return;
    loadInFlight.current = true;
    setLoading(true);
    try {
      const response = await fetch("/api/support/chat", {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const data = parseSnapshot(await response.json().catch(() => null));
      if (!response.ok || !data?.successful) {
        setEnabled(false);
        setFeedback({ tone: "error", text: data?.message || copy.failed });
        return;
      }

      setEnabled(data.enabled !== false);
      setAgentOnline(Boolean(data.agentOnline));
      setSupportEmail(data.supportEmail || null);
      setConversationOpen(data.conversation?.status !== "closed");
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch {
      setEnabled(false);
      setFeedback({ tone: "error", text: copy.failed });
    } finally {
      setLoading(false);
      loadInFlight.current = false;
    }
  }, [copy.failed]);

  useEffect(() => {
    if (!open || isAdmin) return;
    const initialLoad = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => void load(), 15_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [isAdmin, load, open]);

  useEffect(() => {
    const handleOpen = () => setOpen(true);
    window.addEventListener("eloria-open-support", handleOpen);
    return () => window.removeEventListener("eloria-open-support", handleOpen);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanMessage = message.trim();
    if (!cleanMessage) {
      setFeedback({ tone: "error", text: copy.messageRequired });
      return;
    }

    setSending(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          locale,
          message: cleanMessage,
          name: name.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          turnstileToken,
        }),
      });
      const data = parseSnapshot(await response.json().catch(() => null));
      if (!response.ok || !data?.successful) {
        throw new Error(data?.message || copy.failed);
      }

      setMessage("");
      setTurnstileToken(null);
      setTurnstileGeneration((value) => value + 1);
      const ticketCode = data.conversationId ? `EL-${data.conversationId.slice(-8).toUpperCase()}` : null;
      setFeedback({ tone: "success", text: !agentOnline && ticketCode ? (locale === "fa" ? `پیام شما ثبت شد. کد پیگیری: ${ticketCode}` : `Your message was saved. Tracking code: ${ticketCode}`) : (data.message || copy.success) });
      await load();
    } catch (error) {
      setFeedback({
        tone: "error",
        text: error instanceof Error ? error.message : copy.failed,
      });
    } finally {
      setSending(false);
    }
  }

  if (isAdmin) return null;

  return (
    <aside
      dir={fa ? "rtl" : "ltr"}
      className="fixed bottom-4 end-4 z-[90] flex max-w-[calc(100vw-2rem)] flex-col items-end gap-3 sm:bottom-6 sm:end-6"
      aria-label={copy.widget}
    >
      {open ? (
        <section className="w-[min(25rem,calc(100vw-2rem))] overflow-hidden rounded-[1.65rem] border border-[#e3c979]/35 bg-[linear-gradient(160deg,rgba(5,48,34,.98),rgba(1,20,14,.99))] shadow-[0_28px_95px_rgba(0,0,0,.62),0_0_38px_rgba(211,176,83,.12)] backdrop-blur-2xl">
          <header className="relative border-b border-[#e2c879]/16 px-4 py-4 sm:px-5">
            <div aria-hidden="true" className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#f8df91]/80 to-transparent" />
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-[#e2c879]/28 bg-[#d8b967]/[.09] text-[#f0d886]">
                  <Headset className="size-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-medium text-[#f5e8c8]">{copy.title}</h2>
                  <p className="mt-1 flex items-center gap-1.5 text-[11px] text-[#d7c9a7]/64">
                    <span className={`size-1.5 rounded-full ${agentOnline ? "bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,.7)]" : "bg-[#d7b967]/65"}`} />
                    {agentOnline ? copy.online : copy.offline}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={copy.close}
                className="grid size-8 shrink-0 place-items-center rounded-full border border-white/10 text-[#d6c6a5]/65 transition hover:border-[#e6ca76]/36 hover:text-[#f0d98b]"
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="mt-3 text-[11px] leading-6 text-[#cfbf9d]/60">{agentOnline ? copy.onlineNote : copy.offlineNote}</p>
          </header>

          <div className="max-h-[min(19rem,45dvh)] min-h-28 space-y-2 overflow-y-auto px-4 py-4 sm:px-5">
            {loading && messages.length === 0 ? (
              <div className="flex min-h-24 items-center justify-center gap-2 text-xs text-[#d5c4a0]/55">
                <LoaderCircle className="size-4 animate-spin" />
                {fa ? "در حال اتصال…" : "Connecting…"}
              </div>
            ) : null}

            {!loading && enabled === false ? (
              <div className="rounded-2xl border border-amber-200/16 bg-amber-950/16 p-4 text-xs leading-7 text-amber-100/78">
                {feedback?.text || copy.disabled}
              </div>
            ) : null}

            {enabled !== false && messages.length === 0 ? (
              <p className="rounded-2xl border border-white/[.07] bg-black/12 p-4 text-xs leading-7 text-[#d1c2a1]/62">{copy.start}</p>
            ) : null}

            {messages.map((item) => {
              const visitor = item.author === "visitor";
              return (
                <div key={item.id} className={`flex ${visitor ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[86%] rounded-2xl px-3.5 py-3 text-xs leading-6 ${visitor ? "rounded-es-md border border-[#e3c979]/25 bg-[#caa950]/[.13] text-[#f3e3b8]" : "rounded-ee-md border border-white/[.09] bg-black/18 text-[#d9ceb7]/78"}`}>
                    <p className="whitespace-pre-wrap break-words">{item.body}</p>
                    <p className="mt-1 text-[9px] text-white/35">{dateLabel(item.createdAt, locale)}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {enabled !== false ? (
            <form onSubmit={submit} className="border-t border-[#e2c879]/14 bg-black/10 p-4 sm:p-5">
              {!conversationOpen ? <p className="mb-3 rounded-xl border border-[#d8b967]/16 bg-[#d8b967]/[.05] px-3 py-2 text-[10px] leading-6 text-[#dec782]/78">{copy.closed}</p> : null}
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="min-h-20 w-full resize-y rounded-2xl border border-white/[.09] bg-black/15 px-3.5 py-3 text-xs leading-6 text-[#f0e2c4] outline-none transition placeholder:text-white/30 focus:border-[#e4c76e]/48"
                maxLength={1200}
                placeholder={copy.placeholder}
              />

              <button
                type="button"
                onClick={() => setDetailsOpen((value) => !value)}
                aria-expanded={detailsOpen}
                className="mt-3 flex items-center gap-1.5 text-[10px] text-[#d7bd70]/74 transition hover:text-[#f0d987]"
              >
                {detailsOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                {copy.details}
              </button>

              {detailsOpen ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <input value={name} onChange={(event) => setName(event.target.value)} className="rounded-xl border border-white/[.08] bg-black/15 px-3 py-2.5 text-xs text-[#eadfc7] outline-none placeholder:text-white/30 focus:border-[#e4c76e]/42" placeholder={copy.name} autoComplete="name" maxLength={120} />
                  <input value={phone} onChange={(event) => setPhone(event.target.value)} className="rounded-xl border border-white/[.08] bg-black/15 px-3 py-2.5 text-xs text-[#eadfc7] outline-none placeholder:text-white/30 focus:border-[#e4c76e]/42" placeholder={copy.phone} autoComplete="tel" inputMode="tel" maxLength={30} />
                  <input value={email} onChange={(event) => setEmail(event.target.value)} className="rounded-xl border border-white/[.08] bg-black/15 px-3 py-2.5 text-xs text-[#eadfc7] outline-none placeholder:text-white/30 focus:border-[#e4c76e]/42 sm:col-span-2" placeholder={copy.email} autoComplete="email" inputMode="email" maxLength={254} />
                </div>
              ) : null}

              <TurnstileWidget key={turnstileGeneration} locale={locale} action="support-chat" onTokenChange={setTurnstileToken} />

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#eed27f]/46 bg-[#d9b85f]/[.11] px-4 text-xs text-[#f4dda0] transition hover:border-[#f2d785]/75 hover:bg-[#d9b85f]/[.17] disabled:cursor-wait disabled:opacity-60"
                >
                  {sending ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
                  {sending ? copy.sending : copy.send}
                </button>
                {supportEmail ? (
                  <a href={`mailto:${supportEmail}`} className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-2 text-[10px] text-[#d7c29a]/66 transition hover:text-[#f0d98a]">
                    <Mail className="size-3.5" />
                    {copy.emailFallback}
                  </a>
                ) : null}
              </div>

              {feedback ? (
                <p className={`mt-3 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-[10px] leading-6 ${feedback.tone === "success" ? "border-emerald-200/16 bg-emerald-950/16 text-emerald-100/85" : "border-rose-200/18 bg-rose-950/16 text-rose-100/85"}`}>
                  {feedback.tone === "success" ? <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" /> : <CircleAlert className="mt-0.5 size-3.5 shrink-0" />}
                  {feedback.text}
                </p>
              ) : null}
            </form>
          ) : null}
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? copy.close : copy.widget}
        className="group relative flex min-h-12 items-center gap-2.5 overflow-hidden rounded-full border border-[#e6ca76]/44 bg-[linear-gradient(135deg,rgba(8,74,52,.96),rgba(183,142,54,.31))] px-4 text-xs text-[#f6e2a2] shadow-[0_16px_45px_rgba(0,0,0,.38),0_0_24px_rgba(216,184,95,.11)] transition duration-300 hover:-translate-y-0.5 hover:border-[#f0d681]/72"
      >
        <span aria-hidden="true" className="absolute inset-0 translate-x-full bg-[linear-gradient(105deg,transparent,rgba(255,239,177,.16),transparent)] transition-transform duration-1000 group-hover:-translate-x-full" />
        <span className="relative grid size-7 place-items-center rounded-full border border-[#f1d987]/24 bg-black/12">
          <MessageCircle className="size-4" />
        </span>
        <span className="relative hidden sm:inline">{open ? copy.close : copy.widget}</span>
        <span className={`relative size-2 rounded-full ${agentOnline ? "bg-emerald-300" : "bg-[#e2c16c]"}`} aria-hidden="true" />
      </button>
    </aside>
  );
}

"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { CheckCircle2, Search, Send, ShieldAlert } from "lucide-react";

type SupportFormProps = {
  locale: string;
};

export function ContactRequestForm({ locale }: SupportFormProps) {
  const isPersian = locale === "fa";
  const [submitted, setSubmitted] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <form onSubmit={submit} className="eloria-panel rounded-[2.2rem] p-5 sm:p-8" data-reveal="left">
      <p className="eloria-kicker">{isPersian ? "فرم ارتباط" : "Contact form"}</p>
      <h2 className="mt-3 text-2xl font-semibold text-[#f2e4c5]">
        {isPersian ? "پیام خود را ثبت کنید" : "Leave your message"}
      </h2>
      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-xs text-[#d8c9a6]/72">
          <span>{isPersian ? "نام و نام خانوادگی" : "Full name"}</span>
          <input className="eloria-field" required name="name" autoComplete="name" />
        </label>
        <label className="space-y-2 text-xs text-[#d8c9a6]/72">
          <span>{isPersian ? "شماره تماس" : "Phone number"}</span>
          <input className="eloria-field" required name="phone" inputMode="tel" autoComplete="tel" />
        </label>
      </div>
      <label className="mt-4 block space-y-2 text-xs text-[#d8c9a6]/72">
        <span>{isPersian ? "موضوع" : "Subject"}</span>
        <input className="eloria-field" required name="subject" />
      </label>
      <label className="mt-4 block space-y-2 text-xs text-[#d8c9a6]/72">
        <span>{isPersian ? "متن پیام" : "Message"}</span>
        <textarea className="eloria-field min-h-36 resize-y py-4" required name="message" />
      </label>
      <button className="eloria-button-primary mt-6 w-full sm:w-auto" type="submit">
        <Send className="size-4" />
        {isPersian ? "ثبت درخواست" : "Submit request"}
      </button>

      {submitted ? (
        <div role="status" className="mt-5 flex gap-3 rounded-2xl border border-amber-200/18 bg-amber-950/20 p-4 text-xs leading-7 text-amber-100/75">
          <ShieldAlert className="mt-1 size-5 shrink-0" />
          <p>
            {isPersian
              ? "فرم از نظر ظاهری آماده است، اما هنوز به سامانه پشتیبانی متصل نشده و اطلاعاتی ارسال نشد."
              : "The form interface is ready, but it is not connected to the support system yet, so no data was sent."}
          </p>
        </div>
      ) : null}
    </form>
  );
}

export function OrderTrackingForm({ locale }: SupportFormProps) {
  const isPersian = locale === "fa";
  const [checked, setChecked] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setChecked(true);
  };

  return (
    <form onSubmit={submit} className="eloria-panel mx-auto max-w-3xl rounded-[2.2rem] p-5 sm:p-8" data-reveal>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-xs text-[#d8c9a6]/72">
          <span>{isPersian ? "شماره سفارش" : "Order number"}</span>
          <input className="eloria-field" required name="order" placeholder={isPersian ? "مثلاً EL-1024" : "e.g. EL-1024"} />
        </label>
        <label className="space-y-2 text-xs text-[#d8c9a6]/72">
          <span>{isPersian ? "شماره موبایل خریدار" : "Customer phone"}</span>
          <input className="eloria-field" required name="phone" inputMode="tel" />
        </label>
      </div>
      <button className="eloria-button-primary mt-6 w-full sm:w-auto" type="submit">
        <Search className="size-4" />
        {isPersian ? "بررسی وضعیت" : "Check status"}
      </button>

      {checked ? (
        <div role="status" className="mt-6 flex gap-3 rounded-2xl border border-[#d9b85f]/18 bg-[#d9b85f]/[0.045] p-4 text-xs leading-7 text-[#ead9ad]/72">
          <CheckCircle2 className="mt-1 size-5 shrink-0 text-[#dfc16e]" />
          <p>
            {isPersian
              ? "ظاهر صفحه پیگیری آماده است. نمایش وضعیت واقعی پس از اتصال این فرم به سامانه سفارش‌ها فعال می‌شود."
              : "The tracking interface is ready. Real order status will appear after this form is connected to the order system."}
          </p>
        </div>
      ) : null}
    </form>
  );
}

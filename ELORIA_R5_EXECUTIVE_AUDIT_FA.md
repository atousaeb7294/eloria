# ELORIA R5 — ممیزی اجرایی مدیر ارشد محصول/طراحی/هوش

## P0 — امنیت و پایداری
- Next.js هدف انتشار: 16.3.3 (Security patch شاخه 16.3).
- React 19.2.4 در خط امن RSC حفظ شده؛ Major/Minor غیرضروری تغییر نکرد.
- Prisma 7.9.1 حفظ شده تا ریسک Migration/Adapter ایجاد نشود.
- قیمت، تخفیف و پرداخت سمت سرور دوباره اعتبارسنجی می‌شوند.
- Admin Session/TOTP، rate limit، Turnstile، CSP، Audit/Security events حفظ شده‌اند.

## P1 — طراحی و Fashion UX — انجام شد
- Home از Carousel/کارت‌های مشابه به Luxury Fashion Editorial تبدیل شد.
- Runway چهار اثر اول + Gallery نامتقارن با قاب‌های عمودی و افقی.
- موشن مبتنی بر viewport/scroll و فقط transform/opacity.
- Reduced Motion رعایت می‌شود.
- Carousel خودکار و حرکت بی‌وقفه قبلی حذف شد تا تجربه آرام‌تر و سبک‌تر شود.

## P1 — هوش فروش رایگان — انجام شد
- انتخاب روزانه 12 اثر بر پایه فروش واقعی، بازدید، Favorite، Featured، موجودی و تازگی.
- برچسب داده‌محور: تازه / ترند / محبوب / پرفروش / منتخب ادیتور.
- Recommendation و Search فارسی هوشمند قبلی حفظ شد.
- RFM، Product Quality Score و فرصت‌های «بازدید بالا / فروش صفر» حفظ شدند.

## P1 — بازاریابی و اندازه‌گیری — انجام شد
- Event رضایتی `select_item` برای کلیک روی آثار Home اضافه شد.
- UTM تا سفارش نهایی حفظ می‌شود.
- Funnel: Product → Cart → Checkout → Paid.
- Search / Filter / Favorite / Coupon / Add-to-cart events حفظ شدند.

## P1 — SEO — انجام/حفظ شد
- Product/Organization structured data، sitemap، robots و canonical حفظ شدند.
- صفحات فیلترشده noindex + canonical کنترل‌شده دارند.
- Next/Image با sizes واکنش‌گرا، lazy loading و اولویت فقط برای تصاویر بالای ویترین.
- مجله، داستان اثر و لینک‌سازی داخلی حفظ شده‌اند.

## P1 — Performance — انجام شد
- انیمیشن auto-advance ویترین حذف شد.
- Motion بعد از Intro و هنگام ورود به viewport کار می‌کند.
- content-visibility برای بخش‌های پایین صفحه.
- Navigation accelerator و prefetch داخلی R4 حفظ شده‌اند.

## P1 — Conversion — حفظ شد
- توضیحات مشتری از Cart تا DB.
- ELORIA50 مبلغ ثابت 50,000 تومان، فقط خرید اول و فقط یک‌بار.
- Preview کوپن سروری و Quote نهایی سروری.
- تماس و پشتیبانی واقعی.

## P2 — AI رایگان — انجام شد
- dependency و Provider مربوط به OpenAI حذف شد.
- حالت پیش‌فرض: Template محلی.
- حالت اختیاری: Ollama خودمیزبان.
- در نبود Ollama، سیستم بدون اثر روی فروش به Template برمی‌گردد.

## موارد عمداً خارج از R5
- موجودی سریال‌محور هر قطعه: نیازمند مهاجرت واقعی موجودی.
- کیف پول/Cashback: نیازمند قواعد مالی و حقوقی.
- QR اصالت دائمی: نیازمند فرآیند صدور و شناسه واقعی.
- AR پرو مجازی: هزینه مدل‌سازی/Performance بالا و برای انتشار اولیه ضروری نیست.
- مدل ML مشتری: تا قبل از داده کافی، Rule/RFM شفاف‌تر و قابل اتکاتر است.

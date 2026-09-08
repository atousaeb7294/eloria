# رفع هشدارهای امنیتی Eloria روی PaaS پارس‌پک

این راهنما مخصوص `eloriagallery.ir` است. از چهار هشدار تصویر، فقط SPF و DMARC به اقدام شما در پنل DNS نیاز دارند. دو هشدار دیگر از کد آسیب‌پذیر Eloria ایجاد نشده‌اند.

## کاری که من در پروژه بررسی کردم

- کوکی ورود مشتری `SameSite=Lax` است.
- کوکی مدیریت و مجوز شروع پرداخت `SameSite=Strict` است.
- هیچ کوکی Eloria با `SameSite=None` ساخته نمی‌شود.
- اجرای JavaScript با CSP مبتنی بر nonce محافظت می‌شود و `script-src` شامل `unsafe-inline` نیست.
- عبارت `unsafe-inline` فقط برای `style-src-attr` است؛ یعنی صرفاً استایل‌های نمایشی React را مجاز می‌کند و اجازه اجرای JavaScript نمی‌دهد. حذف کورکورانه آن ظاهر و انیمیشن‌های سایت را خراب می‌کند.
- کوکی دارای `SameSite=None` با نام تصادفی را خود لایه PaaS پارس‌پک به پاسخ اضافه می‌کند، نه برنامه Eloria.

## مرحله ۱ — اجرای بررسی خودکار در PowerShell

1. فایل ZIP را Extract کنید.
2. وارد پوشه‌ای شوید که فایل `package.json` داخل آن است.
3. داخل فضای خالی پوشه، Shift را نگه دارید و راست‌کلیک کنید؛ سپس **Open in Terminal** را بزنید.
4. این دستور را کامل Paste و Enter کنید:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\ELORIA_SECURITY_FIX_PARSPACK.ps1 -Build -MakeZip
```

اگر همه‌چیز درست باشد، در پوشه بالاتر فایل `eloria-parspack-secure.zip` ساخته می‌شود. همین فایل نسخه آماده استقرار است. اگر فقط می‌خواهید وضعیت سایت و DNS بررسی شود، این دستور کوتاه‌تر را اجرا کنید:

```powershell
.\ELORIA_SECURITY_FIX_PARSPACK.ps1
```

## مرحله ۲ — اصلاح SPF در پنل DNS

این تنظیم زمانی درست است که از آدرس‌های `@eloriagallery.ir` هیچ ایمیلی ارسال نمی‌کنید. دریافت ایمیل یا واردکردن ایمیل مشتری در فرم سایت، «ارسال ایمیل از دامنه» محسوب نمی‌شود.

1. وارد پنل پارس‌پک شوید.
2. بخش **محصولات من / دامنه یا CDN / مدیریت DNS / رکوردهای DNS** دامنه `eloriagallery.ir` را باز کنید. نام دقیق منو ممکن است کمی متفاوت باشد.
3. رکوردهای نوع `TXT` را ببینید.
4. اگر رکوردی با `v=spf1` شروع می‌شود، همان را **ویرایش** کنید؛ رکورد SPF دوم نسازید.
5. مقادیر را این‌طور بگذارید:

| فیلد | مقدار |
|---|---|
| Type | `TXT` |
| Name / Host | `@` |
| Value / Content | `v=spf1 -all` |
| TTL | `3600` یا Auto |

6. ذخیره را بزنید.

اگر واقعاً از دامنه ایمیل می‌فرستید (مثلاً Zoho، Google Workspace، Resend یا سرویس ایمیل پارس‌پک)، مقدار بالا را ثبت نکنید؛ SPF و DKIM باید طبق مشخصات همان سرویس تنظیم شوند.

## مرحله ۳ — افزودن DMARC

در همان صفحه یک رکورد TXT جدید بسازید:

| فیلد | مقدار |
|---|---|
| Type | `TXT` |
| Name / Host | `_dmarc` |
| Value / Content | `v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s; pct=100` |
| TTL | `3600` یا Auto |

اگر پنل خودش نام دامنه را اضافه می‌کند، فقط `_dmarc` بنویسید، نه `_dmarc.eloriagallery.ir`. سپس ذخیره کنید و ۳۰ دقیقه تا ۲۴ ساعت برای انتشار DNS زمان بدهید.

## مرحله ۴ — بررسی DNS بعد از انتشار

PowerShell را باز و این دو دستور را اجرا کنید:

```powershell
Resolve-DnsName -Type TXT eloriagallery.ir
Resolve-DnsName -Type TXT _dmarc.eloriagallery.ir
```

در خروجی باید `v=spf1 -all` و رکورد DMARC بالا دیده شوند. برای دامنه اصلی نباید بیش از یک مقدارِ شروع‌شونده با `v=spf1` وجود داشته باشد.

## مرحله ۵ — هشدار SameSite=None پارس‌پک

این مورد را نمی‌توان از کد Next.js حذف کرد، چون هدر زنده نشان می‌دهد کوکی با نام تصادفی توسط زیرساخت PaaS پس از خروج پاسخ برنامه اضافه می‌شود. در پنل پارس‌پک یک تیکت فنی باز و این متن را ارسال کنید:

> سلام. روی پاسخ HTTPS دامنه eloriagallery.ir، لایه PaaS یک کوکی HttpOnly و Secure با نام تصادفی و ویژگی SameSite=None اضافه می‌کند. برنامه ما چنین کوکی‌ای تولید نمی‌کند و تمام کوکی‌های برنامه Lax یا Strict هستند. لطفاً اعلام کنید این کوکی مربوط به Sticky Session یا Load Balancer است و آیا امکان تنظیم SameSite=Lax یا افزودن Partitioned بدون اختلال در سرویس وجود دارد؟

تا پاسخ پارس‌پک، این مورد به‌تنهایی نشانه نفوذ یا آسیب‌پذیری برنامه نیست؛ کوکی هم‌زمان `Secure` و `HttpOnly` است.

## مرحله ۶ — هشدار CSP

اسکنر عبارت `unsafe-inline` را بدون توجه به محل آن گزارش کرده است. در سایت زنده این عبارت در `script-src` نیست و اسکریپت‌ها با nonce یک‌بارمصرف محافظت می‌شوند. عبارت فقط در `style-src-attr` قرار دارد و برای ظاهر پویای سایت لازم است. این هشدار را در گزارش با توضیح زیر **Accepted / Mitigated** ثبت کنید:

> `unsafe-inline` is limited to `style-src-attr`; `script-src` is nonce-based with `strict-dynamic`, and `script-src-attr` is disabled. No inline JavaScript execution is allowed.

## مرحله ۷ — بارگذاری نسخه در PaaS

1. قبل از Deploy از دیتابیس Backup بگیرید.
2. در اپلیکیشن PaaS پارس‌پک، روش انتشار فعلی خود را باز کنید.
3. فایل `eloria-parspack-secure.zip` را بارگذاری کنید؛ اگر انتشار شما از Git است، محتویات همین پوشه را Commit و Push کنید.
4. Build Command را `npm ci && npm run build` بگذارید.
5. Start Command را `npm run start:production` بگذارید.
6. نسخه Node را `22` انتخاب کنید؛ Dockerfile پروژه نیز روی Node 22 است.
7. متغیرهای محرمانه را فقط در بخش Environment Variables پنل نگه دارید؛ فایل `.env` را آپلود یا داخل Git قرار ندهید.
8. Deploy / Rebuild را بزنید.
9. بعد از سبزشدن وضعیت، آدرس `https://eloriagallery.ir/api/health` و صفحه اصلی را باز کنید.

## نتیجه مورد انتظار

- هشدار DMARC بعد از انتشار DNS حذف می‌شود.
- هشدار SPF ضعیف حذف می‌شود.
- هشدار CSP باید با بررسی دقیق سیاست، به‌عنوان هشدار عمومی اسکنر بسته شود.
- هشدار SameSite باید توسط پشتیبانی PaaS بررسی شود، چون مالک آن کوکی زیرساخت پارس‌پک است.

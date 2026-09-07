# راهنمای نهایی استقرار Eloria روی پارس‌پک

این نسخه برای اجرای Production به PostgreSQL، متغیرهای محیطی صحیح و اجرای migration نیاز دارد. فایل `.env` را داخل پروژه یا Git قرار ندهید؛ همه مقدارها را در پنل اپلیکیشن پارس‌پک ثبت کنید.

## تغییرات این نسخه

- فونت نستعلیق دسکتاپ حفظ شد و بارگذاری آن پایدارتر شد.
- در موبایل، فونت خوانای Vazirmatn با کنترل بزرگ‌نمایی خودکار متن استفاده می‌شود تا نوشته‌ها نریزند.
- دکمه حساب هدر اکنون برای مهمان «ورود / عضویت» و برای عضو «حساب من» نمایش می‌دهد.
- ورود و عضویت ایمیلی با کد یک‌بارمصرف Resend فعال و به پنل واقعی مشتری متصل است.
- ورود موبایلی در کد آماده است و بعد از افزودن Kavenegar بدون بازطراحی پنل فعال می‌شود.
- خطاهای خراب‌شده فارسی در اعتبارسنجی ورود مشتری اصلاح شد؛ اعداد فارسی و عربی موبایل نیز درست تبدیل می‌شوند.
- همگام‌ساز داخلی و امن نرخ فلز برای محیط اپلیکیشن پارس‌پک اضافه شد.
- سامانه هوشمند تولید پیش‌نویس مقاله محصول و سلامت سئو در پنل مدیریت موجود و فعال‌سازی‌پذیر است؛ مقاله‌ها برای جلوگیری از انتشار اطلاعات اشتباه، ابتدا پیش‌نویس می‌مانند.

## ۱. تنظیم Build و Start در پارس‌پک

- Build command: `npm run build`
- Start command: `npm run start:production`
- Node.js: نسخه 24
- پورت را دستی تعیین نکنید؛ برنامه مقدار `PORT` پارس‌پک را می‌خواند.

## ۲. متغیرهای ضروری دامنه

این مقدارها باید دقیقاً با دامنه نهایی باشند:

```env
NEXT_PUBLIC_SITE_URL=https://eloriagallery.ir
ELORIA_INTERNAL_BASE_URL=https://eloriagallery.ir
ELORIA_ALLOWED_ORIGINS=https://www.eloriagallery.ir
ELORIA_TRUST_PROXY=true
ELORIA_PROXY_PROVIDER=generic
ELORIA_RATE_LIMIT_FAILURE_MODE=closed
```

اگر دامنه اصلی شما `www` است، دو آدرس بالا را برعکس کنید. دامنه اصلی باید فقط یکی باشد و دامنه دوم به آن Redirect شود.

## ۳. فعال‌سازی فروش، حساب مشتری و قیمت طلا

```env
ELORIA_COMMERCE_ENABLED=true
ELORIA_CUSTOMER_AUTH_ENABLED=true
ELORIA_DYNAMIC_PRICING_ENABLED=true
ELORIA_PAYMENT_ENABLED=false
ELORIA_SUPPORT_ENABLED=true
ELORIA_EMBEDDED_METAL_SYNC_ENABLED=true
ELORIA_EMBEDDED_METAL_SYNC_INTERVAL_MINUTES=5
```

`ELORIA_PAYMENT_ENABLED` را فقط پس از ثبت Merchant ID واقعی زرین‌پال روی `true` بگذارید. فعال‌کردن زودهنگام آن باعث توقف امن پرداخت می‌شود.

برای نرخ طلا این موارد نیز الزامی‌اند:

```env
BRS_API_KEY=کلید واقعی BRS
CRON_SECRET=یک رشته تصادفی حداقل 48 کاراکتری
METAL_PRICE_STALE_AFTER_MINUTES=15
```

بعد از اولین Deploy حدود ۱۵ ثانیه صبر کنید. نرخ اولیه در دیتابیس ذخیره می‌شود و سپس هر ۵ دقیقه تازه خواهد شد. اگر نرخ نامعتبر، قدیمی یا خارج از محدوده ایمنی باشد، خرید عمداً متوقف می‌شود تا محصول با قیمت اشتباه فروخته نشود.

## ۴. فعال‌سازی ورود ایمیلی مشتری

DNS مربوط به Resend باید تأییدشده باشد و این متغیرها ثبت شوند:

```env
RESEND_API_KEY=re_...
ELORIA_EMAIL_FROM=Eloria <login@eloriagallery.ir>
ELORIA_CUSTOMER_AUTH_SECRET=یک رشته تصادفی حداقل 48 کاراکتری
ELORIA_CUSTOMER_SESSION_DAYS=30
ELORIA_CUSTOMER_OTP_TTL_MINUTES=5
```

عضویت جداگانه لازم نیست: کاربر بار اول ایمیل و موبایل را وارد می‌کند، کد ایمیل را تأیید می‌کند و حسابش به‌صورت امن ساخته می‌شود. دفعات بعد با همان اطلاعات وارد همان پنل می‌شود.

برای ورود موبایلی در آینده فقط `KAVENEGAR_API_KEY` و `KAVENEGAR_SENDER` را اضافه کنید و سپس دکمه موبایل را از حالت «به‌زودی» خارج کنید.

## ۵. رفع خطای ورود پنل مدیریت

در Production علاوه بر نام کاربری و رمز، TOTP نیز اجباری است. این چهار متغیر باید هم‌زمان معتبر باشند:

```env
ELORIA_ADMIN_USERNAME=نام کاربری دلخواه
ELORIA_ADMIN_PASSWORD=scrypt$...
ELORIA_ADMIN_SESSION_SECRET=یک رشته تصادفی حداقل 48 کاراکتری
ELORIA_ADMIN_SESSION_VERSION=1
ELORIA_ADMIN_TOTP_SECRET=کلید Base32 واقعی
```

نکته مهم: در صفحه ورود، رمز اصلی و خوانا را وارد کنید؛ مقدار `scrypt$...` فقط داخل ENV است و نباید به‌عنوان رمز در فرم وارد شود.

برای ساخت مقدارها روی کامپیوتر، داخل پوشه پروژه اجرا کنید:

```powershell
npm run admin:password-hash -- "یک-رمز-قوی-حداقل-۲۰-کاراکتری"
npm run admin:totp-secret
npm run admin:secret
```

- خروجی دستور اول را در `ELORIA_ADMIN_PASSWORD` قرار دهید.
- خروجی دستور دوم را هم در `ELORIA_ADMIN_TOTP_SECRET` و هم در برنامه Google Authenticator یا Microsoft Authenticator ثبت کنید.
- خروجی دستور سوم را در `ELORIA_ADMIN_SESSION_SECRET` قرار دهید.
- بعد از هر تغییر ENV حتماً Redeploy/Restart انجام دهید.
- اگر چند بار اشتباه وارد کرده‌اید، ورود برای ۱۵ دقیقه قفل می‌شود؛ تغییر مداوم نام کاربری این قفل امنیتی را دور نمی‌زند.

## ۶. دیتابیس

هر دو متغیر باید PostgreSQL واقعی باشند:

```env
DATABASE_URL=آدرس pooled دیتابیس
DIRECT_URL=آدرس مستقیم دیتابیس
DATABASE_SSL_MODE=verify-full
```

قبل یا هم‌زمان با انتشار نسخه جدید اجرا شود:

```powershell
npm run db:migrate
npm run pricing:seed
```

بدون migration، ورود مشتری، پنل ادمین، نرخ طلا و سفارش‌ها ممکن است با خطای دیتابیس روبه‌رو شوند.

## ۷. Turnstile

برای حساب مشتری و خرید Production لازم است:

```env
NEXT_PUBLIC_TURNSTILE_SITE_KEY=کلید عمومی دامنه
TURNSTILE_SECRET_KEY=کلید خصوصی
```

در پنل Cloudflare Turnstile هر دو دامنه `eloriagallery.ir` و `www.eloriagallery.ir` را مجاز کنید.

## ۸. سئو و بازاریابی هوشمند

```env
ELORIA_CONTENT_AUTOPILOT_ENABLED=true
ELORIA_CONTENT_AUTOPILOT_DAILY_LIMIT=1
ELORIA_AI_PROVIDER=template
```

از پنل مدیریت، بخش «محتوا» و «هوشمندی» می‌توانید پیش‌نویس مقاله محصول، امتیاز سلامت سئو، مشکلات تصویر/توضیح/کلمه کلیدی و پیشنهادهای عملیاتی را ببینید. انتشار نهایی مقاله آگاهانه دستی مانده است تا متن یا ادعای اشتباه خودکار وارد سایت نشود.

## ۹. ترتیب تست نهایی

1. `/api/health` باز شود و خطای زیرساخت ندهد.
2. ورود مدیر با رمز خوانا و کد TOTP انجام شود.
3. در پنل، نرخ طلای ثبت‌شده تازه و قابل فروش باشد.
4. یک محصول فعال، موجود و دارای قیمت معتبر باز شود؛ افزودن به سبد فعال باشد.
5. از `/fa/login` کد ایمیل دریافت و حساب مشتری ساخته شود.
6. سبد، ثبت سفارش و اتصال سفارش به پنل مشتری آزمایش شود.
7. دامنه HTTP به HTTPS و دامنه فرعی به دامنه اصلی Redirect شود.

## محدوده مدیریت از پنل ادمین

محصول، تصاویر، موجودی، قیمت‌گذاری، سفارش، امور مالی، محتوا، سئو، اتوماسیون، پشتیبانی و گزارش هوشمندی از پنل انجام می‌شوند. رمزهای امنیتی، کلید دیتابیس، Resend، BRS، Turnstile و زرین‌پال عمداً از داخل پنل قابل تغییر نیستند؛ این موارد فقط باید در ENV پارس‌پک باشند تا در صورت نفوذ به حساب ادمین، کل زیرساخت در اختیار مهاجم قرار نگیرد.

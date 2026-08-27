# نصب نسخه نهایی ELORIA روی `C:\eloria`

این بسته برای ارتقای نسخه فعلی طراحی شده است. فایل `.env` واقعی داخل ZIP نیست و Seed نیز در نصب ارتقا اجرا نمی‌شود.

## روش پیشنهادی

1. `npm run dev` را با `Ctrl + C` متوقف کنید.
2. ZIP را در یک پوشه خارج از `C:\eloria` Extract کنید.
3. PowerShell را با Run as Administrator باز کنید.
4. وارد پوشه `ELORIA_FINAL` استخراج‌شده شوید و اجرا کنید:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL_ELORIA_FINAL.ps1 -Target "C:\eloria"
```

اسکریپت:
- از فایل‌های پروژه بکاپ می‌گیرد و `node_modules`/`.next` را بی‌دلیل کپی نمی‌کند.
- `.env` فعلی را جداگانه نگه می‌دارد و بعد از جایگزینی برمی‌گرداند.
- Release Gate را اجرا می‌کند.
- Prisma Client را Generate می‌کند.
- Migrationهای امن را Deploy می‌کند.
- `db:seed` را اجرا نمی‌کند.

## بعد از نصب

```powershell
Set-Location C:\eloria
npm run dev
```

سپس `http://localhost:3000/fa` را بررسی کنید.

## کد خرید اول

کد عمومی:

```text
ELORIA50
```

مزیت: مبلغ ثابت **۵۰٬۰۰۰ تومان**. سرور قبل از سفارش و هنگام ثبت نهایی دوباره شرایط را بررسی می‌کند. برای هر شماره موبایل فقط یک بار و فقط در نخستین خرید معتبر است. ورودی قدیمی `ELORIA10` فقط برای سازگاری تاریخی به همین کد نگاشت می‌شود و مزیت ۱۰ درصدی ندارد.

## کنترل Production

پس از تست لوکال و قبل از انتشار:

```powershell
npm run typecheck
npm run lint
npm run build
```

در Production نیز تنظیمات دامنه، PostgreSQL، زرین‌پال، Turnstile، نرخ فلز، Cronها و لینک شبکه‌های اجتماعی باید واقعی باشند.

## هوشمندسازی رایگان

پیش‌فرض `ELORIA_AI_PROVIDER="template"` است و هزینه API ندارد. برای مدل محلی اختیاری می‌توانید Ollama را فعال کنید:

```dotenv
ELORIA_AI_PROVIDER="ollama"
ELORIA_OLLAMA_URL="http://127.0.0.1:11434"
ELORIA_OLLAMA_MODEL="qwen2.5:3b"
```

هوشمندی اصلی فروشگاه (پیشنهاد محصول، انتخاب روزانه، RFM، Funnel، Product Quality، UTM و تحلیل رفتار رضایتی) الگوریتمی است و به API پولی وابسته نیست.

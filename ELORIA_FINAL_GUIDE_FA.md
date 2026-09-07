# راهنمای واحد نصب، GitHub و استقرار Eloria

این راهنما فقط یک مسیر عملیاتی دارد و برای پوشهٔ اصلی `C:\Eloria` نوشته شده است. در هیچ مرحله‌ای فایل `.env` را در GitHub قرار ندهید. پیش از شروع، Node.js 22 LTS، Git for Windows و PowerShell را روی ویندوز نصب کنید.

## ۱. دریافت و استخراج نسخهٔ نهایی

فایل ZIP نهایی را در پوشهٔ Downloads نگه دارید. PowerShell را با گزینهٔ **Run as Administrator** باز کنید و این دو دستور را اجرا کنید:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
Expand-Archive -LiteralPath "$env:USERPROFILE\Downloads\Eloria-Final.zip" -DestinationPath "$env:USERPROFILE\Downloads" -Force
```

اکنون پوشهٔ استخراج‌شده باید این مسیر را داشته باشد:

```text
C:\Users\نام-کاربر\Downloads\Eloria-Final
```

## ۲. قرار دادن امن پروژه در `C:\Eloria`

ابتدا فایل محیط را ایجاد و کامل کنید. این دستورها نسخهٔ قدیمی `C:\Eloria` را حذف نمی‌کنند؛ آن را با نامی شامل تاریخ به نسخهٔ پشتیبان منتقل می‌کنند.

```powershell
Set-Location "$env:USERPROFILE\Downloads\Eloria-Final"
.\INSTALL_ELORIA_WINDOWS.ps1
```

بار اول اسکریپت فایل `C:\Eloria\.env` را می‌سازد و متوقف می‌شود. فایل را باز کنید:

```powershell
notepad C:\Eloria\.env
```

حداقل این مقدارها را با دادهٔ واقعی پارس‌پک/سرویس‌های خودتان جایگزین کنید. مقدار نمونه را باقی نگذارید:

```dotenv
DATABASE_URL="رشتهٔ اتصال Pooler پارس‌پک یا PostgreSQL"
DIRECT_URL="رشتهٔ اتصال مستقیم PostgreSQL برای migration"
NEXT_PUBLIC_SITE_URL="https://eloriagallery.ir"
ELORIA_INTERNAL_BASE_URL="https://eloriagallery.ir"
ELORIA_DOMAIN="eloriagallery.ir"
CADDY_EMAIL="ایمیل-واقعی-مدیر-دامنه"
ELORIA_ENAMAD_TITLE_VERIFICATION="false"
```

بقیهٔ فیلدهای الزامی `.env` (Storage، کلیدهای امنیتی، Cloudflare Turnstile، SMS، زرین‌پال و اطلاعات قانونی) نیز باید با مقدار واقعی پر شوند. برای ساخت کلیدهای امن، در `C:\Eloria` این دستور را اجرا کنید و خروجی‌ها را فقط در `.env` وارد کنید:

```powershell
Set-Location C:\Eloria
npm run secrets:generate
```

سپس نصب کامل و migration دیتابیس را اجرا کنید:

```powershell
Set-Location "$env:USERPROFILE\Downloads\Eloria-Final"
.\INSTALL_ELORIA_WINDOWS.ps1 -RunDatabaseMigrations
```

این مرحله `npm ci`، Prisma generate، migration، TypeScript، lint، تست افسانه‌ها، تست سئو، تست‌های حساس فروشگاه، ممیزی امنیت، ممیزی کیفیت و build را اجرا می‌کند. برای اجرای محلی بعد از موفقیت:

```powershell
Set-Location C:\Eloria
npm run start
```

در مرورگر این آدرس را باز کنید: `http://localhost:3000/fa`

## ۳. مدیریت محتوای افسانه و آتلیه

در پنل ادمین، محصول را باز کنید. محصول جدید به‌صورت خودکار یک افسانهٔ پنهان یکتا از کتابخانهٔ ۱۵۴تایی می‌گیرد؛ هر کلید افسانه در دیتابیس یکتا است و دو محصول نمی‌توانند یک افسانه داشته باشند. در «گالری محصول»، عکس شخصیت و عکس محیط را آپلود کنید. سپس روی همان عکس‌ها دکمهٔ «برای شخصیت» و «برای فضای افسانه» را بزنید. این دو تصویر روی صفحهٔ محصول و دنیای الوریا نشان داده می‌شوند. همهٔ انتخاب‌ها تحت کنترل ادمین باقی می‌مانند.

در پنل «محتوا و سئو» نیز امتیاز بر اساس دادهٔ واقعی محاسبه می‌شود: توضیح فارسی/انگلیسی، alt عکس، افسانهٔ پنهان، عکس آتلیه، کیفیت مقاله و تازگی محتوا. پیش‌نویس مقاله خودکار ساخته می‌شود اما بدون تأیید شما منتشر نمی‌شود.

## ۴. ارسال امن به GitHub

در سایت GitHub یک مخزن **Private** تازه و خالی بسازید؛ هنگام ساخت، README یا `.gitignore` اضافه نکنید. سپس در PowerShell این دستورها را اجرا کنید و فقط URL واقعی مخزن خودتان را جایگزین کنید:

```powershell
Set-Location C:\Eloria
git init
git branch -M main
git add .
git status
git commit -m "Eloria final world, SEO and security release"
git remote add origin https://github.com/USERNAME/REPOSITORY.git
git push -u origin main
```

پیش از `git commit` باید در خروجی `git status` مطمئن شوید `.env` در فهرست نیست. اگر GitHub برای ورود رمز خواست، از پنجرهٔ ورود مرورگر یا Personal Access Token استفاده کنید؛ رمز اصلی حساب GitHub را در PowerShell وارد نکنید.

برای انتشار نسخه‌های بعدی فقط همین چهار دستور کافی است:

```powershell
Set-Location C:\Eloria
git add .
git commit -m "توضیح کوتاه تغییر"
git push
```

## ۵. استقرار روی سرور ابری پارس‌پک

این بخش برای **سرور ابری/VPS لینوکسی پارس‌پک** است. اگر فقط هاست اشتراکی دارید، این پروژهٔ Node.js + Docker را به آن منتقل نکنید؛ به سرور ابری یا سرویس Node.js نیاز دارید.

از PowerShell دسکتاپ به سرور وصل شوید:

```powershell
ssh root@SERVER_IP
```

روی سرور اوبونتو، یک‌بار Docker و Git را نصب کنید:

```bash
apt update && apt upgrade -y
apt install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sh
mkdir -p /opt/eloria
git clone https://github.com/USERNAME/REPOSITORY.git /opt/eloria
cd /opt/eloria
cp .env.example .env
nano .env
```

در فایل `/opt/eloria/.env` همان مقدارهای واقعی مرحلهٔ ۲ را قرار دهید، به‌اضافهٔ `ELORIA_DOMAIN` و `CADDY_EMAIL`. سپس به‌ترتیب migration، build و اجرای سرویس را انجام دهید:

```bash
cd /opt/eloria
docker build --target migrator -t eloria-migrator:release .
docker run --rm --env-file .env eloria-migrator:release
DOCKER_BUILDKIT=1 docker build \
  --secret id=DATABASE_URL,env=DATABASE_URL \
  --secret id=DIRECT_URL,env=DIRECT_URL \
  --build-arg NEXT_PUBLIC_SITE_URL=https://eloriagallery.ir \
  -t eloria:release .
docker compose -f docker-compose.parspack.yml up -d
docker compose -f docker-compose.parspack.yml ps
curl -I https://eloriagallery.ir
```

فایلی به نام `docker-compose.parspack.yml` همراه پروژه است و Caddy را برای HTTPS و reverse proxy اجرا می‌کند؛ لازم نیست در PowerShell ویندوز چیز دیگری به آن اضافه کنید. در پنل پارس‌پک فقط پورت‌های TCP 80 و 443 را در فایروال سرور باز کنید. در Cloudflare نیز SSL/TLS را روی **Full (strict)** بگذارید، نه Flexible.

برای به‌روزرسانی سرور در نسخه‌های بعدی:

```bash
cd /opt/eloria
git pull --ff-only
docker build --target migrator -t eloria-migrator:release .
docker run --rm --env-file .env eloria-migrator:release
DOCKER_BUILDKIT=1 docker build --secret id=DATABASE_URL,env=DATABASE_URL --secret id=DIRECT_URL,env=DIRECT_URL --build-arg NEXT_PUBLIC_SITE_URL=https://eloriagallery.ir -t eloria:release .
docker compose -f docker-compose.parspack.yml up -d --force-recreate
```

## ۶. eNamad

سه تغییر لازم در خود پروژه انجام شده است: فایل خالی `public/26263305.txt`، متاتگ `<meta name="enamad" content="26263305" />` و مسیر داخلی دامنهٔ اصلی به صفحهٔ فارسی. پس از استقرار این دو آدرس را باز کنید:

```text
https://eloriagallery.ir/26263305.txt
https://eloriagallery.ir
```

برای تأیید عنوان، در `.env` سرور مقدار زیر را موقتاً `true` کنید، سرویس را بازسازی کنید، در eNamad روی «تأیید عنوان» بزنید و بلافاصله دوباره مقدار را `false` کنید و سرویس را بازسازی کنید:

```dotenv
ELORIA_ENAMAD_TITLE_VERIFICATION="true"
```

```bash
cd /opt/eloria
docker compose -f docker-compose.parspack.yml up -d --force-recreate
```

## ۷. DNS و امنیت ایمیل: SPF و DMARC

این دو مورد کد سایت نیستند و باید در بخش DNS پارس‌پک یا Cloudflare اضافه شوند. روی دامنه فقط **یک** رکورد SPF داشته باشید. اگر ارسال ایمیل از خود سرور پارس‌پک است، مقدار نمونهٔ زیر را با IP واقعی سرور جایگزین کنید:

| نوع | نام      | مقدار                                                                                 |
| --- | -------- | ------------------------------------------------------------------------------------- |
| TXT | `@`      | `v=spf1 a mx ip4:SERVER_IP -all`                                                      |
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; adkim=s; aspf=s; pct=100; rua=mailto:dmarc@eloriagallery.ir` |

ابتدا صندوق `dmarc@eloriagallery.ir` را بسازید. اگر از Google Workspace، Zoho یا سرویس ایمیل دیگری استفاده می‌کنید، SPF نمونه را با include رسمی همان سرویس جایگزین کنید و DKIM همان سرویس را نیز فعال کنید؛ رکوردهای SPF را با هم ادغام کنید، نه اینکه دو رکورد TXT جدا بسازید. بعد از ۷ تا ۱۴ روز بررسی گزارش DMARC، سیاست را از `p=quarantine` به `p=reject` ارتقا دهید.

## ۸. کنترل نهایی پس از انتشار

این موارد را یک‌به‌یک بررسی کنید:

1. صفحهٔ اصلی، موبایل، دکمهٔ ورود/عضویت و سبد خرید در بالای Hero نمایش داده شوند.
2. مسیرهای `/fa/about`، `/fa/world` و یک صفحهٔ محصول باز شوند.
3. پنل ادمین: یک محصول آزمایشی بسازید؛ افسانهٔ یکتا، انتخاب عکس شخصیت و فضای افسانه را کنترل کنید.
4. در پنل محتوا، شمارندهٔ سئو و صف ایرادها را ببینید.
5. `https://eloriagallery.ir/26263305.txt` با پاسخ 200 باز شود و متاتگ eNamad در HTML صفحهٔ اصلی وجود داشته باشد.
6. در Search Console، دامنه را تأیید و `https://eloriagallery.ir/sitemap.xml` را ثبت کنید. عنوان، توضیح، URLهای توصیفی، متن alt، لینک داخلی و محتوای مفید مهم‌اند؛ «تعداد کلمهٔ جادویی» یا تکرار مصنوعی کلمات کلیدی نیست.

Google صراحتاً می‌گوید هیچ ترفند خودکاری رتبهٔ اول را تضمین نمی‌کند؛ تمرکز باید بر محتوای منحصربه‌فرد، مفید، قابل‌خواندن و ساختار قابل‌خزش باشد. مرجع‌ها: [SEO Starter Guide گوگل](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)، [Product structured data](https://developers.google.com/search/docs/appearance/structured-data/product-snippet)، و [راهنمای Sitemap گوگل](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview).

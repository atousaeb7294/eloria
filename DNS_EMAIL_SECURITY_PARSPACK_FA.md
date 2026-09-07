# SPF، DKIM و DMARC برای eloriagallery.ir در پارس‌پک

این سه مورد داخل سورس Next.js تنظیم نمی‌شوند؛ باید در پنل DNS دامنه ثبت شوند. ابتدا از پنل سرویس ایمیل مشخص کنید چه سامانه‌هایی از آدرس‌های `@eloriagallery.ir` ایمیل می‌فرستند.

## اگر دامنه اصلاً ایمیل ارسال نمی‌کند

دو TXT زیر را ثبت کنید:

| نوع | نام/Host | مقدار |
|---|---|---|
| TXT | `@` | `v=spf1 -all` |
| TXT | `_dmarc` | `v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s; pct=100; rua=mailto:dmarc@eloriagallery.ir` |

آدرس گزارش `dmarc@eloriagallery.ir` باید واقعاً قابل دریافت باشد؛ اگر نیست، بخش `rua` را موقتاً حذف کنید.

## اگر از سرویس ایمیل استفاده می‌کنید

1. فقط **یک** رکورد SPF در Host برابر `@` داشته باشید.
2. include یا IP اعلام‌شده توسط سرویس ایمیل را در همان رکورد ادغام کنید؛ نمونهٔ ساختاری:

```text
v=spf1 include:PROVIDER-SPF.EXAMPLE -all
```

3. رکورد DKIM را دقیقاً با selector و کلید عمومی ارائه‌شده توسط سرویس ایمیل ثبت کنید؛ نمونهٔ نام معمولاً `selector._domainkey` است.
4. DMARC را ابتدا برای جمع‌آوری گزارش فعال کنید:

```text
v=DMARC1; p=none; rua=mailto:dmarc@eloriagallery.ir; adkim=r; aspf=r; pct=100
```

5. پس از ۷ تا ۱۴ روز و اطمینان از pass شدن فرستنده‌های واقعی، سیاست را به `p=quarantine` و سپس `p=reject` ارتقا دهید.

## کنترل پس از انتشار

در PowerShell ویندوز:

```powershell
Resolve-DnsName -Type TXT eloriagallery.ir
Resolve-DnsName -Type TXT _dmarc.eloriagallery.ir
Resolve-DnsName -Type TXT selector._domainkey.eloriagallery.ir
```

نباید دو رکورد جداگانه با `v=spf1` وجود داشته باشد. SPF باید به `-all` ختم شود مگر اینکه در مرحلهٔ گذار کنترل‌شده باشید. مقدار DKIM قابل حدس نیست و باید از ارائه‌دهندهٔ واقعی ایمیل گرفته شود.

# اصلاح ورود موبایل و سرعت الوریا

این بسته سه تغییر دارد:

- دکمهٔ «ورود به گنجینه» در موبایل از همان لمس اول لینک مستقیم مجموعه است؛ دکمهٔ بازکردن پیش‌نمایش جداگانه در موبایل نمایش داده نمی‌شود.
- عنوان فارسی «گنجینهٔ بافت» به «گنجینهٔ بافت و اکسسوری» تغییر کرده است.
- پیش‌واکشی سه مسیر سنگین گنجینه از صفحهٔ خانه خاموش شده تا نمایش اولیهٔ موبایل سبک‌تر شود.

## نصب در ویندوز

```powershell
Set-Location C:\eloria
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-mobile-treasury-fix.ps1 -ProjectRoot C:\eloria -Build
```

این نصب `npm ci` و build را اجرا می‌کند و migration، seed و هیچ نوشتن دیتابیسی انجام نمی‌دهد. فایل‌های `.env` و دیتای Parspack دست‌نخورده می‌مانند.

## انتشار روی main

ابتدا اتصال GitHub باید برقرار باشد:

```powershell
git ls-remote https://github.com/atousaeb7294/eloria.git
```

سپس:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\publish-mobile-treasury-fix.ps1 -ProjectRoot C:\eloria
```

اسکریپت branch اصلاحی می‌سازد، فقط فایل‌های این بسته را commit می‌کند، `origin/main` را می‌گیرد و با merge معمولی روی `main` push می‌کند. force push انجام نمی‌شود.

import { readFileSync, existsSync } from "node:fs";

const checks = [];
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const has = (path, text) => read(path).includes(text);
const check = (label, valid) => checks.push({ label, valid: Boolean(valid) });

check("ترتیب اینترو دو مرحله‌ای است", has("src/components/intro/use-eloria-intro-controller.ts", 'setPhase("awaiting-entry")') && has("src/components/intro/use-eloria-intro-controller.ts", 'setPhase("video-two")'));
check("ورود فقط پس از پایان پرده دوم انجام می‌شود", has("src/components/intro/eloria-intro-view.tsx", "onEnded={\n              beginCinematicReveal"));
check("پخش ناگهانی دوباره در همان نشست مهار شده است", has("src/components/intro/use-eloria-intro-controller.ts", "sessionStorage") && has("src/components/intro/eloria-intro-config.ts", "INTRO_SESSION_KEY"));
check("داستان سرزمین کهن و بافت مکرومه حفظ شده است", has("src/app/[locale]/about/page.tsx", "سرزمین کهن") && has("src/app/[locale]/about/page.tsx", "مکرومه"));
check("فرم تماس به API واقعی وصل است", has("src/components/support-forms.tsx", 'fetch(\n          "/api/support/contact"') && has("src/app/api/support/contact/route.ts", "addVisitorSupportMessage"));
check("Social links are connected through shared config", has("src/components/site-footer.tsx", "eloriaSocialLinks") && has("src/lib/social-links.ts", "NEXT_PUBLIC_ELORIA_INSTAGRAM_URL") && has("src/lib/social-links.ts", "NEXT_PUBLIC_ELORIA_TELEGRAM_URL") && has("src/lib/social-links.ts", "NEXT_PUBLIC_ELORIA_BALE_URL"));
check("راهنمای مچ و لینک دستبند فعال‌اند", existsSync(new URL("../src/app/[locale]/journal/wrist-size-guide/page.tsx", import.meta.url)) && has("src/app/[locale]/products/[slug]/page.tsx", "/journal/wrist-size-guide"));
check("ارسال رایگان در همه صفحات محصول اعلام شده است", has("src/app/[locale]/products/[slug]/page.tsx", "ارسال رایگان و بسته‌بندی اختصاصی الوریا"));
check("کد تخفیف از سبد تا سرور متصل است", has("src/components/cart/cart-page-view.tsx", "couponCode") && has("src/app/api/checkout/orders/route.ts", "couponCode") && has("src/lib/checkout-order.ts", "validateCouponForCheckout"));
check("کد خرید اول واقعاً محدود به خرید نخست است", has("src/lib/coupons.ts", "firstPurchaseOnly") && has("src/lib/coupons.ts", "previousPurchase") && has("src/lib/coupons.ts", "perCustomerLimit") && has("prisma/seed.ts", 'code: "ELORIA50"'));
check("Timeline مستقل محصول و migration دارد", has("prisma/schema.prisma", "model ProductTimelineEvent") && existsSync(new URL("../prisma/migrations/20260827003000_product_timeline/migration.sql", import.meta.url)));
check("پیشنهاد هوشمند روزانه فعال است", has("src/app/api/home-featured-products/route.ts", "stableDailyNudge") && has("src/app/api/home-featured-products/route.ts", "recentSales"));
check("PWA دارای manifest و Service Worker است", existsSync(new URL("../src/app/manifest.ts", import.meta.url)) && existsSync(new URL("../public/sw.js", import.meta.url)));
check("Sitemap، Canonical و Schema وجود دارند", existsSync(new URL("../src/app/sitemap.ts", import.meta.url)) && has("src/lib/seo.ts", "canonical") && existsSync(new URL("../src/components/product-detail/product-structured-data.tsx", import.meta.url)));
check("شش راهنمای آموزشی هنگام Seed منتشر می‌شوند", ["how-to-measure-ring-size", "what-is-gold-making-charge", "white-gold-vs-yellow-gold", "gold-gift-buying-guide", "how-to-care-for-gold-jewelry", "ring-buying-guide"].every((slug) => has("prisma/seed.ts", slug)));
check("رمز مدیر از scrypt پشتیبانی می‌کند", has("src/lib/admin-auth.ts", "scryptSync") && existsSync(new URL("../scripts/generate-admin-password-hash.mjs", import.meta.url)));
check("اجرای standalone خودکار تشخیص داده می‌شود", has("scripts/start-production.mjs", '".next", "standalone", "server.js"'));
check("تخفیف خرید اول مبلغ ثابت ۵۰ هزار تومان است", has("src/lib/coupons.ts", "FIRST_PURCHASE_DISCOUNT_TOMAN = 50_000n") && has("prisma/migrations/20260827023000_first_purchase_coupon_fixed_50000/migration.sql", '"value" = 50000'));
check("صفحه محصول اجزای مالی را عددی افشا نمی‌کند", has("src/app/[locale]/products/[slug]/page.tsx", "قیمت نهایی این اثر، حاصل ارزش روز طلای به‌کاررفته") && !has("src/app/[locale]/products/[slug]/page.tsx", "makingChargeTotalToman"));
check("جستجوی فارسی و عبارت بودجه هوشمند فعال است", existsSync(new URL("../src/lib/smart-catalog-query.ts", import.meta.url)) && has("src/app/[locale]/products/page.tsx", "parseSmartCatalogQuery"));
check("پیشنهاد مرتبط در صفحه محصول فعال است", has("src/app/[locale]/products/[slug]/page.tsx", "relatedProducts") && has("src/app/[locale]/products/[slug]/page.tsx", "CatalogProductCard"));
check("هوش تبدیل بازدید به فروش در پنل فعال است", has("src/lib/site-intelligence.ts", "marketingOpportunities") && has("src/app/[locale]/admin/(protected)/intelligence/page.tsx", "فرصت‌های تبدیل ۳۰ روز"));

check("Intro v10 و شروع صریح پرده اول حفظ شده است", has("src/components/intro/eloria-intro-config.ts", 'eloria_intro_complete_v10') && has("src/components/intro/use-eloria-intro-controller.ts", 'phase !== "video-one"') && has("src/components/intro/use-eloria-intro-controller.ts", "playFirstVideo();"));
check("تحلیل RFM بدون migration جدید فعال است", has("src/lib/site-intelligence.ts", "buildCustomerRfm") && has("src/app/[locale]/admin/(protected)/intelligence/page.tsx", "تقسیم‌بندی هوشمند مشتریان"));
check("امتیاز کیفیت صفحه محصول فعال است", has("src/lib/site-intelligence.ts", "productQualityScore") && has("src/app/[locale]/admin/(protected)/intelligence/page.tsx", "کیفیت صفحه‌های محصول"));
check("اسناد خرید اول با مبلغ ۵۰ هزار تومان همگام شده‌اند", has("FINAL_RELEASE_FA.md", "مبلغ ثابت ۵۰٬۰۰۰ تومان") && has("docs/INSTALL_FINAL_FA.md", "۵۰٬۰۰۰ تومان"));

check("دو کارت قیمت‌گذاری شفاف و موجودی واقعی حذف شده‌اند", !has("src/app/[locale]/products/[slug]/page.tsx", "قیمت‌گذاری شفاف") && !has("src/app/[locale]/products/[slug]/page.tsx", "موجودی واقعی"));
check("مشخصات محصول بعد از منتخب و قبل از اطمینان‌های خرید است", (() => { const file = read("src/app/[locale]/products/[slug]/page.tsx"); const fav = file.indexOf("<TreasuryButton"); const specs = file.indexOf("مشخصات محصول"); const shipping = file.indexOf("ارسال مهمانِ الوریا"); const about = file.indexOf("درباره این محصول"); return fav >= 0 && specs > fav && shipping > specs && about > shipping; })());
check("توضیحات سفارش از Checkout تا دیتابیس وصل است", has("src/components/checkout/checkout-page-view.tsx", "orderNotes") && has("src/app/api/checkout/orders/route.ts", "orderNotes") && has("src/lib/checkout-order.ts", "normalizedOrderNotes") && has("prisma/schema.prisma", "orderNotes"));
check("کد ELORIA50 پیش از سفارش توسط سرور بررسی می‌شود", existsSync(new URL("../src/app/api/checkout/coupon/preview/route.ts", import.meta.url)) && has("src/components/checkout/use-checkout-page-controller.ts", "applyCoupon") && has("src/lib/coupons.ts", 'FIRST_PURCHASE_COUPON_CODE = "ELORIA50"'));
check("رویدادهای جستجو، فیلتر، منتخب و کوپن سنجیده می‌شوند", ["search", "catalog_filter", "favorite", "coupon_applied", "coupon_rejected"].every((event) => has("src/lib/site-measurement.ts", `"${event}"`)) && has("src/app/[locale]/admin/(protected)/intelligence/page.tsx", "کد موفق"));
check("UTM بازاریابی تا سفارش و پنل هوشمندی متصل است", existsSync(new URL("../src/components/marketing-attribution-tracker.tsx", import.meta.url)) && has("prisma/schema.prisma", "marketingSource") && has("src/lib/site-intelligence.ts", "topMarketingSources") && existsSync(new URL("../prisma/migrations/20260827050000_order_marketing_attribution/migration.sql", import.meta.url)));
check("Organization schema supports official social links", has("src/components/site-structured-data.tsx", "sameAs") && has("src/components/site-structured-data.tsx", "eloriaSocialLinks"));
check("خلاصه Checkout ارسال و مبلغ قابل پرداخت سرور را نمایش می‌دهد", has("src/components/checkout/checkout-page-model.ts", "shippingToman") && has("src/components/checkout/checkout-page-view.tsx", "quote.summary.payableToman"));

check("هوشمندی افسانه به API پولی وابسته نیست", has("src/lib/ai/myth-generator.ts", 'provider() !== "ollama"') && has(".env.example", 'ELORIA_AI_PROVIDER="template"') && !has("src/lib/ai/myth-generator.ts", "OPENAI_API_KEY"));
check("API تولید افسانه با نشست ادمین محافظت می‌شود", has("src/app/api/admin/products/generate-legend/route.ts", "hasValidAdminSession") && has("src/app/api/admin/products/generate-legend/route.ts", "status: 401"));


check("دکمه رد کردن Intro واقعی و فعال است", has("src/components/intro/eloria-intro-view.tsx", "handleSkipIntro") && has("src/components/intro/eloria-intro-view.tsx", "رد کردن") && has("src/components/intro/use-eloria-intro-controller.ts", "const handleSkipIntro"));
check("دکمه تصویری انتهای Intro 1 بدون ساخت دکمه نمایشی جدید قابل کلیک است", has("src/components/intro/eloria-intro-view.tsx", "handleEmbeddedEntry") && has("src/components/intro/eloria-intro-view.tsx", "bg-transparent") && !has("src/components/intro/eloria-intro-view.tsx", "EloriaSigilEntryButton"));
check("Hotspot ورودی فقط در فریم‌های پایانی Intro 1 فعال می‌شود", has("src/components/intro/eloria-intro-config.ts", "INTRO_EMBEDDED_ENTRY_START_SECONDS") && has("src/components/intro/use-eloria-intro-controller.ts", "video.currentTime >= INTRO_EMBEDDED_ENTRY_START_SECONDS"));
check("خانه ویترین چرخان خودکار، دستی و لمسی دارد", has("src/components/home-featured-album.tsx", "AUTOPLAY_MS") && has("src/components/home-featured-album.tsx", "handleTouchEnd") && has("src/components/home-featured-album.tsx", "AnimatePresence") && has("src/components/home-featured-album.tsx", "useReducedMotion"));
check("عنوان Hero وسط‌چین و CTA تمام آثار فعال است", has("src/components/hero-showcase.tsx", "text-center") && has("src/components/home-featured-album.tsx", "مشاهده تمام آثار"));
check("ویترین R6 سیگنال‌های واقعی فروش، محبوبیت و شتاب هفتگی دارد", has("src/app/api/home-featured-products/route.ts", "editorialBadge") && has("src/app/api/home-featured-products/route.ts", "momentumScore") && has("src/app/api/home-featured-products/route.ts", "previousViews"));
check("کلیک روی آثار Home با رضایت کاربر سنجیده می‌شود", has("src/lib/site-measurement.ts", '"select_item"') && has("src/components/home-featured-album.tsx", 'event_type: "select_item"'));
check("موشن مکرومه reduced-motion را رعایت می‌کند", has("src/components/eloria-woven-threads.tsx", "eloria-thread-braid") && has("src/app/globals.css", ".eloria-woven-threads") && has("src/app/globals.css", "prefers-reduced-motion"));
check("لوگوی هدر با کنتراست و درخشش تقویت شده است", has("src/components/floating-logo.tsx", "brightness-[1.42]") && has("src/components/floating-logo.tsx", "contrast-[1.38]") && has("src/components/floating-logo.tsx", "drop-shadow"));
check("توضیحات مشتری از سبد تا Checkout و سفارش حفظ می‌شود", has("src/components/cart/cart-page-view.tsx", "saveOrderNotes") && has("src/components/cart/use-cart-page-controller.ts", "eloria_order_notes") && has("src/components/checkout/use-checkout-page-controller.ts", "eloria_order_notes") && has("src/lib/checkout-order.ts", "normalizedOrderNotes"));
check("کادر تخفیف در Checkout آشکار و ELORIA50 سروری است", has("src/components/checkout/checkout-page-view.tsx", "couponTitle") && has("src/components/checkout/use-checkout-page-controller.ts", 'setCouponCode("ELORIA50")') && existsSync(new URL("../src/app/api/checkout/coupon/preview/route.ts", import.meta.url)));
check("تماس هدر مستقیم به صفحه تماس می‌رود", has("src/components/site-header.tsx", '/contact`') && has("src/components/home-header-controller.tsx", 'href: `/${locale}/contact`'));
check("فرم تماس کادربندی و فیلدهای یکپارچه دارد", has("src/components/support-forms.tsx", "eloria-panel") && has("src/components/support-forms.tsx", "eloria-field") && has("src/app/globals.css", ".eloria-panel") && has("src/app/globals.css", ".eloria-field"));
check("شتاب‌دهنده ناوبری و prefetch لینک‌های داخلی فعال است", existsSync(new URL("../src/components/navigation-accelerator.tsx", import.meta.url)) && has("src/components/navigation-accelerator.tsx", "router.prefetch") && has("src/components/navigation-accelerator.tsx", "pointerover") && has("src/components/navigation-accelerator.tsx", "pointerdown") && has("src/app/[locale]/layout.tsx", "NavigationAccelerator"));

check("صفحه واقعی سبد از کنترلر ماژولار توضیحات سفارش استفاده می‌کند", has("src/components/cart-page-client.tsx", "useCartPageController") && has("src/components/cart-page-client.tsx", "CartPageView"));
check("صفحه واقعی Checkout کادر تخفیف ماژولار را استفاده می‌کند", has("src/components/checkout-page-client.tsx", "useCheckoutPageController") && has("src/components/checkout-page-client.tsx", "CheckoutPageView"));
check("R6 از Next.js 16.3.3 به‌عنوان Security baseline استفاده می‌کند", has("package.json", '"next": "16.3.3"') && has("INSTALL_ELORIA_R6.ps1", "Synchronizing project dependencies"));
check("R6 هیچ Provider پولی OpenAI ندارد", !has("package.json", '"openai"') && !has("src/lib/ai/myth-generator.ts", 'from "openai"') && !has(".env.example", "OPENAI_API_KEY"));


check("جست‌وجوی طبیعی بدون نمایش توضیح فنی باقی مانده است", existsSync(new URL("../src/components/home-smart-discovery.tsx", import.meta.url)) && has("src/components/home-smart-discovery.tsx", "DISCOVER ELORIA") && has("src/components/home-smart-discovery.tsx", "router.push") && !has("src/components/home-smart-discovery.tsx", "بدون API پولی"));
check("هوش شتاب هفتگی در پنل و Briefing فعال است", has("src/lib/site-intelligence.ts", "merchandisingMomentum") && has("src/lib/store-autopilot.ts", "momentum") && has("src/app/[locale]/admin/(protected)/intelligence/page.tsx", "شتاب توجه ۷ روزه"));
check("شماره تماس مستقیم 09180079556 فعال است", has("src/lib/legal-business.ts", 'DEFAULT_PUBLIC_SUPPORT_PHONE = "09180079556"') && has("src/app/[locale]/contact/page.tsx", "publicSupportPhone") && has(".env.example", 'ELORIA_LEGAL_SUPPORT_PHONE="09180079556"'));
check("SEO سازمان از لوگوی واقعی و ContactPoint استفاده می‌کند", has("src/components/site-structured-data.tsx", "/images/brand/eloria-logo.png") && has("src/components/site-structured-data.tsx", "ContactPoint") && has("src/components/site-structured-data.tsx", "MerchantReturnPolicy"));
check("کش رسانه و Image TTL برای سرعت فعال است", has("next.config.ts", "minimumCacheTTL: 14400") && has("next.config.ts", 'source: "/videos/:path*"') && has("next.config.ts", 'source: "/images/:path*"'));
check("افکت‌های Home بعد از Intro به‌صورت Dynamic بارگذاری می‌شوند", has("src/components/deferred-home-effects.tsx", "dynamic(") && has("src/components/deferred-home-effects.tsx", "ssr: false"));
check("Installer R6 بکاپ، env، تست و build را انجام می‌دهد", has("INSTALL_ELORIA_R6.ps1", "Backing up current ELORIA project") && has("INSTALL_ELORIA_R6.ps1", "npm run typecheck") && has("INSTALL_ELORIA_R6.ps1", "npm run lint") && has("INSTALL_ELORIA_R6.ps1", "npm run build"));
check("Current Intro 2 loading behavior is valid", has("src/components/intro/eloria-intro-view.tsx", 'preload="none"') && has("src/components/intro/use-eloria-intro-controller.ts", "prepareSecondVideo"));
check("R8.3 جست‌وجوی هوشمند عمومی روی Home فعال است", has("src/components/home-showcase-sections.tsx", "HomeSmartDiscovery") && has("src/components/home-smart-discovery.tsx", "هر واژه‌ای از اثر موردنظرتان را بنویسید") && has("src/lib/catalog.ts", "variants: { some:"));
check("R8.3.1 Hero تمیز است و موشن نخ فقط در Showcase render می‌شود", !has("src/components/hero-showcase.tsx", "EloriaWovenThreads") && !has("src/components/hero-showcase.tsx", "background-size:84px_84px") && has("src/components/home-narrative-showcase.tsx", '<EloriaWovenThreads placement="showcase" />') && has("src/app/globals.css", "eloria-thread-shuttle"));
check("R8.3.4 موشن Orbit Swap بدون Fade فعال است", has("src/components/home-featured-album.tsx", "ORBIT_DURATION = 1.08") && has("src/components/home-featured-album.tsx", "rotateY: 7.5") && has("src/components/home-featured-album.tsx", "z: 82") && has("src/components/home-featured-album.tsx", 'perspective: "1650px"') && !has("src/components/home-featured-album.tsx", 'filter: "blur') && !has("src/components/home-featured-album.tsx", "opacity: 0"));
check("R8.3 متن تبلیغاتی API در تجربه کاربر و نصب نمایش داده نمی‌شود", !has("src/components/home-smart-discovery.tsx", "API رایگان") && !has("INSTALL_ELORIA_FINAL.ps1", "Paid AI APIs") && !has("VERSION.txt", "no paid AI API"));


checks.forEach((item, index) => console.log(`${String(index + 1).padStart(2, "0")}. ${item.valid ? "PASS" : "FAIL"} — ${item.label}`));
const failures = checks.filter((item) => !item.valid);
console.log(`\n${checks.length} کنترل اجرا شد؛ ${failures.length} خطا.`);
if (failures.length) process.exit(1);



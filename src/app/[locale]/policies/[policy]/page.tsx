import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { FileText, RotateCcw, ShieldCheck, Truck } from "lucide-react";

import { InternalPageShell } from "@/components/internal-page-shell";
import { LuxuryPageHero } from "@/components/luxury-page-hero";
import { legalBusinessIdentity } from "@/lib/legal-business";

const policySlugs = ["privacy", "terms", "shipping", "returns"] as const;
type PolicySlug = (typeof policySlugs)[number];

type PolicyPageProps = {
  params: Promise<{ locale: string; policy: string }>;
};

type Section = { title: string; paragraphs: string[] };

type PolicyContent = {
  eyebrow: string;
  title: string;
  description: string;
  sections: Section[];
};

const LAST_UPDATED_FA = "۲۶ مرداد ۱۴۰۵";
const LAST_UPDATED_EN = "17 August 2026";

const content: Record<PolicySlug, { fa: PolicyContent; en: PolicyContent }> = {
  privacy: {
    fa: {
      eyebrow: "Privacy",
      title: "حریم خصوصی",
      description: "نحوه دریافت، استفاده، نگهداری و حفاظت از اطلاعات مشتریان و بازدیدکنندگان الوریا.",
      sections: [
        {
          title: "اطلاعاتی که دریافت می‌کنیم",
          paragraphs: [
            "الوریا فقط اطلاعاتی را دریافت می‌کند که برای ثبت و اجرای سفارش، ارسال، پشتیبانی، احراز هویت مشتری، جلوگیری از سوءاستفاده و انجام الزامات قانونی یا حسابداری لازم باشد؛ از جمله نام، شماره تماس، نشانی تحویل، کد پستی، ایمیل در صورت ارائه و سوابق سفارش.",
            "اطلاعات محرمانه کارت بانکی مانند رمز، CVV2 و رمز پویا نباید در فرم‌های سایت یا پیام‌های پشتیبانی وارد شود. پرداخت آنلاین از طریق درگاه پرداخت انجام می‌شود و الوریا نیازی به دریافت این اطلاعات محرمانه ندارد.",
          ],
        },
        {
          title: "هدف استفاده از اطلاعات",
          paragraphs: [
            "اطلاعات برای پردازش سفارش، محاسبه و نمایش وضعیت خرید، ارسال کالا، ارتباط ضروری با مشتری، خدمات پس از فروش، رسیدگی به درخواست‌ها و کنترل‌های امنیتی استفاده می‌شود.",
            "اطلاعات مشتری برای فروش مستقل داده جمع‌آوری نمی‌شود. انتقال اطلاعات به ارائه‌دهندگان پرداخت، پیامک، حمل، ذخیره‌سازی یا زیرساخت فقط در حد لازم برای ارائه همان خدمت انجام می‌شود.",
          ],
        },
        {
          title: "امنیت، دسترسی و نگهداری",
          paragraphs: [
            "دسترسی مدیریتی و عملیاتی به اطلاعات باید محدود به نیاز شغلی باشد و سامانه برای رویدادهای حساس، نشست‌ها، نرخ درخواست و رویدادهای امنیتی کنترل‌های فنی مستقل دارد.",
            "داده‌ها فقط تا زمانی نگهداری می‌شوند که برای انجام سفارش، پاسخ‌گویی، پیشگیری از تقلب، سوابق مالی و الزامات قانونی لازم باشد. داده‌های موقت امنیتی و احراز هویت طبق سیاست نگهداری سامانه حذف یا منقضی می‌شوند؛ سوابق مالی و حسابرسی سفارش تابع الزامات نگهداری مربوط به خود هستند.",
          ],
        },
        {
          title: "درخواست‌های مربوط به اطلاعات",
          paragraphs: [
            "مشتری می‌تواند از طریق صفحه ارتباط با الوریا درباره اطلاعات حساب، سفارش یا اصلاح داده‌های قابل اصلاح درخواست ثبت کند. برای جلوگیری از افشای اطلاعات، ممکن است پیش از پاسخ‌گویی احراز هویت لازم باشد.",
            "در صورتی که نگهداری بخشی از اطلاعات به موجب قانون، اختلاف مالی، حسابرسی یا دفاع از حقوق طرفین لازم باشد، حذف آن بخش تا پایان مدت لازم امکان‌پذیر نخواهد بود.",
          ],
        },
      ],
    },
    en: {
      eyebrow: "Privacy",
      title: "Privacy Policy",
      description: "How Eloria collects, uses, retains and protects customer and visitor information.",
      sections: [
        {
          title: "Information we collect",
          paragraphs: [
            "Eloria collects only information needed to place and fulfil orders, arrange delivery, provide support, authenticate customers, prevent abuse and meet applicable accounting or legal requirements. This may include name, contact number, delivery address, postal code, email when supplied and order history.",
            "Sensitive bank-card credentials such as PINs, CVV2 or one-time banking passwords must never be submitted through site forms or support messages. Online payment is processed by the payment provider and Eloria does not need those confidential credentials.",
          ],
        },
        {
          title: "How information is used",
          paragraphs: [
            "Information is used to process orders, calculate and display purchase status, dispatch goods, send necessary customer communications, provide after-sales support, handle requests and perform security controls.",
            "Customer information is not collected for independent sale of personal data. Information is shared with payment, messaging, delivery, storage or infrastructure providers only to the extent needed to provide the relevant service.",
          ],
        },
        {
          title: "Security, access and retention",
          paragraphs: [
            "Administrative and operational access is restricted to legitimate need, and the service applies independent controls around sensitive events, sessions, request rates and security telemetry.",
            "Data is retained only for as long as needed to fulfil orders, provide support, prevent fraud, maintain financial records and meet legal obligations. Temporary authentication and security data is expired or removed under the service retention policy; financial and order audit records follow their applicable retention requirements.",
          ],
        },
        {
          title: "Requests about personal information",
          paragraphs: [
            "Customers may use the Contact Eloria page to request assistance with account, order or correctable personal information. Identity verification may be required before protected information is disclosed or changed.",
            "Where retention is required by law, a financial dispute, audit obligations or the defence of legal rights, the relevant information may be retained for the required period.",
          ],
        },
      ],
    },
  },

  terms: {
    fa: {
      eyebrow: "Terms",
      title: "شرایط استفاده و خرید",
      description: "قواعد خرید، قیمت، اطلاعات محصول، ثبت سفارش، پرداخت و حقوق مصرف‌کننده در فروش اینترنتی الوریا.",
      sections: [
        {
          title: "اطلاعات محصول و قیمت",
          paragraphs: [
            "نام، جنس، مشخصات، وزن یا بازه وزن در موارد مرتبط، سنگ یا متریال تزئینی، تصاویر، وضعیت موجودی و سایر ویژگی‌های مؤثر در تصمیم خرید باید در صفحه محصول یا فرایند خرید به‌صورت روشن نمایش داده شود. تفاوت جزئی رنگ ناشی از نمایشگر به‌تنهایی به معنی مغایرت کالا نیست.",
            "قیمت قابل پرداخت، هزینه ارسال و هر مبلغ دیگری که بر عهده مشتری باشد باید پیش از پرداخت نمایش داده شود. محاسبات مالی سفارش در سمت سرور انجام می‌شود و مبلغ نمایش‌داده‌شده در سبد یا صفحه محصول تا پیش از ایجاد سفارش می‌تواند با تغییر نرخ‌ها یا موجودی به‌روزرسانی شود.",
          ],
        },
        {
          title: "ثبت سفارش و پرداخت",
          paragraphs: [
            "ایجاد سفارش به‌تنهایی به معنی پرداخت موفق نیست. وضعیت مالی سفارش فقط پس از تأیید نتیجه پرداخت در سامانه تغییر می‌کند و شناسه‌های پرداخت و رویدادهای مالی مرتبط در سوابق سفارش نگهداری می‌شوند.",
            "اگر پس از دریافت وجه، انجام سفارش به علت عدم موجودی یا عدم امکان اجرای تعهد ممکن نباشد، موضوع مطابق مقررات لازم‌الاجرا رسیدگی و مبلغ دریافتی بدون تحمیل هزینه ناموجه به مشتری مسترد می‌شود.",
          ],
        },
        {
          title: "حق انصراف در معامله از راه دور",
          paragraphs: [
            "اصل عمومی در معاملات از راه دور این است که مصرف‌کننده حداقل هفت روز کاری برای اعمال حق انصراف بدون نیاز به ارائه دلیل و بدون جریمه فرصت دارد. در فروش کالا، آغاز این مهلت از زمان تحویل کالا و پس از ارائه اطلاعات الزامی قانونی محاسبه می‌شود. در انصراف عادی، هزینه بازپس‌فرستادن کالا می‌تواند بر عهده مصرف‌کننده باشد.",
            "استثناهای قانونی حق انصراف فقط در صورت انطباق واقعی با مقررات اعمال می‌شوند. از جمله، کالایی که با مشخصات فردی مشتری ساخته شده و به‌وضوح جنبه شخصی دارد ممکن است مشمول استثنا باشد. همچنین استثنای مربوط به کالایی که قیمت آن خارج از اختیار تأمین‌کننده توسط نوسانات بازار مالی تعیین می‌شود فقط در صورت انطباق با مصادیق و مقررات لازم‌الاجرا قابل استناد است؛ صرف استفاده از طلا یا نقره در یک محصول به‌تنهایی به معنی حذف خودکار حق انصراف نیست.",
          ],
        },
        {
          title: "مغایرت، عیب و استفاده مجاز",
          paragraphs: [
            "حق انصراف عادی جایگزین حقوق مشتری در برابر کالای معیوب، آسیب‌دیده، اشتباه یا مغایر با مشخصات اعلام‌شده نیست. چنین مواردی جداگانه و بر اساس قانون، وضعیت کالا و مستندات سفارش بررسی می‌شوند.",
            "استفاده خودکار مخرب، ثبت سفارش غیرواقعی، تلاش برای دورزدن محدودیت موجودی یا قیمت، دسترسی غیرمجاز و هر اقدامی که امنیت یا دسترس‌پذیری سرویس را مختل کند ممنوع است.",
          ],
        },
        {
          title: "نسخه شرایط و حل اختلاف",
          paragraphs: [
            "نسخه‌ای از شرایط که هنگام ثبت سفارش در سایت منتشر بوده مبنای اطلاع‌رسانی آن خرید است. تغییرات بعدی برای استفاده‌ها و سفارش‌های بعد از انتشار اعمال می‌شوند و نمی‌توانند حقوق آمره مصرف‌کننده را کاهش دهند.",
            "در صورت اختلاف، ابتدا درخواست از مسیر ارتباط و پشتیبانی ثبت می‌شود. مراجعه به مراجع قانونی و صلاحیت‌دار طبق قوانین جمهوری اسلامی ایران محفوظ است.",
          ],
        },
      ],
    },
    en: {
      eyebrow: "Terms",
      title: "Terms of Use and Purchase",
      description: "Rules governing product information, pricing, orders, payments and consumer rights when purchasing from Eloria online.",
      sections: [
        {
          title: "Product information and pricing",
          paragraphs: [
            "Product name, material, relevant weight or weight range, stones or decorative materials, images, stock status and other material purchase characteristics should be presented clearly on the product page or during checkout. Minor colour variation caused by different displays does not by itself establish a product mismatch.",
            "The amount payable, shipping cost and any other customer-borne charge must be shown before payment. Financial calculations are performed server-side, and cart or product-page pricing may be refreshed before an order is created when rates or availability change.",
          ],
        },
        {
          title: "Orders and payment",
          paragraphs: [
            "Creating an order does not by itself mean that payment succeeded. The financial state of an order changes only after the payment result is verified, and relevant payment references and financial audit events are retained with the order.",
            "If fulfilment becomes impossible after funds have been received because stock is unavailable or the obligation cannot be performed, the matter will be handled under applicable law and the received amount will be returned without unjustified charges to the customer.",
          ],
        },
        {
          title: "Distance-sale withdrawal right",
          paragraphs: [
            "As a general rule for distance transactions, consumers have at least seven working days to exercise the statutory withdrawal right without giving a reason or paying a penalty. For goods, the period starts from delivery after the legally required information has been supplied. In an ordinary withdrawal, the customer may bear the cost of returning the goods.",
            "Statutory exceptions apply only where the transaction genuinely falls within the applicable rule. Goods made to an individual's specifications and clearly personal in nature may fall within an exception. An exception for goods whose price is determined by financial-market fluctuations outside the supplier's control may be relied upon only where the applicable legal criteria and current classifications are actually met; merely containing gold or silver does not automatically remove the withdrawal right.",
          ],
        },
        {
          title: "Mismatch, defects and permitted use",
          paragraphs: [
            "The ordinary withdrawal right does not replace the customer's separate rights in relation to defective, damaged, incorrect or materially non-conforming goods. Those cases are reviewed separately under applicable law, the condition of the item and the order records.",
            "Malicious automated use, fake orders, attempts to bypass stock or pricing controls, unauthorised access and conduct that harms the security or availability of the service are prohibited.",
          ],
        },
        {
          title: "Applicable version and disputes",
          paragraphs: [
            "The version of these terms published when an order is placed is the version presented for that purchase. Later changes apply to subsequent use and orders and cannot reduce mandatory consumer protections.",
            "If a dispute arises, a request should first be recorded through Eloria's contact and support route. The right to refer a matter to competent authorities under the laws of the Islamic Republic of Iran remains unaffected.",
          ],
        },
      ],
    },
  },

  shipping: {
    fa: {
      eyebrow: "Shipping",
      title: "ارسال و تحویل",
      description: "شرایط آماده‌سازی، بسته‌بندی، هزینه ارسال، رهگیری و تحویل سفارش‌های الوریا.",
      sections: [
        {
          title: "آماده‌سازی سفارش",
          paragraphs: [
            "زمان آماده‌سازی قابل انتظار باید در صفحه محصول، سبد یا هنگام تسویه‌حساب اعلام شود. محصولات ساخته‌شده یا تکمیل‌شده بر اساس سفارش مشتری می‌توانند زمان آماده‌سازی متفاوتی داشته باشند که باید پیش از پرداخت قابل مشاهده باشد.",
            "تا زمانی که فروش آنلاین فعال نشده است، زمان‌های نمایش‌داده‌شده جنبه عملیاتی نهایی ندارند. پس از فعال‌سازی فروش، زمان و روش ارسال هر سفارش در همان سفارش ثبت می‌شود.",
          ],
        },
        {
          title: "هزینه و روش ارسال",
          paragraphs: [
            "هزینه ارسال و هر هزینه دیگری که بر عهده مشتری باشد پیش از پرداخت نمایش داده می‌شود. سیاست هزینه ارسال در سمت سرور اعمال می‌شود تا مبلغ سفارش با اطلاعات ثبت‌شده در پرداخت یکسان بماند.",
            "بسته‌بندی متناسب با حساسیت و ارزش کالا انتخاب می‌شود. در صورت استفاده از شرکت حمل یا پست، اطلاعات رهگیری پس از تحویل مرسوله به حمل‌کننده در اختیار مشتری قرار می‌گیرد هرگاه سرویس حمل چنین شناسه‌ای ارائه کند.",
          ],
        },
        {
          title: "تحویل و بررسی اولیه",
          paragraphs: [
            "برای سفارش‌های ارزشمند ممکن است احراز هویت گیرنده، امضا یا کنترل اطلاعات تحویل لازم باشد. مشتری باید نشانی و مشخصات تحویل را دقیق وارد کند و تغییر نشانی پس از شروع ارسال ممکن است امکان‌پذیر نباشد.",
            "اگر بسته هنگام تحویل نشانه آشکار آسیب، بازشدگی یا مغایرت دارد، ثبت مستندات از وضعیت بسته و اعلام سریع از طریق صفحه ارتباط، بررسی درخواست را دقیق‌تر می‌کند. این توصیه موجب اسقاط حقوق قانونی مشتری نمی‌شود.",
          ],
        },
        {
          title: "تأخیر یا عدم امکان تحویل",
          paragraphs: [
            "اگر آماده‌سازی یا تحویل با تأخیر غیرعادی مواجه شود، وضعیت سفارش و اطلاعات قابل ارائه از مسیر پیگیری یا پشتیبانی اعلام می‌شود.",
            "اگر اجرای سفارش به دلیل عدم موجودی یا عدم امکان ایفای تعهد ممکن نباشد، وجه دریافتی مطابق مقررات لازم‌الاجرا مسترد می‌شود؛ مگر در مواردی که قانون و توافق معتبر طرفین راهکار دیگری را مجاز بداند.",
          ],
        },
      ],
    },
    en: {
      eyebrow: "Shipping",
      title: "Shipping and Delivery",
      description: "Preparation, packaging, shipping charges, tracking and delivery conditions for Eloria orders.",
      sections: [
        {
          title: "Order preparation",
          paragraphs: [
            "Expected preparation time should be shown on the product page, cart or checkout. Products made or finished to a customer's order may require a different preparation period, which should be visible before payment.",
            "While online commerce remains disabled, displayed fulfilment timings are not final operational commitments. Once commerce is enabled, the applicable preparation and shipping details are recorded with each order.",
          ],
        },
        {
          title: "Shipping method and cost",
          paragraphs: [
            "Shipping charges and other customer-borne costs are shown before payment. Shipping policy is calculated server-side so that the order amount remains consistent with the amount submitted for payment.",
            "Packaging is selected according to the sensitivity and value of the goods. Where the carrier supplies tracking information, it is made available after the parcel is handed over for delivery.",
          ],
        },
        {
          title: "Delivery and initial inspection",
          paragraphs: [
            "High-value orders may require recipient identity checks, signature or verification of delivery details. Customers are responsible for entering accurate delivery information, and address changes may not be possible once dispatch has started.",
            "If a parcel shows visible damage, opening or mismatch at delivery, recording the condition and promptly contacting Eloria helps the review process. This recommendation does not waive statutory customer rights.",
          ],
        },
        {
          title: "Delay or inability to deliver",
          paragraphs: [
            "If preparation or delivery is subject to an unusual delay, available order status and information will be communicated through tracking or support.",
            "If fulfilment is impossible because stock is unavailable or the obligation cannot be performed, received funds will be returned in accordance with applicable law, unless another legally permitted solution has been validly agreed.",
          ],
        },
      ],
    },
  },

  returns: {
    fa: {
      eyebrow: "Returns",
      title: "مرجوعی، انصراف و بازپرداخت",
      description: "نحوه اعمال حق انصراف، بررسی مغایرت و عیب، کالاهای شخصی‌سازی‌شده و استرداد وجه.",
      sections: [
        {
          title: "حق انصراف عادی",
          paragraphs: [
            "در معاملات از راه دور، اصل عمومی حداقل هفت روز کاری مهلت انصراف برای مصرف‌کننده است؛ بدون نیاز به ارائه دلیل و بدون جریمه. در فروش کالا، مهلت از تاریخ تحویل و پس از ارائه اطلاعات الزامی قانونی آغاز می‌شود.",
            "برای ثبت قابل استناد درخواست، مشتری باید از مسیر ارتباط سایت شماره سفارش و درخواست انصراف را ارسال کند. در انصراف عادی، تنها هزینه بازپس‌فرستادن کالا می‌تواند بر عهده مصرف‌کننده باشد، مگر آنکه قانون یا توافق معتبر شرایط مساعدتری مقرر کرده باشد.",
          ],
        },
        {
          title: "استثناهای قانونی",
          paragraphs: [
            "محصولی که بر اساس مشخصات فردی مشتری ساخته شده و به‌وضوح جنبه شخصی دارد، مانند برخی سفارش‌های اختصاصی، حکاکی یا سفارشی‌سازی غیرقابل عرضه مجدد، ممکن است مطابق مقررات از حق انصراف عادی مستثنا باشد. این استثنا نباید فراتر از حدود قانونی آن اعمال شود.",
            "در مورد استثنای نوسان بازار مالی نیز فقط زمانی می‌توان به آن استناد کرد که محصول یا معامله واقعاً با ضوابط و مصادیق جاری این استثنا منطبق باشد. استفاده از فلز گران‌بها به‌تنهایی موجب حذف خودکار حق انصراف نیست.",
          ],
        },
        {
          title: "عیب، آسیب یا مغایرت",
          paragraphs: [
            "کالای معیوب، آسیب‌دیده، اشتباه یا مغایر با مشخصات اعلام‌شده جدا از انصراف عادی بررسی می‌شود. در چنین مواردی از مشتری خواسته می‌شود شماره سفارش، توضیح مشکل و در صورت امکان تصویر بسته‌بندی و کالا را برای مستندسازی ارسال کند.",
            "مشتری بهتر است تا پایان بررسی، کالا، بسته‌بندی و متعلقات را در وضعیت قابل بررسی نگهدارد. این الزام عملیاتی نباید به نحوی تفسیر شود که حقوق قانونی مشتری در مورد عیب یا عدم انطباق را از بین ببرد.",
          ],
        },
        {
          title: "هزینه بازگشت و بازپرداخت",
          paragraphs: [
            "در انصراف عادی، هزینه بازپس‌فرستادن کالا طبق قانون می‌تواند بر عهده مصرف‌کننده باشد. در مواردی مانند ارسال کالای اشتباه یا مغایرت و عیب منتسب به فروشنده، هزینه‌ها و راهکار مناسب بر اساس مقررات و نتیجه بررسی تعیین می‌شود.",
            "پس از ثبت و تأیید وضعیت بازپرداخت، نتیجه و شناسه مرجع مربوط در سوابق سفارش ثبت می‌شود. بازگشت وجه از مسیر پرداخت معتبر و تا حد امکان به همان منبع پرداخت انجام می‌شود؛ زمان نهایی مشاهده وجه می‌تواند به شبکه بانکی یا ارائه‌دهنده پرداخت وابسته باشد.",
          ],
        },
        {
          title: "عدم محدودسازی حقوق آمره",
          paragraphs: [
            "هیچ‌یک از این شرایط به معنی حذف حقوقی نیست که به موجب قوانین آمره برای مصرف‌کننده قابل اسقاط یا محدودکردن نیست.",
            "اگر بین متن سایت و مقررات لازم‌الاجرا تعارضی وجود داشته باشد، مقررات لازم‌الاجرا حاکم خواهد بود.",
          ],
        },
      ],
    },
    en: {
      eyebrow: "Returns",
      title: "Returns, Withdrawal and Refunds",
      description: "How statutory withdrawal, defects, mismatches, personalised goods and refunds are handled.",
      sections: [
        {
          title: "Ordinary withdrawal right",
          paragraphs: [
            "For distance transactions, the general rule provides consumers with at least seven working days to withdraw without giving a reason or paying a penalty. For goods, the period begins on delivery after the legally required information has been supplied.",
            "To create an auditable request, customers should use the site's contact route and include the order number and withdrawal request. In an ordinary withdrawal, only the cost of returning the goods may be borne by the consumer unless applicable law or a valid agreement provides a more favourable arrangement.",
          ],
        },
        {
          title: "Statutory exceptions",
          paragraphs: [
            "Goods made to an individual's specifications and clearly personal in nature, including certain bespoke, engraved or non-resalable custom work, may fall outside the ordinary withdrawal right under the applicable rules. The exception must not be applied beyond its legal scope.",
            "A financial-market fluctuation exception may be relied upon only where the product or transaction actually meets the current legal criteria and classifications. The mere presence of precious metal does not automatically remove the withdrawal right.",
          ],
        },
        {
          title: "Defects, damage or mismatch",
          paragraphs: [
            "Defective, damaged, incorrect or materially non-conforming goods are reviewed separately from ordinary withdrawal. Customers may be asked for the order number, a description and, where possible, photographs of the parcel and item for documentation.",
            "Customers should preserve the item, packaging and accessories in a reviewable condition while the matter is assessed. This operational request must not be interpreted as removing mandatory rights relating to defects or non-conformity.",
          ],
        },
        {
          title: "Return cost and refunds",
          paragraphs: [
            "For an ordinary withdrawal, return shipping may be borne by the consumer under applicable law. Where the wrong item was sent or a defect or mismatch is attributable to the seller, costs and the appropriate remedy are determined under the applicable rules and review outcome.",
            "Once a refund state is confirmed, the outcome and relevant refund reference are recorded with the order. Funds are returned through an authorised payment route and, where practicable, to the original payment source; the final bank posting time may depend on the banking network or payment provider.",
          ],
        },
        {
          title: "Mandatory rights are preserved",
          paragraphs: [
            "Nothing in these terms removes a consumer right that cannot lawfully be waived or restricted.",
            "If these site terms conflict with mandatory applicable law, the mandatory legal rule prevails.",
          ],
        },
      ],
    },
  },
};

const icons: Record<PolicySlug, typeof ShieldCheck> = {
  privacy: ShieldCheck,
  terms: FileText,
  shipping: Truck,
  returns: RotateCcw,
};

export function generateStaticParams() {
  return policySlugs.map(policy => ({ policy }));
}

export default async function PolicyPage({ params }: PolicyPageProps) {
  const { locale, policy } = await params;

  if (
    (locale !== "fa" && locale !== "en") ||
    !policySlugs.includes(policy as PolicySlug)
  ) {
    notFound();
  }

  setRequestLocale(locale);

  const isPersian = locale === "fa";
  const slug = policy as PolicySlug;
  const page = content[slug][isPersian ? "fa" : "en"];
  const Icon = icons[slug];
  const seller = legalBusinessIdentity();

  return (
    <InternalPageShell locale={locale}>
      <section className="eloria-page-container relative z-10 pb-28 pt-36 sm:pt-40">
        <LuxuryPageHero
          eyebrow={page.eyebrow}
          title={page.title}
          description={page.description}
          isPersian={isPersian}
          icon={<Icon className="size-6" />}
        />

        <div className="mx-auto mt-8 max-w-5xl rounded-2xl border border-[#d9b85f]/18 bg-[#d9b85f]/[0.035] px-5 py-4 text-sm leading-7 text-[#d9cba9]/70">
          {isPersian ? `آخرین به‌روزرسانی: ${LAST_UPDATED_FA}` : `Last updated: ${LAST_UPDATED_EN}`}
        </div>

        <div className="mx-auto mt-5 max-w-5xl">
          <article className="eloria-panel rounded-[2rem] p-6 sm:p-8">
            <p className="eloria-kicker">{isPersian ? "اطلاعات فروشنده" : "Seller information"}</p>
            <h2 className="mt-3 text-xl font-semibold text-[#f0e2c2] sm:text-2xl">
              {seller.sellerName}
            </h2>

            {seller.complete ? (
              <div className="mt-5 space-y-3 text-sm leading-8 text-[#d1c3a3]/70 sm:text-base">
                <p>
                  <strong>{isPersian ? "نشانی محل تجاری/کاری: " : "Business/work address: "}</strong>
                  {seller.businessAddress}
                </p>
                {seller.supportPhone ? (
                  <p>
                    <strong>{isPersian ? "تلفن: " : "Phone: "}</strong>
                    <a className="underline-offset-4 hover:underline" href={`tel:${seller.supportPhone}`}>
                      {seller.supportPhone}
                    </a>
                  </p>
                ) : null}
                {seller.supportEmail ? (
                  <p>
                    <strong>{isPersian ? "ایمیل: " : "Email: "}</strong>
                    <a className="underline-offset-4 hover:underline" href={`mailto:${seller.supportEmail}`}>
                      {seller.supportEmail}
                    </a>
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-5 text-sm leading-8 text-[#d1c3a3]/70 sm:text-base">
                {isPersian
                  ? "فروش آنلاین هنوز در حالت پیش‌راه‌اندازی است. نام قانونی فروشنده، نشانی محل تجاری/کاری و حداقل یک راه تماس مستقیم باید پیش از فعال‌سازی فروش یا Index شدن صفحات حقوقی در تنظیمات Production تکمیل شود. تا آن زمان برای ارتباط از فرم رسمی سایت استفاده کنید."
                  : "Online commerce is still in pre-launch mode. The legal seller name, business/work address and at least one direct contact method must be configured before commerce is enabled or these legal pages are indexed. Until then, use the site's official contact form."}
              </p>
            )}

            <Link className="eloria-button-secondary mt-6 inline-flex" href={`/${locale}/contact`}>
              {isPersian ? "ارتباط با الوریا" : "Contact Eloria"}
            </Link>
          </article>
        </div>

        <div className="mx-auto mt-5 max-w-5xl space-y-5">
          {page.sections.map((section, index) => (
            <article
              key={section.title}
              data-reveal
              style={{ "--reveal-delay": `${index * 80}ms` } as CSSProperties}
              className="eloria-panel rounded-[2rem] p-6 sm:p-8"
            >
              <div className="flex items-center gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#d9b85f]/24 bg-[#d9b85f]/[0.05] text-sm text-[#e1c370]">
                  {(index + 1).toLocaleString(isPersian ? "fa-IR" : "en-US")}
                </span>
                <h2 className="text-xl font-semibold text-[#f0e2c2] sm:text-2xl">
                  {section.title}
                </h2>
              </div>

              <div className="mt-5 space-y-3 text-sm leading-8 text-[#d1c3a3]/68 sm:text-base sm:leading-9">
                {section.paragraphs.map(paragraph => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div className="mx-auto mt-8 max-w-5xl text-sm leading-7 text-[#cdbf9f]/58">
          {isPersian
            ? "این صفحات برای شفاف‌سازی شرایط فروشگاه تنظیم شده‌اند و جایگزین قوانین آمره یا نظر مرجع صلاحیت‌دار نیستند."
            : "These pages are intended to explain the store's operating terms and do not replace mandatory law or a decision of a competent authority."}
        </div>
      </section>
    </InternalPageShell>
  );
}
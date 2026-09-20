import { createHash } from "node:crypto";

import { databasePool, prisma } from "../src/lib/prisma";

const COLLECTIONS = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    slug: "necklaces",
    nameFa: "گردنبند",
    nameEn: "Necklaces",
    descriptionFa: "روایت‌هایی آویخته از طلا، نقره، اصالت و افسانه",
    descriptionEn: "Stories suspended in gold, silver, heritage and legend",
    imageUrl: "/images/collections/necklaces.jfif",
    displayOrder: 10,
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    slug: "bracelets",
    nameFa: "دستبند",
    nameEn: "Bracelets",
    descriptionFa: "نقش‌هایی از شکوه، ظرافت و میراث ماندگار الوریا",
    descriptionEn: "Symbols of elegance, grace and enduring Eloria heritage",
    imageUrl: "/images/collections/bracelet.jpg",
    displayOrder: 20,
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    slug: "earrings",
    nameFa: "گوشواره",
    nameEn: "Earrings",
    descriptionFa: "درخشش‌هایی الهام‌گرفته از جهان اسرارآمیز الوریا",
    descriptionEn: "Radiance inspired by the mysterious world of Eloria",
    imageUrl: "/images/collections/earring.jpg",
    displayOrder: 30,
  },
] as const;

const PRODUCTS = [
  {
    id: "20000000-0000-4000-8000-000000000001",
    collectionSlug: "necklaces",
    slug: "mehr-necklace",
    sku: "EL-N-001",
    nameFa: "گردنبند مهر",
    nameEn: "Mehr Necklace",
    material: "GOLD" as const,
    metalWeight: "3.250",
    purity: "۱۸ عیار",
    purityFineness: 750,
    makingChargeType: "PERCENT" as const,
    makingChargePercent: "12.000",
    artisticFee: "650000",
    stock: 7,
    displayOrder: 10,
    imageUrl: "/images/collections/necklaces.jfif",
  },
  {
    id: "20000000-0000-4000-8000-000000000002",
    collectionSlug: "necklaces",
    slug: "simorgh-necklace",
    sku: "EL-N-002",
    nameFa: "گردنبند سیمرغ",
    nameEn: "Simorgh Necklace",
    material: "SILVER" as const,
    metalWeight: "12.400",
    purity: "نقره ۹۲۵",
    purityFineness: 925,
    makingChargeType: "FIXED" as const,
    makingChargeFixed: "1800000",
    artisticFee: "900000",
    stock: 4,
    displayOrder: 20,
    imageUrl: "/images/collections/necklaces.jfif",
  },
  {
    id: "20000000-0000-4000-8000-000000000003",
    collectionSlug: "bracelets",
    slug: "lotus-bracelet",
    sku: "EL-B-001",
    nameFa: "دستبند لوتوس",
    nameEn: "Lotus Bracelet",
    material: "GOLD" as const,
    metalWeight: "4.100",
    purity: "۱۸ عیار",
    purityFineness: 750,
    makingChargeType: "PER_GRAM" as const,
    makingChargePerGram: "420000",
    artisticFee: "550000",
    stock: 6,
    displayOrder: 10,
    imageUrl: "/images/collections/bracelet.jpg",
  },
  {
    id: "20000000-0000-4000-8000-000000000004",
    collectionSlug: "bracelets",
    slug: "shahnameh-bracelet",
    sku: "EL-B-002",
    nameFa: "دستبند شاهنامه",
    nameEn: "Shahnameh Bracelet",
    material: "SILVER" as const,
    metalWeight: "18.800",
    purity: "نقره ۹۲۵",
    purityFineness: 925,
    makingChargeType: "COMBINED" as const,
    makingChargeFixed: "900000",
    makingChargePercent: "8.000",
    artisticFee: "1250000",
    stock: 0,
    displayOrder: 20,
    imageUrl: "/images/collections/bracelet.jpg",
  },
  {
    id: "20000000-0000-4000-8000-000000000005",
    collectionSlug: "earrings",
    slug: "anahita-earrings",
    sku: "EL-E-001",
    nameFa: "گوشواره آناهیتا",
    nameEn: "Anahita Earrings",
    material: "GOLD" as const,
    metalWeight: "2.750",
    purity: "۱۸ عیار",
    purityFineness: 750,
    makingChargeType: "PERCENT" as const,
    makingChargePercent: "14.000",
    artisticFee: "500000",
    stock: 8,
    displayOrder: 10,
    imageUrl: "/images/collections/earring.jpg",
  },
  {
    id: "20000000-0000-4000-8000-000000000006",
    collectionSlug: "earrings",
    slug: "persian-star-earrings",
    sku: "EL-E-002",
    nameFa: "گوشواره ستاره پارسی",
    nameEn: "Persian Star Earrings",
    material: "SILVER" as const,
    metalWeight: "8.600",
    purity: "نقره ۹۲۵",
    purityFineness: 925,
    makingChargeType: "FIXED" as const,
    makingChargeFixed: "1250000",
    artisticFee: "600000",
    stock: 5,
    displayOrder: 20,
    imageUrl: "/images/collections/earring.jpg",
  },
] as const;

const EDUCATIONAL_GUIDES = [
  {
    slug: "how-to-measure-ring-size",
    titleFa: "چگونه سایز انگشتر را دقیق پیدا کنیم؟",
    titleEn: "How to Find Your Ring Size",
    keywordFa: "تعیین سایز انگشتر",
    keywordEn: "ring size guide",
    excerptFa: "راهنمای اندازه‌گیری قطر داخلی انگشتر و دور انگشت، با نکته‌های مهم برای جلوگیری از انتخاب سایز اشتباه.",
    excerptEn: "A practical guide to measuring an existing ring or your finger and avoiding common sizing mistakes.",
    contentFa: "## روش اول: اندازه‌گیری انگشتر فعلی\n\nانگشتری را انتخاب کنید که روی همان انگشت به‌خوبی می‌نشیند. قطر داخلی آن را با خط‌کش میلی‌متری، از یک لبه داخلی تا لبه داخلی روبه‌رو اندازه بگیرید.\n\n## روش دوم: اندازه‌گیری دور انگشت\n\nیک نوار کاغذی باریک را بدون فشار دور پهن‌ترین قسمت انگشت قرار دهید، محل اتصال را علامت بزنید و طول آن را به میلی‌متر اندازه بگیرید. اندازه‌گیری را در پایان روز و در دمای معمول انجام دهید.\n\n## نکته‌های مهم\n\nدست غالب ممکن است کمی بزرگ‌تر باشد. انگشترهای پهن معمولاً به فضای بیشتری نیاز دارند. اگر اندازه بین دو سایز است، برای مدل پهن سایز بزرگ‌تر منطقی‌تر است. پیش از سفارش نهایی، اندازه را دوبار کنترل کنید.",
    contentEn: "## Measure an existing ring\n\nMeasure the inside diameter of a ring that already fits the intended finger. Use millimetres and measure from inner edge to inner edge.\n\n## Measure your finger\n\nWrap a narrow paper strip around the widest part without pulling tightly, mark the overlap, and measure it in millimetres. Measure near the end of the day at a normal temperature.\n\n## Final checks\n\nYour dominant hand may be slightly larger. Wide bands often need more room. Repeat the measurement before ordering.",
  },
  {
    slug: "what-is-gold-making-charge",
    titleFa: "اجرت طلا چیست و چگونه محاسبه می‌شود؟",
    titleEn: "What Is a Gold Making Charge?",
    keywordFa: "اجرت طلا",
    keywordEn: "gold making charge",
    excerptFa: "توضیح ساده اجرت ساخت، سود و مالیات و تفاوت آن‌ها با ارزش طلای خام در قیمت نهایی جواهر.",
    excerptEn: "A clear explanation of making charge, profit, tax and the underlying metal value in a jewellery price.",
    contentFa: "## اجرت ساخت یعنی چه؟\n\nاجرت، هزینه طراحی، ساخت، پرداخت و مهارتی است که یک قطعه طلای خام را به جواهر تبدیل می‌کند. اجرت می‌تواند مبلغ ثابت، مبلغ به‌ازای هر گرم، درصدی یا ترکیبی باشد.\n\n## اجزای قیمت\n\nقیمت نهایی معمولاً از ارزش وزن طلای خالص‌شده بر اساس عیار، اجرت، هزینه هنری، سود و مالیات مجاز تشکیل می‌شود. این اجزا باید روی فاکتور شفاف باشند.\n\n## هنگام مقایسه\n\nدو قطعه هم‌وزن الزاماً قیمت یکسان ندارند؛ پیچیدگی ساخت و جزئیات دست‌ساز بر اجرت اثر می‌گذارد. عدد نهایی را همراه وزن، عیار و شیوه محاسبه بررسی کنید.",
    contentEn: "## Meaning\n\nThe making charge covers design, craft, finishing and the work that turns metal into jewellery. It may be fixed, per gram, percentage-based or combined.\n\n## Price structure\n\nA final price may include metal value adjusted for purity, making and artistic charges, profit and applicable tax. These elements should be transparent on the invoice.\n\n## Compare carefully\n\nEqual weight does not mean equal price because craftsmanship and complexity differ.",
  },
  {
    slug: "white-gold-vs-yellow-gold",
    titleFa: "تفاوت طلای سفید و طلای زرد",
    titleEn: "White Gold vs Yellow Gold",
    keywordFa: "تفاوت طلای سفید و زرد",
    keywordEn: "white gold vs yellow gold",
    excerptFa: "مقایسه رنگ، ترکیب آلیاژ، نگهداری و نکات انتخاب طلای سفید و زرد بدون ادعاهای گمراه‌کننده.",
    excerptEn: "A comparison of colour, alloy composition, care and selection considerations for white and yellow gold.",
    contentFa: "## تفاوت اصلی\n\nهر دو می‌توانند طلای واقعی با عیار یکسان باشند؛ تفاوت رنگ از فلزات آلیاژی و پرداخت سطح می‌آید. طلای سفید معمولاً ظاهر سردتر دارد و برخی مدل‌ها با روکش رودیوم عرضه می‌شوند.\n\n## نگهداری\n\nروکش بعضی قطعات سفید ممکن است با گذر زمان نیاز به تجدید داشته باشد. طلای زرد تغییر ظاهری روکش سفید را ندارد، اما هر دو باید از مواد شیمیایی و ضربه دور بمانند.\n\n## انتخاب\n\nرنگ پوست، رنگ سنگ، سبک لباس و میزان نگهداری مورد قبول شما مهم‌تر از تصور برتری مطلق یکی بر دیگری است.",
    contentEn: "## Main difference\n\nBoth can be genuine gold of the same purity. Their colour differs because of alloy metals and surface finishing. Some white-gold pieces use rhodium plating.\n\n## Care\n\nPlating may eventually need renewal. Both colours should be protected from chemicals and impact.\n\n## Choosing\n\nConsider skin tone, gemstones, personal style and the maintenance you are comfortable with.",
  },
  {
    slug: "gold-gift-buying-guide",
    titleFa: "راهنمای خرید طلا برای هدیه",
    titleEn: "Gold Gift Buying Guide",
    keywordFa: "خرید طلا برای هدیه",
    keywordEn: "gold gift guide",
    excerptFa: "چطور با توجه به سبک فرد، بودجه، سایز و امکان تعویض، هدیه‌ای ماندگار و کاربردی انتخاب کنیم.",
    excerptEn: "How to choose a lasting gift by considering personal style, budget, sizing and exchange conditions.",
    contentFa: "## از سبک فرد شروع کنید\n\nبه رنگ زیورآلاتی که معمولاً استفاده می‌کند، طرح‌های ساده یا شاخص و سبک روزمره او توجه کنید.\n\n## بودجه شفاف\n\nپیش از انتخاب، سقف بودجه را مشخص و قیمت را با وزن، عیار، اجرت و شرایط فاکتور بررسی کنید. برای هدیه غافلگیرانه، گردنبند و گوشواره معمولاً دردسر سایز کمتری از انگشتر دارند.\n\n## پیش از پرداخت\n\nشرایط تعویض، سلامت پلمب، مدارک محصول و زمان تحویل را بخوانید. برای قطعه سفارشی یا شخصی‌سازی‌شده، محدودیت بازگشت را از قبل بپرسید.",
    contentEn: "## Start with their style\n\nNotice the jewellery colour, level of detail and everyday style they already prefer.\n\n## Set a clear budget\n\nCheck weight, purity, making charge and invoice terms. Necklaces and earrings often carry less sizing risk than rings.\n\n## Before payment\n\nReview exchange terms, product documentation and delivery timing, especially for customised pieces.",
  },
  {
    slug: "how-to-care-for-gold-jewelry",
    titleFa: "نحوه نگهداری و تمیزکردن طلا",
    titleEn: "How to Care for Gold Jewellery",
    keywordFa: "نگهداری از طلا",
    keywordEn: "gold jewellery care",
    excerptFa: "روش‌های امن نگهداری روزمره، تمیزکردن ملایم و جلوگیری از خط‌وخش، مواد شیمیایی و آسیب سنگ‌ها.",
    excerptEn: "Safe everyday storage, gentle cleaning and ways to reduce scratches, chemical exposure and gemstone damage.",
    contentFa: "## نگهداری روزمره\n\nهر قطعه را جداگانه در کیسه یا محفظه نرم بگذارید تا روی قطعات دیگر خراش ایجاد نکند. پیش از ورزش، حمام، استخر و کار با شوینده‌ها زیور را بردارید.\n\n## تمیزکردن ملایم\n\nبرای قطعات ساده، آب ولرم و مقدار کمی شوینده بسیار ملایم کافی است؛ سپس با پارچه نرم خشک کنید. برای سنگ‌های متخلخل، مروارید، چسب یا بافت مکرومه از خیساندن خودداری و دستور اختصاصی فروشنده را رعایت کنید.\n\n## بررسی دوره‌ای\n\nقفل، چنگ سنگ و اتصالات را منظم بررسی کنید. لق‌شدن سنگ یا پارگی بافت باید پیش از استفاده دوباره توسط متخصص بررسی شود.",
    contentEn: "## Daily storage\n\nStore pieces separately in soft pouches. Remove jewellery before exercise, bathing, swimming or using cleaning chemicals.\n\n## Gentle cleaning\n\nWarm water and a very mild cleanser can suit simple pieces. Avoid soaking porous stones, pearls, adhesive settings or macramé; follow piece-specific advice.\n\n## Periodic checks\n\nInspect clasps, stone settings and connections, and seek professional help when anything becomes loose.",
  },
  {
    slug: "ring-buying-guide",
    titleFa: "راهنمای کامل خرید انگشتر",
    titleEn: "Complete Ring Buying Guide",
    keywordFa: "راهنمای خرید انگشتر",
    keywordEn: "ring buying guide",
    excerptFa: "چک‌لیست انتخاب سایز، عیار، وزن، فرم رکاب، سنگ، راحتی و فاکتور پیش از خرید انگشتر.",
    excerptEn: "A checklist covering size, purity, weight, band shape, stones, comfort and invoice details before buying a ring.",
    contentFa: "## کاربرد را مشخص کنید\n\nانگشتر روزمره باید لبه‌های راحت، ارتفاع مناسب و استحکام متناسب داشته باشد. مدل‌های ظریف یا سنگ‌دار ممکن است برای فعالیت سنگین مناسب نباشند.\n\n## مشخصات را تطبیق دهید\n\nسایز، وزن، عیار، جنس و وضعیت سنگ‌ها را با توضیحات و فاکتور مقایسه کنید. تصاویر باید خود محصول یا نمونه کاملاً مشخص‌شده باشند.\n\n## قیمت و خدمات\n\nارزش فلز، اجرت، سود و مالیات را جداگانه بررسی کنید. درباره تغییر سایز، خدمات پس از فروش، زمان تحویل و محدودیت قطعات سفارشی پیش از پرداخت سؤال کنید.",
    contentEn: "## Define the use\n\nAn everyday ring needs comfortable edges, practical height and suitable strength. Delicate or stone-set designs may not suit heavy activity.\n\n## Match the specifications\n\nCompare size, weight, purity, material and stones with the description and invoice.\n\n## Price and service\n\nReview metal value, making charge, profit and tax, plus resizing and after-sales terms before payment.",
  },
] as const;

async function seed() {
  const now = new Date();
  const sourceTimeUnix = BigInt(Math.floor(now.getTime() / 1000));

  for (const collection of COLLECTIONS) {
    await prisma.collection.upsert({
      where: { slug: collection.slug },
      create: { ...collection, isActive: true },
      update: {
        nameFa: collection.nameFa,
        nameEn: collection.nameEn,
        descriptionFa: collection.descriptionFa,
        descriptionEn: collection.descriptionEn,
        imageUrl: collection.imageUrl,
        displayOrder: collection.displayOrder,
        isActive: true,
      },
    });
  }

  const collections = await prisma.collection.findMany({
    select: { id: true, slug: true },
  });
  const collectionIds = new Map(collections.map(item => [item.slug, item.id]));

  for (const product of PRODUCTS) {
    const collectionId = collectionIds.get(product.collectionSlug);
    if (!collectionId) throw new Error(`Missing seeded collection: ${product.collectionSlug}`);

    const saved = await prisma.product.upsert({
      where: { slug: product.slug },
      create: {
        id: product.id,
        collectionId,
        slug: product.slug,
        sku: product.sku,
        nameFa: product.nameFa,
        nameEn: product.nameEn,
        descriptionFa: `اثر آزمایشی ${product.nameFa} برای محیط توسعه و تست الوریا.`,
        descriptionEn: `${product.nameEn} development and test fixture for Eloria.`,
        material: product.material,
        hasGold: product.material === "GOLD",
        hasSilver: product.material === "SILVER",
        goldComponentWeight: product.material === "GOLD" ? product.metalWeight : null,
        silverComponentWeight: product.material === "SILVER" ? product.metalWeight : null,
        metalWeight: product.metalWeight,
        purity: product.purity,
        purityFineness: product.purityFineness,
        pricingMode: "DYNAMIC",
        makingChargeType: product.makingChargeType,
        makingChargeFixed: "makingChargeFixed" in product ? product.makingChargeFixed : "0",
        makingChargePerGram: "makingChargePerGram" in product ? product.makingChargePerGram : "0",
        makingChargePercent: "makingChargePercent" in product ? product.makingChargePercent : "0",
        artisticFee: product.artisticFee,
        stock: product.stock,
        status: product.stock > 0 ? "ACTIVE" : "OUT_OF_STOCK",
        isFeatured: product.displayOrder === 10,
        displayOrder: product.displayOrder,
      },
      update: {
        collectionId,
        sku: product.sku,
        nameFa: product.nameFa,
        nameEn: product.nameEn,
        material: product.material,
        hasGold: product.material === "GOLD",
        hasSilver: product.material === "SILVER",
        goldComponentWeight: product.material === "GOLD" ? product.metalWeight : null,
        silverComponentWeight: product.material === "SILVER" ? product.metalWeight : null,
        metalWeight: product.metalWeight,
        purity: product.purity,
        purityFineness: product.purityFineness,
        pricingMode: "DYNAMIC",
        makingChargeType: product.makingChargeType,
        makingChargeFixed: "makingChargeFixed" in product ? product.makingChargeFixed : "0",
        makingChargePerGram: "makingChargePerGram" in product ? product.makingChargePerGram : "0",
        makingChargePercent: "makingChargePercent" in product ? product.makingChargePercent : "0",
        artisticFee: product.artisticFee,
        stock: product.stock,
        status: product.stock > 0 ? "ACTIVE" : "OUT_OF_STOCK",
        displayOrder: product.displayOrder,
      },
    });

    await prisma.productImage.deleteMany({ where: { productId: saved.id } });
    await prisma.productImage.create({
      data: {
        id: product.id.replace(/^2/, "3"),
        productId: saved.id,
        imageUrl: product.imageUrl,
        altFa: product.nameFa,
        altEn: product.nameEn,
        isPrimary: true,
        displayOrder: 0,
      },
    });
  }

  for (const guide of EDUCATIONAL_GUIDES) {
    await prisma.contentArticle.upsert({
      where: { slug: guide.slug },
      create: {
        slug: guide.slug,
        status: "PUBLISHED",
        origin: "MANUAL",
        titleFa: guide.titleFa,
        titleEn: guide.titleEn,
        excerptFa: guide.excerptFa,
        excerptEn: guide.excerptEn,
        contentFa: guide.contentFa,
        contentEn: guide.contentEn,
        seoTitleFa: `${guide.titleFa} | مجله الوریا`,
        seoTitleEn: `${guide.titleEn} | Eloria Journal`,
        seoDescriptionFa: guide.excerptFa,
        seoDescriptionEn: guide.excerptEn,
        focusKeywordFa: guide.keywordFa,
        focusKeywordEn: guide.keywordEn,
        publishedAt: now,
      },
      update: {
        status: "PUBLISHED",
        titleFa: guide.titleFa,
        titleEn: guide.titleEn,
        excerptFa: guide.excerptFa,
        excerptEn: guide.excerptEn,
        contentFa: guide.contentFa,
        contentEn: guide.contentEn,
        seoTitleFa: `${guide.titleFa} | مجله الوریا`,
        seoTitleEn: `${guide.titleEn} | Eloria Journal`,
        seoDescriptionFa: guide.excerptFa,
        seoDescriptionEn: guide.excerptEn,
        focusKeywordFa: guide.keywordFa,
        focusKeywordEn: guide.keywordEn,
        publishedAt: now,
      },
    });
  }

  await prisma.coupon.upsert({
    where: { code: "ELORIA50" },
    create: {
      code: "ELORIA50",
      titleFa: "هدیه ۵۰ هزار تومانی خرید اول الوریا",
      titleEn: "Eloria first-purchase 50,000 Toman gift",
      discountType: "FIXED_TOMAN",
      value: "50000",
      minSubtotalToman: "0",
      maxDiscountToman: null,
      perCustomerLimit: 1,
      firstPurchaseOnly: true,
      isActive: true,
    },
    update: {
      titleFa: "هدیه ۵۰ هزار تومانی خرید اول الوریا",
      titleEn: "Eloria first-purchase 50,000 Toman gift",
      discountType: "FIXED_TOMAN",
      value: "50000",
      maxDiscountToman: null,
      perCustomerLimit: 1,
      firstPurchaseOnly: true,
      isActive: true,
    },
  });

  const policies = [
    {
      id: "40000000-0000-4000-8000-000000000001",
      material: "GOLD" as const,
      referencePurity: 750,
      defaultProfitPercent: "7.000",
      defaultTaxPercent: "10.000",
      taxMetalValue: false,
      quoteTtlSeconds: 120,
      staleAfterMinutes: 15,
      closedMarketPricingEnabled: true,
      closedMarketMaxAgeMinutes: 14400,
      closedMarketSafetyMarginPercent: "3.000",
      roundingStep: 1000,
    },
    {
      id: "40000000-0000-4000-8000-000000000002",
      material: "SILVER" as const,
      referencePurity: 999,
      defaultProfitPercent: "12.000",
      defaultTaxPercent: "10.000",
      taxMetalValue: true,
      quoteTtlSeconds: 120,
      staleAfterMinutes: 30,
      closedMarketPricingEnabled: true,
      closedMarketMaxAgeMinutes: 14400,
      closedMarketSafetyMarginPercent: "5.000",
      roundingStep: 1000,
    },
  ];

  for (const policy of policies) {
    await prisma.pricingPolicy.upsert({
      where: { material: policy.material },
      create: { ...policy, isActive: true },
      update: { ...policy, isActive: true },
    });
  }

  const prices = [
    {
      id: "50000000-0000-4000-8000-000000000001",
      material: "GOLD" as const,
      pricePerGram: "6500000",
      referencePurity: 750,
      sourceSymbol: "TEST_GOLD_18K",
    },
    {
      id: "50000000-0000-4000-8000-000000000002",
      material: "SILVER" as const,
      pricePerGram: "115000",
      referencePurity: 999,
      sourceSymbol: "TEST_SILVER_999",
    },
  ];

  for (const price of prices) {
    const saved = await prisma.metalPrice.upsert({
      where: { material: price.material },
      create: {
        ...price,
        source: "ELORIA_TEST_SEED",
        sourceUnit: "toman/gram",
        sourceDate: now.toISOString().slice(0, 10),
        sourceTime: now.toISOString().slice(11, 19),
        sourceTimeUnix,
        fetchedAt: now,
        lastSuccessAt: now,
        rawPayload: { fixture: true },
      },
      update: {
        pricePerGram: price.pricePerGram,
        referencePurity: price.referencePurity,
        source: "ELORIA_TEST_SEED",
        sourceSymbol: price.sourceSymbol,
        sourceUnit: "toman/gram",
        sourceDate: now.toISOString().slice(0, 10),
        sourceTime: now.toISOString().slice(11, 19),
        sourceTimeUnix,
        fetchedAt: now,
        lastSuccessAt: now,
        lastError: null,
        rawPayload: { fixture: true },
      },
    });

    const fingerprint = createHash("sha256")
      .update(`${saved.material}:${saved.pricePerGram}:${sourceTimeUnix}`)
      .digest("hex");

    await prisma.metalPriceHistory.upsert({
      where: { fingerprint },
      create: {
        metalPriceId: saved.id,
        material: saved.material,
        pricePerGram: saved.pricePerGram,
        referencePurity: saved.referencePurity,
        source: saved.source,
        sourceSymbol: saved.sourceSymbol,
        sourceUnit: saved.sourceUnit,
        sourceDate: saved.sourceDate,
        sourceTime: saved.sourceTime,
        sourceTimeUnix: saved.sourceTimeUnix,
        fetchedAt: saved.fetchedAt,
        fingerprint,
        rawPayload: { fixture: true },
      },
      update: {},
    });
  }

  console.log(`Seeded ${COLLECTIONS.length} collections and ${PRODUCTS.length} products.`);
}

seed()
  .catch(error => {
    console.error("ELORIA seed failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
    await databasePool.end().catch(() => undefined);
  });

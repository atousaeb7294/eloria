export type EloriaGuardian = {
  id: "yalda" | "mahora" | "atousa" | "anahid" | "parnia" | "vista" | "raha";
  nameFa: string;
  nameEn: string;
  titleFa: string;
  titleEn: string;
  domainFa: string;
  domainEn: string;
  realmFa: string;
  realmEn: string;
  symbolFa: string;
  symbolEn: string;
  imageUrl: string;
  summaryFa: string;
  summaryEn: string;
  vowFa: string;
  vowEn: string;
};

/**
 * Canonical world data for every public page and every automatic product myth.
 * Keeping it in one file prevents the About page, Atelier and product stories
 * from gradually drifting into separate, contradictory worlds.
 */
export const ELORIA_GUARDIANS: readonly EloriaGuardian[] = [
  {
    id: "yalda",
    nameFa: "یلدا",
    nameEn: "Yalda",
    titleFa: "نگهبان رازهای پنهان",
    titleEn: "Keeper of Hidden Mysteries",
    domainFa: "راز",
    domainEn: "mystery",
    realmFa: "باغ‌های خاموش ماه",
    realmEn: "the Silent Gardens of the Moon",
    symbolFa: "پروانهٔ شب",
    symbolEn: "night moth",
    imageUrl: "/images/guardians/yalda.jpg",
    summaryFa:
      "یلدا نخستین کسی بود که صدای خاطرات فراموش‌شده را شنید؛ او رازهای گمشده را از میان سایه‌ها به درخت خاطره‌ها بازمی‌گرداند.",
    summaryEn:
      "Yalda was the first to hear forgotten memories and returns lost truths from the shadows to the Tree of Memories.",
    vowFa: "هر رازی که جهان فراموش کند، ابتدا به گوش یلدا می‌رسد.",
    vowEn: "Every secret the world forgets first reaches Yalda.",
  },
  {
    id: "mahora",
    nameFa: "ماهورا",
    nameEn: "Mahoora",
    titleFa: "نگهبان رویا و زیبایی",
    titleEn: "Keeper of Dreams and Beauty",
    domainFa: "رویا",
    domainEn: "dream",
    realmFa: "قصرهای آسمانی",
    realmEn: "the Sky Palaces",
    symbolFa: "پرندهٔ ماه",
    symbolEn: "moon bird",
    imageUrl: "/images/guardians/mahora.jpg",
    summaryFa:
      "ماهورا نگهبان رویاهایی است که هنوز فرصت تولد نیافته‌اند؛ نور ماه او خیال‌های خاموش را دوباره بیدار می‌کند.",
    summaryEn:
      "Mahoora protects dreams that have not yet had a chance to be born; her moonlight wakes silent imaginings.",
    vowFa:
      "هر رویایی که در قلب کسی زنده مانده باشد، نوری از ماهورا در خود دارد.",
    vowEn: "Every dream alive in a heart carries a light from Mahoora.",
  },
  {
    id: "atousa",
    nameFa: "آتوسا",
    nameEn: "Atossa",
    titleFa: "نگهبان اصالت و میراث",
    titleEn: "Keeper of Heritage and Memory",
    domainFa: "میراث",
    domainEn: "heritage",
    realmFa: "تالارهای سیمرغ",
    realmEn: "the Halls of the Simurgh",
    symbolFa: "سیمرغ",
    symbolEn: "Simurgh",
    imageUrl: "/images/guardians/atousa.jpg",
    summaryFa:
      "آتوسا حافظ تمدن‌های فراموش‌شده، هنرهای باستانی و داستان‌هایی است که نسل‌ها از مادران به فرزندان رسیده‌اند.",
    summaryEn:
      "Atossa safeguards forgotten civilizations, ancient arts and stories passed from mothers to children.",
    vowFa: "ملتی که گذشتهٔ خود را فراموش کند، مسیر آینده‌اش را گم خواهد کرد.",
    vowEn: "A people who forget their past will lose the road to their future.",
  },
  {
    id: "anahid",
    nameFa: "آناهید",
    nameEn: "Anahid",
    titleFa: "نگهبان زندگی و احساس",
    titleEn: "Keeper of Life and Feeling",
    domainFa: "زندگی",
    domainEn: "life",
    realmFa: "چشمه‌های زنده",
    realmEn: "the Living Springs",
    symbolFa: "نیلوفر آبی",
    symbolEn: "blue lotus",
    imageUrl: "/images/guardians/anahid.jpg",
    summaryFa:
      "آناهید از سرچشمه‌های زندهٔ الوریا برخاست؛ او رودها، باغ‌ها و قلب‌های شکسته را پاس می‌دارد.",
    summaryEn:
      "Anahid rose from Eloria’s living springs and protects rivers, gardens and broken hearts.",
    vowFa: "تا زمانی که یک گل در الوریا شکوفه دهد، زندگی هنوز پیروز است.",
    vowEn: "As long as a flower blooms in Eloria, life still prevails.",
  },
  {
    id: "parnia",
    nameFa: "پرنیا",
    nameEn: "Parnia",
    titleFa: "نگهبان هنر دست",
    titleEn: "Keeper of Handmade Art",
    domainFa: "هنر",
    domainEn: "craft",
    realmFa: "کارگاه تارهای طلایی",
    realmEn: "the Workshop of Golden Threads",
    symbolFa: "تارهای طلایی",
    symbolEn: "golden threads",
    imageUrl: "/images/guardians/parnia.jpg",
    summaryFa:
      "پرنیا باور دارد هر چیز ساخته‌شده با عشق روحی درون خود دارد؛ او گره، بافت و یادگارهای دست‌ساز را زنده نگه می‌دارد.",
    summaryEn:
      "Parnia believes every object made with love has a spirit; she keeps knots, weaving and handmade keepsakes alive.",
    vowFa:
      "هر گره‌ای که با عشق زده شود، داستانی برای همیشه در خود نگه می‌دارد.",
    vowEn: "Every knot tied with love keeps a story forever.",
  },
  {
    id: "vista",
    nameFa: "ویستا",
    nameEn: "Vista",
    titleFa: "نگهبان خرد و کشف رازها",
    titleEn: "Keeper of Wisdom and Discovery",
    domainFa: "خرد",
    domainEn: "wisdom",
    realmFa: "کتابخانه‌های نور",
    realmEn: "the Libraries of Light",
    symbolFa: "جغد دانا",
    symbolEn: "wise owl",
    imageUrl: "/images/guardians/vista.jpg",
    summaryFa:
      "ویستا بزرگ‌ترین جستجوگر دانش است و در کتابخانه‌های نور، نشانه‌های گذشته و آینده را می‌خواند.",
    summaryEn:
      "Vista is Eloria’s greatest seeker of knowledge, reading signs of past and future in the Libraries of Light.",
    vowFa: "دانش، نوری است که حتی تاریکی از آن فرار می‌کند.",
    vowEn: "Knowledge is a light from which even darkness flees.",
  },
  {
    id: "raha",
    nameFa: "رها",
    nameEn: "Raha",
    titleFa: "نگهبان آزادی و آفرینش",
    titleEn: "Keeper of Freedom and Creation",
    domainFa: "آزادی",
    domainEn: "freedom",
    realmFa: "گذرگاه باد",
    realmEn: "the Wind Passage",
    symbolFa: "پرندهٔ مهاجر",
    symbolEn: "migrating bird",
    imageUrl: "/images/guardians/raha.jpg",
    summaryFa:
      "رها روح آزاد الوریاست؛ او بر بادها فرمان می‌راند، راه‌های بسته را می‌گشاید و آغازهای تازه را محافظت می‌کند.",
    summaryEn:
      "Raha is the free spirit of Eloria, ruling the winds, opening closed roads and guarding new beginnings.",
    vowFa: "آزادی، اولین قدم هر داستان تازه است.",
    vowEn: "Freedom is the first step of every new story.",
  },
] as const;

export const ELORIA_MOTHER_LEGEND = {
  id: "seven-guardians-first-covenant",
  titleFa: "افسانهٔ کهن الوریا؛ هفت نگهبان و پیمان نخستین",
  titleEn:
    "The Ancient Legend of Eloria: The Seven Guardians and the First Covenant",
  introductionFa:
    "در آغاز زمان، پیش از آن‌که انسان‌ها داستان‌های خود را روی کاغذ بنویسند، سرزمینی میان جهان انسان‌ها و قلمرو رویاها وجود داشت؛ سرزمینی پنهان میان مه‌های جاودان که بعدها الوریا نام گرفت.",
  treeFa:
    "در قلب آن، درخت خاطره‌ها ریشه داشت؛ ریشه‌هایش در نخستین خاک جهان و شاخه‌هایش میان ستارگان بود. بر برگ‌های آن خاطرات تمام موجودات نوشته می‌شد: داستان پادشاهان، آواز کودکان، عشق‌ها، شکست‌ها و امیدهای انسان‌ها.",
  conflictFa:
    "روزی سایهٔ بی‌نام از دل فراموشی برخاست تا همهٔ خاطرات جهان را پاک کند. او به درخت خاطره‌ها تاخت و هفت شاخهٔ اصلی آن را شکست: راز، رویا، میراث، زندگی، هنر، خرد و آزادی.",
  covenantFa:
    "در آخرین لحظه، نگهبان نخستین هفت انسان شایسته را فراخواند و نیروی هر شاخه را به آنان سپرد. آن هفت تن دست بر ریشه‌های درخت گذاشتند و پیمان بستند: «تا زمانی که یک انسان داستانی برای گفتن و یک قلب امیدی برای نگه داشتن داشته باشد، الوریا هرگز نخواهد مرد.» از آن شب هفت نور در آسمان پدیدار شد؛ اما کتاب‌های ممنوعه هشدار می‌دهند که سایهٔ بی‌نام بازخواهد گشت و هفت نگهبان باید آخرین خاطرهٔ جهان را نجات دهند.",
  introductionEn:
    "At the beginning of time, before people wrote their stories on paper, a land existed between the human world and the realm of dreams. Hidden among eternal mists, it would become Eloria.",
  treeEn:
    "At its heart grew the Tree of Memories. Its roots reached the first soil of the world and its branches reached the stars. Its leaves held the memories of every being: rulers, children’s songs, love, loss and hope.",
  conflictEn:
    "One day the Nameless Shadow rose from oblivion to erase every memory. It attacked the Tree of Memories and broke its seven great branches: mystery, dream, heritage, life, craft, wisdom and freedom.",
  covenantEn:
    "At the final moment, the First Keeper called seven worthy women and gave each the strength of a branch. They placed their hands on the roots and vowed that Eloria would never die while one human still had a story to tell and one heart still kept hope. Seven lights appeared in the sky; yet forbidden books warn that the Nameless Shadow will return and the Guardians must save the world’s last memory.",
} as const;

export function guardianByName(
  name: string | null | undefined,
): EloriaGuardian | null {
  return (
    ELORIA_GUARDIANS.find(
      (guardian) => guardian.nameFa === name || guardian.nameEn === name,
    ) ?? null
  );
}

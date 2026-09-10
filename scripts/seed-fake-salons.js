// scripts/seed-fake-salons.js
//
// ۲۰ سالن نمایشی (فیک) به دیتابیس اضافه می‌کند تا صفحه اصلی اپ خالی نباشد.
// همه‌شان در استان/شهر تهران هستند، هرکدام در یک محله‌ی متفاوت (زعفرانیه،
// نیاوران، تجریش، ونک، سعادت‌آباد و ...) تا هم روی فیلتر «محله» صفحه اصلی
// پخش باشند و هم شبیه ۲۰ کسب‌وکار واقعی و متفاوت به‌نظر برسند.
//
// هر سالن یک کاربر «صاحب» جعلی جداگانه دارد (چون هر کاربر واقعی فقط می‌تواند
// یک کسب‌وکار داشته باشد) با شماره موبایل 0900000XXXX — این پیش‌شماره واقعی
// نیست و عمداً انتخاب شده تا بعداً به‌راحتی سالن‌های فیک را از سالن‌های واقعی
// تشخیص بدهید و حذفشان کنید.
//
// شماره موبایل ادمین (09109827633) به‌عنوان «مدیر» هر ۲۰ سالن اضافه می‌شود؛
// یعنی با همون حساب ادمین، از طریق سوییچر سالن در صفحه‌ی «سالن من» می‌توانید
// وارد هرکدام از این سالن‌های فیک بشوید و مثل صاحبشان ببینید/ویرایش کنید.
//
// --- اجرا ---
//   node scripts/seed-fake-salons.js
// (اگر DATABASE_URL را در متغیرهای محیطی ندارید، این اسکریپت خودش تلاش
//  می‌کند آن را از فایل .env یا .env.local در ریشه‌ی پروژه بخواند.)
//
// این اسکریپت هیچ درخواست اینترنتی نمی‌زند (چون هاست به API‌های عکسِ
// خارجی مثل Pexels/Unsplash دسترسی ندارد). قبل از اجرا باید خودتان چند
// عکس واقعی سالن زیبایی دانلود کرده و در public/images/fake-salons/<دسته>/
// گذاشته باشید. جزئیات کامل کمی پایین‌تر، بالای بخش «تصاویر واقعی از
// فایل‌های لوکال پروژه» را ببینید.
//
// --- حذف بعدی ---
// راه ۱ (توصیه‌شده، یکجا): node scripts/remove-fake-salons.js
// راه ۲ (تکی از پنل ادمین): پنل مدیریت > سالن‌ها > فیلتر «همه» > باز کردن
//   سالن > دکمه‌ی «حذف کامل سالن». شماره صاحبِ سالن‌های فیک با 0900000 شروع
//   می‌شود، همان‌جا مشخصه.

const fs = require('fs');
const path = require('path');

// اگر DATABASE_URL از قبل ست نشده، از .env / .env.local بخوانش
if (!process.env.DATABASE_URL) {
  for (const envFile of ['.env', '.env.local']) {
    const envPath = path.join(process.cwd(), envFile);
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const idx = trimmed.indexOf('=');
        if (idx === -1) continue;
        const key = trimmed.slice(0, idx).trim();
        let value = trimmed.slice(idx + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = value;
      }
    }
  }
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ADMIN_PHONE = '09109827633';
const FAKE_PHONE_PREFIX = '0900000'; // + ۴ رقم شماره‌ترتیبی = ۱۱ رقم کامل

const tag = (name, category) => ({ name, category });

const salonsData = [
  {
    name: 'سالن زیبایی رز طلایی',
    province: 'تهران', city: 'تهران', neighborhood: 'زعفرانیه',
    address: 'تهران، زعفرانیه، خیابان ولیعصر، پلاک ۱۲',
    workingHours: '۱۰:۰۰ صبح تا ۲۰:۰۰ شب', closedDays: ['جمعه'],
    genderAudience: 'FEMALE', hasHomeService: true,
    tags: [tag('کوتاهی ژورنالی', 'خدمات مو'), tag('رنگ، لایت و مش', 'خدمات مو'), tag('کاشت ناخن (پودر/ژل)', 'خدمات ناخن'), tag('میکاپ محفلی (VIP/ویژه)', 'خدمات آرایش و میکاپ')],
    description: 'سالن زیبایی رز طلایی با کادری مجرب و فضایی آرام، خدمات مو، ناخن و آرایش را با بهترین برندها ارائه می‌دهد.',
    rating: 4.8, reviewsCount: 142, instagram: 'rose_talaei_salon',
  },
  {
    name: 'سالن عروس ماهور',
    province: 'تهران', city: 'تهران', neighborhood: 'تجریش',
    address: 'تهران، تجریش، خیابان دربند، پلاک ۴۵',
    workingHours: '۱۰:۰۰ صبح تا ۲۱:۰۰ شب', closedDays: ['جمعه'],
    genderAudience: 'FEMALE', hasHomeService: true,
    tags: [tag('پکیج کامل عروس (VIP)', 'پکیج‌های عروس'), tag('میکاپ و شینیون عروس', 'پکیج‌های عروس'), tag('شینیون و استایل مو', 'خدمات مو'), tag('لیفت و لمینت مژه', 'خدمات ابرو و مژه')],
    description: 'سالن عروس ماهور، انتخاب ایده‌آل عروس خانم‌ها برای یک روز به‌یادماندنی، از میکاپ تا شینیون.',
    rating: 4.9, reviewsCount: 210, instagram: 'mahour_bride',
  },
  {
    name: 'کلینیک پوست و مو درسا',
    province: 'تهران', city: 'تهران', neighborhood: 'ولنجک',
    address: 'تهران، ولنجک، خیابان دانشجو، پلاک ۲۵',
    workingHours: '۰۹:۰۰ صبح تا ۱۹:۰۰ شب', closedDays: ['جمعه'],
    genderAudience: 'BOTH', hasHomeService: false,
    tags: [tag('فیشیال و پاکسازی تخصصی', 'خدمات پوست و زیبایی'), tag('میکرودرم و میکرونیدلینگ', 'خدمات پوست و زیبایی'), tag('درمان لک و جوش', 'خدمات پوست و زیبایی')],
    description: 'کلینیک درسا با تجهیزات روز دنیا، خدمات تخصصی پوست و مو را زیر نظر کارشناسان مجرب ارائه می‌دهد.',
    rating: 4.7, reviewsCount: 176, instagram: 'dorsa_skin_clinic',
  },
  {
    name: 'سالن زیبایی نگین مشرق',
    province: 'تهران', city: 'تهران', neighborhood: 'فرمانیه',
    address: 'تهران، فرمانیه، خیابان شهید لواسانی، پلاک ۱۰',
    workingHours: '۱۰:۰۰ صبح تا ۲۰:۰۰ شب', closedDays: ['پنج‌شنبه', 'جمعه'],
    genderAudience: 'FEMALE', hasHomeService: false,
    tags: [tag('ژلیش (لاک ژل)', 'خدمات ناخن'), tag('طراحی و دیزاین ناخن', 'خدمات ناخن'), tag('اکستنشن مژه (کلاسیک/والیوم/مگاوالیوم)', 'خدمات ابرو و مژه')],
    description: 'سالن نگین مشرق، تخصصی‌ترین مرکز ناخن و مژه با متریال باکیفیت.',
    rating: 4.5, reviewsCount: 87, instagram: 'negin_mashregh',
  },
  {
    name: 'مرکز ناخن و مژه لیلیوم',
    province: 'تهران', city: 'تهران', neighborhood: 'سعادت آباد',
    address: 'تهران، سعادت‌آباد، بلوار دریا، مجتمع تجاری ستاره',
    workingHours: '۱۰:۰۰ صبح تا ۲۰:۰۰ شب', closedDays: ['جمعه'],
    genderAudience: 'FEMALE', hasHomeService: false,
    tags: [tag('کاشت ناخن (پودر/ژل)', 'خدمات ناخن'), tag('لمینت ناخن', 'خدمات ناخن'), tag('کاشت مژه موقت', 'خدمات ابرو و مژه')],
    description: 'مرکز لیلیوم با بیش از ۸ سال سابقه، مرجع تخصصی کاشت ناخن و مژه.',
    rating: 4.6, reviewsCount: 134, instagram: 'lilium_nailbar',
  },
  {
    name: 'سالن زیبایی بانو',
    province: 'تهران', city: 'تهران', neighborhood: 'شهرک غرب',
    address: 'تهران، شهرک غرب، بلوار دادمان، کوچه بهار',
    workingHours: '۰۹:۳۰ صبح تا ۱۹:۳۰ شب', closedDays: ['جمعه'],
    genderAudience: 'FEMALE', hasHomeService: true,
    tags: [tag('رنگ، لایت و مش', 'خدمات مو'), tag('کراتینه و احیا مو', 'خدمات مو'), tag('ماساژ صورت', 'خدمات پوست و زیبایی')],
    description: 'سالن بانو با تمرکز بر رنگ و احیای مو، همراه با محصولات ارگانیک و باکیفیت.',
    rating: 4.4, reviewsCount: 65, instagram: 'banoo_beauty',
  },
  {
    name: 'سالن زیبایی گلبرگ',
    province: 'تهران', city: 'تهران', neighborhood: 'ستارخان',
    address: 'تهران، ستارخان، خیابان زنجان، نبش کوچه مطهری',
    workingHours: '۱۰:۰۰ صبح تا ۲۰:۰۰ شب', closedDays: ['جمعه'],
    genderAudience: 'FEMALE', hasHomeService: true,
    tags: [tag('اپیلاسیون کل بدن', 'موزدایی و بدن'), tag('وکس صورت', 'موزدایی و بدن'), tag('لیزر موهای زائد', 'موزدایی و بدن')],
    description: 'سالن گلبرگ، مرکز تخصصی موزدایی و لیزر با دستگاه‌های به‌روز.',
    rating: 4.7, reviewsCount: 158, instagram: 'golbarg_beauty',
  },
  {
    name: 'سالن تخصصی مو و رنگ آوا',
    province: 'تهران', city: 'تهران', neighborhood: 'شهرآرا',
    address: 'تهران، شهرآرا، خیابان سیمای ایران، پلاک ۳',
    workingHours: '۱۰:۰۰ صبح تا ۲۰:۰۰ شب', closedDays: ['جمعه'],
    genderAudience: 'FEMALE', hasHomeService: false,
    tags: [tag('بالیاژ و آمبره', 'خدمات مو'), tag('پروتئین‌تراپی و بوتاکس مو', 'خدمات مو'), tag('اکستنشن مو', 'خدمات مو')],
    description: 'سالن آوا، متخصص رنگ و تکنیک‌های روز دنیا در حوزه‌ی مو.',
    rating: 4.6, reviewsCount: 121, instagram: 'ava_haircolor',
  },
  {
    name: 'مرکز زیبایی ویولت',
    province: 'تهران', city: 'تهران', neighborhood: 'ونک',
    address: 'تهران، ونک، خیابان ملاصدرا، خیابان شیخ بهایی',
    workingHours: '۰۹:۳۰ صبح تا ۱۹:۰۰ شب', closedDays: ['پنج‌شنبه', 'جمعه'],
    genderAudience: 'BOTH', hasHomeService: false,
    tags: [tag('ماساژ ریلکسی', 'خدمات ماساژ و اسپا'), tag('اسپا و حمام مغربی', 'خدمات ماساژ و اسپا')],
    description: 'مرکز ویولت، مقصدی آرام برای ماساژ و اسپا در قلب تهران.',
    rating: 4.8, reviewsCount: 93, instagram: 'violet_spa',
  },
  {
    name: 'سالن زیبایی ارکیده',
    province: 'تهران', city: 'تهران', neighborhood: 'جردن',
    address: 'تهران، جردن، بالاتر از میرداماد، پلاک ۶۰',
    workingHours: '۱۰:۰۰ صبح تا ۲۰:۳۰ شب', closedDays: ['جمعه'],
    genderAudience: 'FEMALE', hasHomeService: true,
    tags: [tag('کوتاهی ژورنالی', 'خدمات مو'), tag('ژلیش (لاک ژل)', 'خدمات ناخن'), tag('میکاپ محفلی (VIP/ویژه)', 'خدمات آرایش و میکاپ')],
    description: 'سالن ارکیده، خدمات کامل زیبایی زیر یک سقف با قیمت مناسب.',
    rating: 4.5, reviewsCount: 104, instagram: 'orchid_beauty_tehran',
  },
  {
    name: 'سالن ناخن نیلای',
    province: 'تهران', city: 'تهران', neighborhood: 'میرداماد',
    address: 'تهران، میرداماد، نرسیده به مدرس، پلاک ۶',
    workingHours: '۱۰:۰۰ صبح تا ۲۰:۰۰ شب', closedDays: ['جمعه'],
    genderAudience: 'FEMALE', hasHomeService: false,
    tags: [tag('کاشت ناخن (پودر/ژل)', 'خدمات ناخن'), tag('پدیکور و کفسابی', 'خدمات ناخن'), tag('مانیکور', 'خدمات ناخن')],
    description: 'سالن نیلای، دقیق و باسلیقه در خدمات ناخن با محصولات اورجینال.',
    rating: 4.6, reviewsCount: 88, instagram: 'nilay_nails',
  },
  {
    name: 'سالن زیبایی درین',
    province: 'تهران', city: 'تهران', neighborhood: 'دروس',
    address: 'تهران، دروس، خیابان کاج، نرسیده به میدان قدس',
    workingHours: '۱۰:۰۰ صبح تا ۲۰:۰۰ شب', closedDays: ['جمعه'],
    genderAudience: 'FEMALE', hasHomeService: true,
    tags: [tag('رنگ، لایت و مش', 'خدمات مو'), tag('اصلاح و قرینه‌سازی ابرو', 'خدمات ابرو و مژه'), tag('فیشیال و پاکسازی تخصصی', 'خدمات پوست و زیبایی')],
    description: 'سالن درین، خدمات تخصصی مو، ابرو و پوست با محیطی دنج و دوستانه.',
    rating: 4.7, reviewsCount: 119, instagram: 'darin_beauty_tehran',
  },
  {
    name: 'مرکز زیبایی و اسپا مارال',
    province: 'تهران', city: 'تهران', neighborhood: 'نارمک',
    address: 'تهران، نارمک، میدان هروی، خیابان فرجام',
    workingHours: '۱۰:۰۰ صبح تا ۲۱:۰۰ شب', closedDays: ['جمعه'],
    genderAudience: 'BOTH', hasHomeService: false,
    tags: [tag('ماساژ درمانی', 'خدمات ماساژ و اسپا'), tag('ماساژ سنگ داغ', 'خدمات ماساژ و اسپا'), tag('اپیلاسیون گیاهی / پیشرفته', 'موزدایی و بدن')],
    description: 'مارال، مرکز اسپا و ماساژ درمانی برای آرامش کامل بدن و ذهن.',
    rating: 4.8, reviewsCount: 145, instagram: 'maral_spa_tehran',
  },
  {
    name: 'سالن زیبایی الماس',
    province: 'تهران', city: 'تهران', neighborhood: 'یوسف آباد',
    address: 'تهران، یوسف‌آباد، خیابان فتحی شقاقی، پلاک ۲۲',
    workingHours: '۰۹:۰۰ صبح تا ۱۹:۰۰ شب', closedDays: ['جمعه'],
    genderAudience: 'FEMALE', hasHomeService: false,
    tags: [tag('کوتاهی ژورنالی', 'خدمات مو'), tag('کراتینه و احیا مو', 'خدمات مو')],
    description: 'سالن الماس، خدمات مو با جدیدترین تکنیک‌های احیا و ترمیم.',
    rating: 4.3, reviewsCount: 54, instagram: 'almas_beauty',
  },
  {
    name: 'سالن زیبایی بهار نارنج',
    province: 'تهران', city: 'تهران', neighborhood: 'امیرآباد',
    address: 'تهران، امیرآباد، خیابان کارگر شمالی، پلاک ۹',
    workingHours: '۱۰:۰۰ صبح تا ۲۰:۰۰ شب', closedDays: ['جمعه'],
    genderAudience: 'FEMALE', hasHomeService: true,
    tags: [tag('میکاپ محفلی (VIP/ویژه)', 'خدمات آرایش و میکاپ'), tag('آرایش دائم (خط چشم، شیدینگ لب)', 'خدمات آرایش و میکاپ'), tag('لیفت ابرو', 'خدمات ابرو و مژه')],
    description: 'سالن بهار نارنج، تخصصی‌ترین مرکز میکاپ و آرایش دائم.',
    rating: 4.6, reviewsCount: 99, instagram: 'bahar_narenj_tehran',
  },
  {
    name: 'سالن زیبایی ستاره',
    province: 'تهران', city: 'تهران', neighborhood: 'بهجت آباد',
    address: 'تهران، بهجت‌آباد، خیابان شهید گمنام، پلاک ۵',
    workingHours: '۱۰:۰۰ صبح تا ۱۹:۳۰ شب', closedDays: ['پنج‌شنبه', 'جمعه'],
    genderAudience: 'FEMALE', hasHomeService: false,
    tags: [tag('ژلیش (لاک ژل)', 'خدمات ناخن'), tag('ترمیم ناخن', 'خدمات ناخن')],
    description: 'سالن ستاره، خدمات باکیفیت ناخن با قیمت مناسب.',
    rating: 4.4, reviewsCount: 61, instagram: 'setareh_beauty',
  },
];

// (سالن‌های آقایون از این لیست حذف شدند؛ طول این آرایه دیگر لزوماً ۲۰ نیست)
if (salonsData.length === 0) {
  throw new Error('لیست سالن‌های فیک خالی است');
}

// --- تصاویر واقعی از فایل‌های لوکال پروژه ---
// چون هاست دسترسی به Pexels/Unsplash و امثالش رو فیلتر می‌کند، اینجا
// اسکریپت هیچ درخواست اینترنتی نمی‌زند؛ عکس‌ها را از پوشه‌ی
//   public/images/fake-salons/<دسته>/
// می‌خواند. شما باید از قبل، برای هر دسته، چندتا عکس واقعی حرفه‌ای دانلود
// کرده و در پوشه‌ی همان دسته گذاشته باشید (از روی سیستم خودتان که فیلتر
// نیست — مثلاً از همون pexels.com — دانلود کنید، بعد commit/push/pull کنید).
//
// دسته‌ها و حداقل تعداد پیشنهادی عکس در هر پوشه (هرچی بیشتر، تنوع بیشتر؛
// اگر عکس کمتر بود، اسکریپت خودش می‌چرخد و از اول استفاده می‌کند):
//   public/images/fake-salons/hair/     (سالن مو)      — حداقل ۸ عکس
//   public/images/fake-salons/nails/    (سالن ناخن)    — حداقل ۶ عکس
//   public/images/fake-salons/spa/      (اسپا/ماساژ)   — حداقل ۴ عکس
//   public/images/fake-salons/bridal/   (آرایش عروس)   — حداقل ۴ عکس
//   public/images/fake-salons/skin/     (پوست/فیشیال)  — حداقل ۴ عکس
//   public/images/fake-salons/waxing/   (موزدایی)      — حداقل ۴ عکس
//   public/images/fake-salons/makeup/   (آرایش/میکاپ)  — حداقل ۴ عکس
//   public/images/fake-salons/lashes/   (مژه/ابرو)     — حداقل ۴ عکس
// فرمت: jpg / jpeg / png / webp

const FAKE_SALON_IMAGES_DIR = path.join(process.cwd(), 'public', 'images', 'fake-salons');
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

// نگاشت دسته‌ی تگ به پوشه‌ی عکس — بر اساس اولین (اصلی‌ترین) تگ هر سالن
const TAG_CATEGORY_TO_FOLDER = {
  'پکیج‌های عروس': 'bridal',
  'خدمات ماساژ و اسپا': 'spa',
  'موزدایی و بدن': 'waxing',
  'خدمات پوست و زیبایی': 'skin',
  'خدمات ناخن': 'nails',
  'خدمات آرایش و میکاپ': 'makeup',
  'خدمات ابرو و مژه': 'lashes',
  'خدمات مو': 'hair',
};

function getCategoryKey(s) {
  const primaryCategory = s.tags[0]?.category;
  return TAG_CATEGORY_TO_FOLDER[primaryCategory] || 'hair';
}

// لیست عکس‌های هر پوشه‌ی دسته را یک‌بار از دیسک می‌خواند و کش می‌کند —
// مرتب‌شده باشد تا هر بار اجرای اسکریپت همان ترتیب/تخصیص قبلی تکرار شود.
const photoPoolCache = {};

function getPhotoPool(categoryKey) {
  if (photoPoolCache[categoryKey]) return photoPoolCache[categoryKey];

  const dirPath = path.join(FAKE_SALON_IMAGES_DIR, categoryKey);
  let files;
  try {
    files = fs.readdirSync(dirPath);
  } catch (err) {
    throw new Error(
      `پوشه‌ی عکس برای دسته‌ی «${categoryKey}» پیدا نشد: ${dirPath}\n` +
      `قبل از اجرای اسکریپت باید چند عکس واقعی سالن در این پوشه بگذارید.`
    );
  }

  const pool = files
    .filter((f) => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()))
    .sort()
    .map((f) => `/images/fake-salons/${categoryKey}/${f}`);

  if (pool.length === 0) {
    throw new Error(
      `پوشه‌ی «${dirPath}» هیچ عکس معتبری (jpg/jpeg/png/webp) ندارد. ` +
      `قبل از اجرای اسکریپت باید چند عکس واقعی سالن در این پوشه بگذارید.`
    );
  }

  photoPoolCache[categoryKey] = pool;
  return pool;
}

// فقط کاور اصلی مهم است که بین سالن‌های هم‌دسته تکراری نشود: به‌ازای هر
// دسته یک شمارنده نگه می‌داریم که هر سالن جدید ۱ واحد جلوتر از پول عکس‌ها
// کاور می‌گیرد. نمونه‌کارها (portfolio) اهمیتی ندارد تکراری باشند، پس
// همیشه از ابتدای پول همان دسته گرفته می‌شوند.
const categoryMainIndex = {};

function getSalonPhotos(s) {
  const categoryKey = getCategoryKey(s);
  const pool = getPhotoPool(categoryKey);

  const mainIdx = categoryMainIndex[categoryKey] || 0;
  categoryMainIndex[categoryKey] = mainIdx + 1;
  const main = pool[mainIdx % pool.length];

  const portfolio = [pool[0], pool[1] || pool[0], pool[2] || pool[0]];

  return { main, portfolio };
}



async function main() {
  const farFuture = new Date();
  farFuture.setFullYear(farFuture.getFullYear() + 100);

  let created = 0;

  for (let i = 0; i < salonsData.length; i++) {
    const s = salonsData[i];
    const index = i + 1;
    const ownerPhone = `${FAKE_PHONE_PREFIX}${String(index).padStart(4, '0')}`;
    const photos = getSalonPhotos(s);

    const owner = await prisma.user.upsert({
      where: { phone: ownerPhone },
      update: {},
      create: {
        phone: ownerPhone,
        name: `صاحب کسب‌وکار دمو ${index}`,
        role: 'USER',
      },
    });

    // اگر قبلاً برای این کاربرِ فیک سالنی ساخته شده (اجرای دوباره‌ی اسکریپت)، رد شو
    const existingSalon = await prisma.salon.findUnique({ where: { userId: owner.id } });
    if (existingSalon) continue;

    const salon = await prisma.salon.create({
      data: {
        name: s.name,
        province: s.province,
        city: s.city,
        neighborhoods: [s.neighborhood],
        address: s.address,
        phones: [`0912${String(index).padStart(7, '0')}`],
        workingHours: s.workingHours,
        closedDays: s.closedDays,
        hasHomeService: s.hasHomeService,
        genderAudience: s.genderAudience,
        cardNumber: '',
        tags: s.tags,
        imageUrl: photos.main,
        description: s.description,
        portfolios: photos.portfolio,
        status: 'ACTIVE',
        planId: null,
        subscriptionExpiresAt: farFuture,
        // صفر تا حس فیک‌بودن (امتیاز/نظرات ساختگی) نداشته باشه
        rating: 0,
        reviewsCount: 0,
        userId: owner.id,
        socials: {
          create: {
            instagram: s.instagram,
          },
        },
        managers: {
          create: {
            phone: ADMIN_PHONE,
            label: 'دسترسی ادمین (سالن دمو)',
          },
        },
      },
    });

    created++;
    console.log(`✅ ساخته شد: ${salon.name} (${s.city}) — صاحب: ${ownerPhone}`);
  }

  console.log(`\nتمام شد. ${created} سالن فیک جدید اضافه شد (از ۲۰ تا).`);
  if (created < salonsData.length) {
    console.log('بقیه از اجرای قبلی این اسکریپت از قبل وجود داشتند و رد شدند.');
  }
}

main()
  .catch((err) => {
    console.error('❌ خطا در ساخت سالن‌های فیک:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
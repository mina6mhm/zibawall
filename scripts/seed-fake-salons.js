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
    name: 'آرایشگاه مردانه کاپیتان',
    province: 'تهران', city: 'تهران', neighborhood: 'نیاوران',
    address: 'تهران، نیاوران، خیابان کامرانیه، پلاک ۸',
    workingHours: '۰۹:۰۰ صبح تا ۲۲:۰۰ شب', closedDays: [],
    genderAudience: 'MALE', hasHomeService: false,
    tags: [tag('کوتاهی ژورنالی', 'خدمات مو'), tag('براشینگ', 'خدمات مو')],
    description: 'آرایشگاه مردانه کاپیتان، متخصص اصلاح مو و ریش با جدیدترین متدهای روز.',
    rating: 4.6, reviewsCount: 98, instagram: 'captain_barbershop',
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
    name: 'آرایشگاه مردانه الیت',
    province: 'تهران', city: 'تهران', neighborhood: 'گیشا',
    address: 'تهران، گیشا، خیابان نهم، پلاک ۱۴',
    workingHours: '۰۹:۰۰ صبح تا ۲۲:۰۰ شب', closedDays: [],
    genderAudience: 'MALE', hasHomeService: false,
    tags: [tag('کوتاهی ژورنالی', 'خدمات مو'), tag('اصلاح و قرینه‌سازی ابرو', 'خدمات ابرو و مژه')],
    description: 'آرایشگاه الیت، فضایی مدرن برای آقایانی که به ظاهرشان اهمیت می‌دهند.',
    rating: 4.5, reviewsCount: 112, instagram: 'elite_men_salon',
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
    name: 'آرایشگاه مردانه رویال',
    province: 'تهران', city: 'تهران', neighborhood: 'پاسداران',
    address: 'تهران، پاسداران، خیابان گلستان، پلاک ۱۸',
    workingHours: '۰۹:۰۰ صبح تا ۲۱:۰۰ شب', closedDays: [],
    genderAudience: 'MALE', hasHomeService: false,
    tags: [tag('کوتاهی ژورنالی', 'خدمات مو'), tag('براشینگ', 'خدمات مو')],
    description: 'آرایشگاه رویال، تجربه‌ای متفاوت از اصلاح و پیرایش مردانه.',
    rating: 4.4, reviewsCount: 76, instagram: 'royal_men_tehran',
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
  {
    name: 'آرایشگاه مردانه پرشین',
    province: 'تهران', city: 'تهران', neighborhood: 'پونک',
    address: 'تهران، پونک، بلوار فردوس شرق، پلاک ۳۰',
    workingHours: '۰۹:۰۰ صبح تا ۲۱:۳۰ شب', closedDays: [],
    genderAudience: 'MALE', hasHomeService: false,
    tags: [tag('کوتاهی ژورنالی', 'خدمات مو'), tag('اصلاح و قرینه‌سازی ابرو', 'خدمات ابرو و مژه')],
    description: 'آرایشگاه پرشین، سرویس سریع و باکیفیت اصلاح مو و ریش برای آقایان.',
    rating: 4.5, reviewsCount: 82, instagram: 'persian_barbershop_tehran',
  },
];

if (salonsData.length !== 20) {
  throw new Error(`انتظار ۲۰ سالن بود، ${salonsData.length} تا پیدا شد`);
}

async function main() {
  const farFuture = new Date();
  farFuture.setFullYear(farFuture.getFullYear() + 100);

  let created = 0;

  for (let i = 0; i < salonsData.length; i++) {
    const s = salonsData[i];
    const index = i + 1;
    const ownerPhone = `${FAKE_PHONE_PREFIX}${String(index).padStart(4, '0')}`;
    const imgSeed = `zibawall-demo-${index}`;

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
        imageUrl: `https://picsum.photos/seed/${imgSeed}/800/600`,
        description: s.description,
        portfolios: [1, 2, 3].map((n) => `https://picsum.photos/seed/${imgSeed}-${n}/600/600`),
        status: 'ACTIVE',
        planId: null,
        subscriptionExpiresAt: farFuture,
        rating: s.rating,
        reviewsCount: s.reviewsCount,
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
//lib/data.ts
export interface Review {
  id: number;
  name: string;
  rating: number;
  comment?: string; 
}

export interface Socials {
  website?: string;
  instagram?: string;
  whatsapp?: string;
  telegram?: string;
  rubika?: string; 
  bale?: string; 
}

export interface Salon {
  id: number;
  name: string;
  province: string; // اضافه شد: استان
  city: string;     // اضافه شد: شهر
  address: string;
  phones: string[]; 
  workingHours: string;
  closedDays: string[]; 
  rating: number;
  reviewsCount: number;
  tags: string[];
  imageUrl: string;
  description: string;
  gallery: string[];
  socials: Socials;
  reviews: Review[];
}

export const CATEGORY_MAPPING: Record<string, string[]> = {
  'خدمات مو': [
    'کوتاهی ژورنالی', 'رنگ، لایت و مش', 'بالیاژ و آمبره', 'کراتینه و احیا مو', 
    'پروتئین‌تراپی و بوتاکس مو', 'شینیون و استایل مو', 'اکستنشن مو', 'بافت مو', 'براشینگ'
  ],
  'خدمات ناخن': [
    'کاشت ناخن (پودر/ژل)', 'ترمیم ناخن', 'ژلیش (لاک ژل)', 'لمینت ناخن', 
    'مانیکور', 'پدیکور و کفسابی', 'طراحی و دیزاین ناخن', 'ریموو ناخن'
  ],
  'خدمات ابرو و مژه': [
    'اصلاح و قرینه‌سازی ابرو', 'میکروبلیدینگ و فیبروز ابرو', 'تاتو و هاشور ابرو', 
    'اکستنشن مژه (کلاسیک/والیوم/مگاوالیوم)', 'کاشت مژه موقت', 'لیفت و لمینت مژه', 'لیفت ابرو'
  ],
  'خدمات پوست و زیبایی': [
    'فیشیال و پاکسازی تخصصی', 'میکرودرم و میکرونیدلینگ', 'مزوتراپی پوست', 
    'پلاژن تراپی', 'درمان لک و جوش', 'ماساژ صورت'
  ],
  'خدمات آرایش و میکاپ': [
    'میکاپ محفلی (VIP/ویژه)', 'گریم تخصصی و کانتورینگ', 'آرایش دائم (خط چشم، شیدینگ لب)', 
    'خودآرایی'
  ],
  'پکیج‌های عروس': [
    'پکیج کامل عروس (VIP)', 'پکیج عقد و نامزدی', 'پکیج فرمالیته', 
    'میکاپ و شینیون عروس', 'مشاوره تخصصی عروس'
  ],
  'موزدایی و بدن': [
    'اپیلاسیون کل بدن', 'اپیلاسیون گیاهی / پیشرفته', 'لیزر موهای زائد', 
    'وکس صورت', 'بند و ابرو (اصلاح صورت)'
  ],
  'خدمات ماساژ و اسپا': [
    'ماساژ ریلکسی', 'ماساژ درمانی', 'ماساژ سنگ داغ', 'اسپا و حمام مغربی'
  ]
};

export const CATEGORIES = ['همه', ...Object.keys(CATEGORY_MAPPING)];

export const SALONS_DATA: Salon[] = [
  {
    id: 1,
    name: 'سالن زیبایی و عروس سارا',
    province: 'تهران', // اضافه شد
    city: 'تهران',     // اضافه شد
    address: 'تهران، سعادت‌آباد، بلوار دریا',
    phones: ['021 - 8888 8888', '09120000000'],
    workingHours: '۱۰:۰۰ صبح تا ۲۰:۰۰ شب',
    closedDays: ['جمعه'],
    rating: 4.8,
    reviewsCount: 124,
    tags: [
      'کاشت ناخن (پودر/ژل)', 'ژلیش (لاک ژل)', 'میکاپ محفلی (VIP/ویژه)', 
      'میکاپ و شینیون عروس', 'رنگ، لایت و مش', 'کوتاهی ژورنالی', 'پکیج کامل عروس (VIP)'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=800&h=500',
    description: 'سالن زیبایی سارا با بیش از ۱۰ سال سابقه و بهره‌گیری از کادری مجرب و مواد اولیه برندهای معتبر جهانی، آماده ارائه بهترین خدمات زیبایی به شما عزیزان می‌باشد.',
    gallery: [
      'https://images.unsplash.com/photo-1522337360788-8b13fee7a3af?auto=format&fit=crop&q=80&w=200&h=200',
      'https://images.unsplash.com/photo-1516975080661-46bfa2e412bd?auto=format&fit=crop&q=80&w=200&h=200',
    ],
    socials: {
      website: "https://sara-salon.com",
      instagram: "sara_beauty",
      whatsapp: "09120000000",
      telegram: "sara_support",
      rubika: "sara_rubika"
    },
    reviews: [
      { id: 1, name: "سارا احمدی", rating: 5, comment: "کارشون عالیه، من برای رنگ مو رفتم و خیلی راضی بودم." },
      { id: 2, name: "مریم", rating: 4, comment: "" }, 
      { id: 3, name: "کاربر ناشناس", rating: 5 } 
    ]
  },
  {
    id: 2,
    name: 'مرکز تخصصی ناخن و مژه ژیلا',
    province: 'تهران', // اضافه شد
    city: 'تهران',     // اضافه شد
    address: 'تهران، نیاوران، خیابان عمار',
    phones: ['021 - 2222 2222'],
    workingHours: '۱۱:۰۰ صبح تا ۱۹:۰۰ شب',
    closedDays: ['پنج‌شنبه', 'جمعه'],
    rating: 4.5,
    reviewsCount: 89,
    tags: [
      'کاشت ناخن (پودر/ژل)', 'طراحی و دیزاین ناخن', 'اکستنشن مژه (کلاسیک/والیوم/مگاوالیوم)', 
      'کاشت مژه موقت', 'پدیکور و کفسابی', 'مانیکور'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&q=80&w=800&h=500',
    description: 'مرکز تخصصی ژیلا با تمرکز بر خدمات ناخن و مژه، جدیدترین متدهای روز دنیا را با بهترین متریال به شما ارائه می‌دهد.',
    gallery: [
      'https://images.unsplash.com/photo-1519014816548-bf5fe059e98b?auto=format&fit=crop&q=80&w=200&h=200',
    ],
    socials: {
      instagram: "zhila_nailbar",
      whatsapp: "09121111111",
      bale: "zhila_bale"
    },
    reviews: [
      { id: 1, name: "نگین", rating: 5, comment: "طراحی ناخن‌هاشون بی‌نظیره." },
      { id: 2, name: "زهرا", rating: 3, comment: "خوب بود ولی یکم معطل شدم." }
    ]
  },
  {
    id: 3,
    name: 'سالن شیک‌پوشان',
    province: 'تهران', // اضافه شد
    city: 'تهران',     // اضافه شد
    address: 'تهران، گاندی، خیابان ۱۸',
    phones: ['021 - 7777 7777'],
    workingHours: '۰۹:۰۰ صبح تا ۲۱:۰۰ شب',
    closedDays: [],
    rating: 4.7,
    reviewsCount: 210,
    tags: [
      'رنگ، لایت و مش', 'بالیاژ و آمبره', 'شینیون و استایل مو', 
      'میکاپ محفلی (VIP/ویژه)', 'پکیج کامل عروس (VIP)'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1519336803949-42050a72399e?auto=format&fit=crop&q=80&w=800&h=500',
    description: 'مجموعه زیبایی شیک‌پوشان انتخابی ایده‌آل برای عروس خانم‌ها و کسانی که به زیبایی خود اهمیت می‌دهند.',
    gallery: [
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=200&h=200',
    ],
    socials: {
      telegram: "shikposhan_salon",
      instagram: "shikposhan_beauty"
    },
    reviews: [
      { id: 1, name: "فاطمه", rating: 5 } 
    ]
  },
];

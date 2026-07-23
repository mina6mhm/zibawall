// components/business-form/constants.ts

export const SERVICE_DETAILS = {
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
} as const;

export const WEEK_DAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];

export type GenderAudience = 'FEMALE' | 'MALE' | 'BOTH';

// آیا گزینه «بانوان» در مقدار فعلی مخاطب سالن فعال است؟
export const isFemaleSelected = (value: GenderAudience | null) =>
  value === 'FEMALE' || value === 'BOTH';

// آیا گزینه «آقایون» در مقدار فعلی مخاطب سالن فعال است؟
export const isMaleSelected = (value: GenderAudience | null) =>
  value === 'MALE' || value === 'BOTH';

// تیک زدن/برداشتن یکی از دو گزینه (بانوان/آقایون) و محاسبه مقدار نهایی GenderAudience
// اگر هیچ‌کدام انتخاب نشده باشد، null برمی‌گردد (یعنی هنوز انتخابی انجام نشده)
export const toggleGenderAudience = (
  current: GenderAudience | null,
  clicked: 'FEMALE' | 'MALE'
): GenderAudience | null => {
  let female = isFemaleSelected(current);
  let male = isMaleSelected(current);

  if (clicked === 'FEMALE') female = !female;
  if (clicked === 'MALE') male = !male;

  if (female && male) return 'BOTH';
  if (female) return 'FEMALE';
  if (male) return 'MALE';
  return null;
};

export const SOCIAL_FIELDS = [
  { key: 'instagram', label: 'اینستاگرام', placeholder: 'ID اینستاگرام', icon: 'instagram' as const },
  { key: 'whatsapp', label: 'واتساپ', placeholder: 'شماره واتساپ', icon: 'message' as const },
  { key: 'telegram', label: 'تلگرام', placeholder: 'ID تلگرام', icon: 'send' as const },
  { key: 'rubika', label: 'روبیکا', placeholder: 'ID یا شماره روبیکا', icon: 'message' as const },
  { key: 'bale', label: 'بله', placeholder: 'ID یا شماره بله', icon: 'message' as const },
  { key: 'website', label: 'وب‌سایت', placeholder: 'https://...', icon: 'globe' as const },
] as const;

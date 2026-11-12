// lib/card.ts
// اعتبارسنجی و نمایش شماره کارت بانکی (کد خالص، قابل استفاده در سرور و کلاینت).
//
// چرا مهم است: بیعانه به همین شماره کارت واریز می‌شود؛ یک رقم اشتباه یعنی پول به حساب غلط می‌رود.
// الگوریتم Luhn تایپ اشتباه (جابه‌جایی/غلط‌نویسی یک رقم) را تقریباً همیشه می‌گیرد.
// توجه: Luhn فقط «درست‌تایپ‌شدن» را تضمین می‌کند، نه اینکه کارت «مال همین صاحب سالن» است.

/** تبدیل ارقام فارسی/عربی به لاتین و حذف هر چیز غیر از رقم */
export function normalizeCardInput(v: string): string {
  return v
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - '۰'.charCodeAt(0)))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - '٠'.charCodeAt(0)))
    .replace(/[^0-9]/g, '');
}

/** الگوریتم Luhn برای رشته‌ی رقمی */
function luhnOk(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = digits.charCodeAt(digits.length - 1 - i) - 48;
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

/** شماره کارت معتبر = دقیقاً ۱۶ رقم لاتین + عبور از Luhn */
export function isValidCardNumber(card: unknown): card is string {
  return typeof card === 'string' && /^\d{16}$/.test(card) && luhnOk(card);
}

// ۶ رقم اول کارت (BIN) → نام بانک. فقط برای «نمایش و تأیید چشمیِ» کاربر است؛ ناشناخته بودن مانع ثبت نیست.
const BANK_BY_BIN: Record<string, string> = {
  '603799': 'بانک ملی', '589210': 'بانک سپه', '627648': 'توسعه صادرات', '627961': 'صنعت و معدن',
  '603770': 'بانک کشاورزی', '639217': 'بانک کشاورزی', '628023': 'بانک مسکن', '627760': 'پست بانک',
  '502908': 'توسعه تعاون', '627412': 'اقتصاد نوین', '622106': 'بانک پارسیان', '639194': 'بانک پارسیان',
  '502229': 'بانک پاسارگاد', '639347': 'بانک پاسارگاد', '627488': 'بانک کارآفرین', '621986': 'بانک سامان',
  '639346': 'بانک سینا', '639607': 'بانک سرمایه', '636214': 'بانک آینده', '502806': 'بانک شهر',
  '504706': 'بانک شهر', '502938': 'بانک دی', '603769': 'بانک صادرات', '610433': 'بانک ملت',
  '991975': 'بانک ملت', '589463': 'بانک رفاه', '627381': 'بانک انصار', '585983': 'بانک تجارت',
  '627353': 'بانک تجارت', '585947': 'بانک خاورمیانه', '606373': 'قرض‌الحسنه مهر ایران',
  '639370': 'مهر اقتصاد', '639599': 'بانک قوامین', '636795': 'بانک مرکزی', '505416': 'بانک گردشگری',
  '636949': 'بانک حکمت ایرانیان', '505785': 'بانک ایران‌زمین', '504172': 'قرض‌الحسنه رسالت',
  '507677': 'مؤسسه نور', '628157': 'مؤسسه اعتباری توسعه', '606256': 'مؤسسه ملل',
};

/** نام بانک از روی ۶ رقم اول؛ اگر ناشناخته بود null */
export function getBankName(card: string): string | null {
  return card.length >= 6 ? BANK_BY_BIN[card.slice(0, 6)] ?? null : null;
}

/** ۱۲۳۴ ۵۶۷۸ ۹۰۱۲ ۳۴۵۶ */
export function formatCardNumber(card: string): string {
  return card.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

// ─── شماره شبا (IBAN ایران) ───────────────────────────────────────────────────
// قالب: IR + ۲۴ رقم (جمعاً ۲۶ کاراکتر). اعتبارسنجی با الگوریتم mod-97 (ISO 13616) انجام می‌شود
// تا تایپ اشتباه یک رقم تقریباً همیشه گرفته شود.

/** ورودی کاربر → «IR» + ارقام لاتین (حروف و فاصله‌ی اضافه حذف می‌شود). فقط ۲۴ رقم نگه داشته می‌شود. */
export function normalizeShebaInput(v: string): string {
  const digits = v
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - '۰'.charCodeAt(0)))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - '٠'.charCodeAt(0)))
    .replace(/[^0-9]/g, '')
    .slice(0, 24);
  return digits.length > 0 ? `IR${digits}` : '';
}

/** شبا معتبر = IR + ۲۴ رقم + عبور از mod-97 */
export function isValidSheba(sheba: unknown): sheba is string {
  if (typeof sheba !== 'string' || !/^IR\d{24}$/.test(sheba)) return false;
  // چهار کاراکتر اول به انتهای رشته می‌رود و IR → ۱۸۲۷
  const rearranged = sheba.slice(4) + '1827' + sheba.slice(2, 4);
  let rem = 0;
  for (let i = 0; i < rearranged.length; i++) {
    rem = (rem * 10 + (rearranged.charCodeAt(i) - 48)) % 97;
  }
  return rem === 1;
}

/** IR12 3456 7890 ... برای نمایش */
export function formatSheba(sheba: string): string {
  return sheba.replace(/(.{4})(?=.)/g, '$1 ').trim();
}

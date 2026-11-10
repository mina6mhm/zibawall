// lib/sms.ts
type SendPatternSmsParams = {
  patternCode: string;
  recipient: string;
  attributes: Record<string, string>;
};

export async function sendPatternSms({ patternCode, recipient, attributes }: SendPatternSmsParams) {
  const apiKey = process.env.FARAZ_SMS_API_KEY;
  const lineNumber = process.env.FARAZ_SMS_LINE_NUMBER;

  if (!apiKey) throw new Error('FARAZ_SMS_API_KEY is not configured');
  if (!lineNumber) throw new Error('FARAZ_SMS_LINE_NUMBER is not configured');

  const requestBody = {
    code: patternCode,
    recipient,
    attributes,
    line_number: lineNumber,
    number_format: 'persian',
  };

  let smsRes: Response;
  try {
    smsRes = await fetch('https://api.iranpayamak.com/ws/v1/sms/pattern', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': apiKey,
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(8000),
    });
  } catch (networkError) {
    console.error('❌ SMS Network Error:', networkError);
    throw new Error('ارتباط با سامانه پیامکی برقرار نشد');
  }

  const smsText = await smsRes.text();
  // لاگ فقط در حالت خطا (و بدون شماره‌ی کامل) — لاگ همه‌ی درخواست‌ها زیر بار هم کند است هم اطلاعات کاربر را درز می‌دهد
  if (!smsRes.ok) {
    console.error('❌ SMS failed:', smsRes.status, smsText.slice(0, 300), 'to ***' + String(recipient).slice(-4));
    throw new Error('ارسال پیامک با خطا مواجه شد');
  }

  return smsText;
}

// پیامک یادآوری نوبت، ۲۴ ساعت قبل از زمان نوبت ارسال می‌شود.
// نکته مهم: باید یک پترن جدید در پنل فراز پیامک تعریف/تایید کنید
// با متغیرهایی مثل: سالن، تاریخ، ساعت — و کدش رو در env زیر بذارید:
// FARAZ_SMS_REMINDER_PATTERN_CODE
export async function sendBookingReminderSms(params: {
  phone: string;
  salonName: string;
  date: string; // تاریخ فرمت‌شده، مثلاً "۱۴۰۴/۰۵/۱۲"
  time: string; // ساعت، مثلاً "16:30"
}) {
  const patternCode = process.env.FARAZ_SMS_REMINDER_PATTERN_CODE;
  if (!patternCode) throw new Error('FARAZ_SMS_REMINDER_PATTERN_CODE is not configured');

  return sendPatternSms({
    patternCode,
    recipient: params.phone,
    attributes: {
      salon: params.salonName,
      date: params.date,
      time: params.time,
    },
  });
}

// پیامک تایید ثبت نوبت — بلافاصله بعد از قطعی شدن نوبت (پرداخت موفق) برای مشتری ارسال می‌شود.
// یک پترن جدید در پنل ایران‌پیامک/فراز بسازید و کدش را در env بگذارید:
// FARAZ_SMS_BOOKING_CONFIRM_PATTERN_CODE
// متغیرهای پترن: salon, date, time, services, link
export async function sendBookingConfirmationSms(params: {
  phone: string;
  salonName: string;
  date: string;     // تاریخ شمسی، مثلاً "۱۴۰۵/۰۸/۰۲"
  time: string;     // ساعت، مثلاً "16:30"
  services: string; // نام خدمات، مثلاً "کراتین مو، میکاپ"
  link: string;     // لینک صفحه‌ی جزئیات سالن
}) {
  const patternCode = process.env.FARAZ_SMS_BOOKING_CONFIRM_PATTERN_CODE;
  if (!patternCode) throw new Error('FARAZ_SMS_BOOKING_CONFIRM_PATTERN_CODE is not configured');

  // فقط وقتی پترن در پنل متغیر link دارد، آن را می‌فرستیم؛ ارسال متغیر اضافه باعث رد شدن پیامک می‌شود.
  // بعد از ساخت پترن جدید با link: FARAZ_SMS_BOOKING_CONFIRM_WITH_LINK=true
  const withLink = process.env.FARAZ_SMS_BOOKING_CONFIRM_WITH_LINK === 'true';

  return sendPatternSms({
    patternCode,
    recipient: params.phone,
    attributes: {
      salon: params.salonName,
      services: params.services,
      date: params.date,
      time: params.time,
      ...(withLink ? { link: params.link } : {}),
    },
  });
}
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

  console.log('📤 SMS REQUEST:', JSON.stringify(requestBody));

  let smsRes: Response;
  try {
    smsRes = await fetch('https://api.iranpayamak.com/ws/v1/sms/pattern', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': apiKey,
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(15000),
    });
  } catch (networkError) {
    console.error('❌ SMS Network Error:', networkError);
    throw new Error('ارتباط با سامانه پیامکی برقرار نشد');
  }

  const smsText = await smsRes.text();
  console.log('====================');
  console.log('SMS STATUS:', smsRes.status);
  console.log('SMS RESPONSE:', smsText);
  console.log('====================');

  if (!smsRes.ok) {
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
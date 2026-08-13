// lib/zarinpal.ts

// اگر ZARINPAL_SANDBOX=true در env تنظیم شده باشد، همه‌ی درخواست‌ها به سرور تستی
// زرین‌پال می‌روند و می‌توانید با merchant id عمومی تستی زیر کل فلوی پرداخت
// (رفتن به درگاه، پرداخت موفق ساختگی، callback، CONFIRMED شدن نوبت) را
// بدون نیاز به تایید حساب واقعی زرین‌پال تست کنید:
//   ZARINPAL_MERCHANT_ID=00000000-0000-0000-0000-000000000000
//   ZARINPAL_SANDBOX=true
// وقتی حساب واقعی‌تان تایید شد، کافی است ZARINPAL_SANDBOX را حذف کنید یا false
// بگذارید و merchant id واقعی را جایگزین کنید — بقیه‌ی کد دست‌نخورده می‌ماند.

const ZARINPAL_MERCHANT_ID = process.env.ZARINPAL_MERCHANT_ID || '';
const IS_SANDBOX = process.env.ZARINPAL_SANDBOX === 'true';

const ZARINPAL_BASE_URL = IS_SANDBOX
  ? 'https://sandbox.zarinpal.com'
  : 'https://api.zarinpal.com';

const ZARINPAL_STARTPAY_BASE_URL = IS_SANDBOX
  ? 'https://sandbox.zarinpal.com'
  : 'https://www.zarinpal.com';

const ZARINPAL_REQUEST_URL = `${ZARINPAL_BASE_URL}/pg/v4/payment/request.json`;
const ZARINPAL_VERIFY_URL = `${ZARINPAL_BASE_URL}/pg/v4/payment/verify.json`;
const ZARINPAL_STARTPAY_URL = `${ZARINPAL_STARTPAY_BASE_URL}/pg/StartPay/`;

// نکته: مبلغ ورودی این توابع بر حسب «تومان» است و خودش به «ریال» (ضرب در ۱۰) تبدیل می‌شود،
// چون API زرین‌پال مبلغ را به ریال می‌خواهد.

export async function requestZarinpalPayment({
  amountToman,
  description,
  callbackUrl,
  mobile,
}: {
  amountToman: number;
  description: string;
  callbackUrl: string;
  mobile?: string;
}) {
  if (!ZARINPAL_MERCHANT_ID) {
    throw new Error('ZARINPAL_MERCHANT_ID در env تنظیم نشده است.');
  }

  const res = await fetch(ZARINPAL_REQUEST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      merchant_id: ZARINPAL_MERCHANT_ID,
      amount: amountToman * 10,
      description,
      callback_url: callbackUrl,
      metadata: mobile ? { mobile } : undefined,
    }),
  });

  const data = await res.json();

  if (data?.data?.code === 100 && data?.data?.authority) {
    return {
      authority: data.data.authority as string,
      paymentUrl: ZARINPAL_STARTPAY_URL + data.data.authority,
    };
  }

  const errorMessage = data?.errors?.message || 'خطا در ایجاد درخواست پرداخت زرین‌پال';
  throw new Error(errorMessage);
}

export async function verifyZarinpalPayment({
  amountToman,
  authority,
}: {
  amountToman: number;
  authority: string;
}) {
  if (!ZARINPAL_MERCHANT_ID) {
    throw new Error('ZARINPAL_MERCHANT_ID در env تنظیم نشده است.');
  }

  const res = await fetch(ZARINPAL_VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      merchant_id: ZARINPAL_MERCHANT_ID,
      amount: amountToman * 10,
      authority,
    }),
  });

  const data = await res.json();

  // کد ۱۰۰: پرداخت موفق و تازه‌تایید‌شده / کد ۱۰۱: قبلاً تایید شده (idempotent)
  if (data?.data?.code === 100 || data?.data?.code === 101) {
    return { success: true, refId: data.data.ref_id as string | number };
  }

  return { success: false, refId: null as null };
}
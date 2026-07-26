// lib/zarinpal.ts
const ZARINPAL_MERCHANT_ID = process.env.ZARINPAL_MERCHANT_ID || '';
const ZARINPAL_REQUEST_URL = 'https://api.zarinpal.com/pg/v4/payment/request.json';
const ZARINPAL_VERIFY_URL = 'https://api.zarinpal.com/pg/v4/payment/verify.json';
const ZARINPAL_STARTPAY_URL = 'https://www.zarinpal.com/pg/StartPay/';

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

// lib/telegram.ts
// ارسال نوتیف آنی به ادمین از طریق ربات تلگرام، برای اطلاع سریع از رویدادهایی
// مثل ثبت سالن جدید که منتظر تایید است.
//
// راه‌اندازی (۵ دقیقه):
// ۱. توی تلگرام به @BotFather پیام بده و با دستور /newbot یک ربات جدید بساز.
//    بعد از ساخت، یک توکن به این شکل می‌گیری: 123456789:AAExxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// ۲. با ربات جدیدت یک /start بزن (چت رو باهاش باز کن).
// ۳. برای گرفتن chat id خودت، به @userinfobot پیام بده و عدد chat id ات رو بردار
//    (یا آدرس زیر رو با توکن ربات خودت باز کن، بعد از /start زدن به ربات:
//    https://api.telegram.org/bot<TOKEN>/getUpdates — عدد "chat":{"id": ...} رو بردار)
// ۴. این دو مقدار رو در فایل .env سرور اضافه کن:
//    TELEGRAM_BOT_TOKEN=123456789:AAExxxxxxxxxxxxxxxxxxxxxxxxxxxxx
//    TELEGRAM_ADMIN_CHAT_ID=123456789
//
// اگر چند ادمین داری و همه باید نوتیف بگیرن، chat id ها رو با کاما جدا کن:
//    TELEGRAM_ADMIN_CHAT_ID=111111111,222222222

export async function sendTelegramAdminAlert(text: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatIdsRaw = process.env.TELEGRAM_ADMIN_CHAT_ID;

  if (!botToken || !chatIdsRaw) {
    // عمداً throw نمی‌کنیم؛ نبود تنظیمات تلگرام نباید باعث خطا در ثبت/ویرایش سالن بشود
    console.warn('⚠️ TELEGRAM_BOT_TOKEN یا TELEGRAM_ADMIN_CHAT_ID تنظیم نشده — نوتیف تلگرام ارسال نشد');
    return;
  }

  const chatIds = chatIdsRaw.split(',').map((id) => id.trim()).filter(Boolean);

  await Promise.all(
    chatIds.map(async (chatId) => {
      try {
        const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
          }),
          signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          console.error(`❌ Telegram alert failed for chat ${chatId}:`, res.status, errText);
        }
      } catch (err) {
        console.error(`❌ Telegram alert network error for chat ${chatId}:`, err);
      }
    })
  );
}

// نوتیف اختصاصی: سالن جدید در انتظار تایید ادمین
export async function notifyAdminNewSalonPending(salon: {
  id: string;
  name: string;
  province: string;
  city: string;
  isResubmission?: boolean;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
  const link = baseUrl ? `\n\n${baseUrl}/admin/salons` : '';

  const title = salon.isResubmission
    ? '♻️ <b>سالن رد‌شده دوباره ارسال شد</b>'
    : '🆕 <b>سالن جدید در انتظار تایید</b>';

  const text =
    `${title}\n\n` +
    `🏬 نام: ${salon.name}\n` +
    `📍 ${salon.province}، ${salon.city}` +
    link;

  await sendTelegramAdminAlert(text);
}
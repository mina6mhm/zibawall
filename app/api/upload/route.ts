//app/api/upload/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { rateLimit } from '@/lib/rateLimit';
import sharp from 'sharp';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const heicConvert = require('heic-convert');

const s3 = new S3Client({
  region: 'default',
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY as string,
    secretAccessKey: process.env.S3_SECRET_KEY as string,
  },
});

// سقف‌ها: قبلاً ۵۰ مگابایت برای هر فایل و بدون سقف تعداد فایل بود؛ چند درخواست
// هم‌زمان کافی بود تا حافظه‌ی سرور (و CPU برای sharp/heic) تمام شود.
// کلاینت عکس‌ها را قبل از ارسال فشرده می‌کند، پس ۲۰ مگابایت برای عکس واقعی کافی است.
// فرم ثبت/ویرایش کسب‌وکار همه‌ی نمونه‌کارها (حداکثر ۳۰ تا) را در «یک» درخواست می‌فرستد،
// پس سقف تعداد باید حداقل ۳۰ + ۱ (کاور) باشد.
const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_FILES_PER_REQUEST = 31;
const MAX_TOTAL_BYTES = 150 * 1024 * 1024; // مجموع حجم یک درخواست
const MAX_INPUT_PIXELS = 60_000_000; // ~ عکس ۷۷۰۰×۷۷۰۰؛ جلوی «بمب پیکسلی» را می‌گیرد

// سقف «درخواست آپلودِ هم‌زمان» در هر instance. formData() کل بدنه (تا ۱۵۰ مگابایت) را در رم می‌خواند؛
// سقف MAX_CONCURRENT_PROCESSING فقط پردازش sharp را محدود می‌کرد، نه این بافرها را: ۵۰ آپلود هم‌زمان
// = چند گیگابایت رم و کشته شدن پروسه (OOM) که کل سایت را پایین می‌آورد. بالاتر از سقف، ۵۰۳ + Retry-After.
const MAX_CONCURRENT_UPLOADS = 4;
let activeUploads = 0;

// حداکثر پردازش هم‌زمان تصویر در هر instance (sharp/heic حافظه و CPU زیادی می‌خورند)
const MAX_CONCURRENT_PROCESSING = 3;
let activeProcessing = 0;
const waiters: (() => void)[] = [];
async function acquireSlot() {
  if (activeProcessing < MAX_CONCURRENT_PROCESSING) {
    activeProcessing++;
    return;
  }
  await new Promise<void>((resolve) => waiters.push(resolve));
}
function releaseSlot() {
  const next = waiters.shift();
  if (next) next(); // اسلات مستقیماً به نفر بعدی منتقل می‌شود
  else activeProcessing--;
}
const MAX_DIM = 2048;
const QUALITY = 85;

// فقط این پسوندها مجاز به آپلود هستن. توجه: mimeType که کلاینت می‌فرسته کاملاً
// قابل جعله (هرکسی می‌تونه Content-Type دلخواه بذاره)، پس ملاک اصلی تصمیم‌گیری
// پسوند فایل و پردازش واقعی با sharp هست، نه mimeType خام کلاینت.
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']);
const EXT_TO_CONTENT_TYPE: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
};

function isAllowedFile(fileName: string): boolean {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  return ALLOWED_EXTENSIONS.has(ext);
}

async function getUserIdFromToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ['HS256'] });
    return decoded.userId ?? null;
  } catch {
    return null;
  }
}

async function processImage(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<{ buffer: Buffer; ext: string; contentType: string }> {
  const lowerName = fileName.toLowerCase();

  const isHeic =
    mimeType === 'image/heic' ||
    mimeType === 'image/heif' ||
    lowerName.endsWith('.heic') ||
    lowerName.endsWith('.heif');

  try {
    let workingBuffer: Buffer;

    if (isHeic) {
      // تبدیل HEIC/HEIF به JPEG
      const converted = await heicConvert({
        buffer: new Uint8Array(buffer),
        format: 'JPEG',
        quality: 1, // کیفیت کامل - sharp بعداً فشرده می‌کنه
      });
      workingBuffer = Buffer.from(converted);
    } else {
      workingBuffer = buffer;
    }

    // پردازش با sharp — همیشه resize و optimize می‌کنه
    const finalBuffer = await sharp(workingBuffer, { failOn: 'none', limitInputPixels: MAX_INPUT_PIXELS }) // failOn: none = تلرانس بالا
      .rotate() // اصلاح orientation خودکار
      .resize(MAX_DIM, MAX_DIM, {
        fit: 'inside',
        withoutEnlargement: true, // عکس‌های کوچک رو بزرگ نمی‌کنه
      })
      .jpeg({ quality: QUALITY, mozjpeg: true })
      .toBuffer();

    return { buffer: finalBuffer, ext: 'jpg', contentType: 'image/jpeg' };

  } catch (err: any) {
    // قبلاً اگر پردازش شکست می‌خورد «فایل خام کاربر» همان‌طور که بود در Storage عمومی
    // ذخیره می‌شد (فقط با پسوند جعلی .jpg) — یعنی هر فایل دلخواهی قابل آپلود بود.
    // حالا فایلی که به‌عنوان تصویر پردازش نشود رد می‌شود.
    console.error('Image processing failed:', err?.message);
    throw new ImageProcessingError();
  }
}

class ImageProcessingError extends Error {}

export async function POST(req: Request) {
  let counted = false;
  try {
    const userId = await getUserIdFromToken();
    if (!userId) {
      return NextResponse.json({ error: 'ابتدا وارد حساب کاربری شوید' }, { status: 401 });
    }

    // ۳۰ درخواست آپلود در ۱۰ دقیقه برای هر کاربر
    const limit = await rateLimit(`upload:${userId}`, 30, 10 * 60 * 1000);
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'تعداد آپلود زیاد است. کمی بعد دوباره تلاش کنید' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
      );
    }

    // رد زودهنگام بدنه‌ی بزرگ، قبل از اینکه چیزی در رم خوانده شود (سربار multipart ≈ چند کیلوبایت)
    const declaredLength = Number(req.headers.get('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_TOTAL_BYTES + 1024 * 1024) {
      return NextResponse.json({ error: 'حجم کل فایل‌ها بیش از حد مجاز است' }, { status: 413 });
    }

    if (activeUploads >= MAX_CONCURRENT_UPLOADS) {
      return NextResponse.json(
        { error: 'سرور در حال پردازش آپلودهای دیگر است. چند ثانیه بعد دوباره تلاش کنید' },
        { status: 503, headers: { 'Retry-After': '5' } }
      );
    }
    activeUploads++;
    counted = true;

    const formData = await req.formData();
    const files = formData.getAll('file') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'هیچ فایلی ارسال نشده است' }, { status: 400 });
    }

    if (files.length > MAX_FILES_PER_REQUEST) {
      return NextResponse.json(
        { error: `در هر بار حداکثر ${MAX_FILES_PER_REQUEST} عکس می‌توانید آپلود کنید` },
        { status: 400 }
      );
    }

    const totalBytes = files.reduce((sum, f) => sum + (f?.size ?? 0), 0);
    if (totalBytes > MAX_TOTAL_BYTES) {
      return NextResponse.json({ error: 'حجم کل فایل‌ها بیش از حد مجاز است' }, { status: 413 });
    }

    const uploadedUrls: string[] = [];

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: `حجم فایل "${file.name}" بیش از ${MAX_FILE_SIZE_MB} مگابایت است` },
          { status: 413 }
        );
      }

      if (!isAllowedFile(file.name)) {
        return NextResponse.json(
          { error: `نوع فایل "${file.name}" مجاز نیست` },
          { status: 415 }
        );
      }

      const rawBuffer = Buffer.from(await file.arrayBuffer());

      let processed;
      await acquireSlot();
      try {
        processed = await processImage(rawBuffer, file.type, file.name);
      } finally {
        releaseSlot();
      }
      const { buffer, ext, contentType } = processed;

      const filename = `img-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: filename,
          Body: buffer,
          ContentType: contentType,
          ACL: 'public-read',
        })
      );

      const publicUrl = `https://${process.env.S3_BUCKET_NAME}.s3.ir-thr-at1.arvanstorage.ir/${filename}`;
      uploadedUrls.push(publicUrl);
    }

    return NextResponse.json({ urls: uploadedUrls }, { status: 200 });

  } catch (error: any) {
    if (error instanceof ImageProcessingError) {
      return NextResponse.json(
        { error: 'فایل ارسالی یک تصویر معتبر نیست یا قابل پردازش نبود' },
        { status: 400 }
      );
    }
    // پیام داخلی خطا (آدرس سرور S3 و ...) نباید به کلاینت نشت کند
    console.error('Upload Error:', error?.message);
    return NextResponse.json({ error: 'خطای سرور در آپلود فایل' }, { status: 500 });
  } finally {
    if (counted) activeUploads--;
  }
}
//app/api/upload/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
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

const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
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
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
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
    const finalBuffer = await sharp(workingBuffer, { failOn: 'none' }) // failOn: none = تلرانس بالا
      .rotate() // اصلاح orientation خودکار
      .resize(MAX_DIM, MAX_DIM, {
        fit: 'inside',
        withoutEnlargement: true, // عکس‌های کوچک رو بزرگ نمی‌کنه
      })
      .jpeg({ quality: QUALITY, mozjpeg: true })
      .toBuffer();

    return { buffer: finalBuffer, ext: 'jpg', contentType: 'image/jpeg' };

  } catch (err: any) {
    // اگه پردازش fail شد، فایل اصلی رو بفرست (fallback)
    // contentType رو از روی پسوند مجاز تعیین می‌کنیم، نه mimeType خام کلاینت
    console.error('Image processing failed, using original:', err?.message);
    const ext = lowerName.split('.').pop() || 'jpg';
    return { buffer, ext, contentType: EXT_TO_CONTENT_TYPE[ext] ?? 'application/octet-stream' };
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getUserIdFromToken();
    if (!userId) {
      return NextResponse.json({ error: 'ابتدا وارد حساب کاربری شوید' }, { status: 401 });
    }

    const formData = await req.formData();
    const files = formData.getAll('file') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'هیچ فایلی ارسال نشده است' }, { status: 400 });
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
      const { buffer, ext, contentType } = await processImage(rawBuffer, file.type, file.name);

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
    console.error('Upload Error:', error?.message);
    return NextResponse.json(
      { error: error?.message || 'خطای سرور در آپلود فایل' },
      { status: 500 }
    );
  }
}
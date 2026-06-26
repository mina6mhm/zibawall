import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

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

// فرمت‌هایی که نیاز به تبدیل دارن
const NEEDS_CONVERSION = ['image/heic', 'image/heif', 'image/tiff', 'image/bmp'];

async function processImage(buffer: Buffer, mimeType: string): Promise<{ buffer: Buffer; ext: string; contentType: string }> {
  const needsConversion = NEEDS_CONVERSION.includes(mimeType) || mimeType === '';
  
  if (needsConversion) {
    // HEIC و فرمت‌های ناشناس → تبدیل به JPEG
    const converted = await sharp(buffer)
      .rotate() // اصلاح orientation آیفون
      .jpeg({ quality: 85 })
      .toBuffer();
    return { buffer: converted, ext: 'jpg', contentType: 'image/jpeg' };
  }

  // JPEG/PNG/WEBP — فقط اگه بزرگه فشرده کن
  const metadata = await sharp(buffer).metadata();
  const { width = 0, height = 0 } = metadata;
  const MAX_DIM = 2048;

  if (width > MAX_DIM || height > MAX_DIM) {
    const resized = await sharp(buffer)
      .rotate() // اصلاح orientation
      .resize(MAX_DIM, MAX_DIM, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    return { buffer: resized, ext: 'jpg', contentType: 'image/jpeg' };
  }

  // فایل کوچک و فرمت معمولی — بدون تغییر
  const originalExt = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
  return { buffer, ext: originalExt, contentType: mimeType || 'image/jpeg' };
}

export async function POST(req: Request) {
  try {
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

      const rawBuffer = Buffer.from(await file.arrayBuffer());
      const { buffer, ext, contentType } = await processImage(rawBuffer, file.type);

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
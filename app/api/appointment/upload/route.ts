// app/api/appointment/upload/route.ts
import { NextResponse } from 'next/server';
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

const MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024;
const MAX_VOICE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_DIM = 1600;
const QUALITY = 82;

async function processImage(buffer: Buffer, mimeType: string, fileName: string) {
  const lowerName = fileName.toLowerCase();
  const isHeic =
    mimeType === 'image/heic' || mimeType === 'image/heif' || lowerName.endsWith('.heic') || lowerName.endsWith('.heif');
  try {
    let workingBuffer = buffer;
    if (isHeic) {
      const converted = await heicConvert({ buffer: new Uint8Array(buffer), format: 'JPEG', quality: 1 });
      workingBuffer = Buffer.from(converted);
    }
    const finalBuffer = await sharp(workingBuffer, { failOn: 'none' })
      .rotate()
      .resize(MAX_DIM, MAX_DIM, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: QUALITY, mozjpeg: true })
      .toBuffer();
    return { buffer: finalBuffer, ext: 'jpg', contentType: 'image/jpeg' };
  } catch (err: any) {
    console.error('Image processing failed, using original:', err?.message);
    const ext = lowerName.split('.').pop() || 'jpg';
    return { buffer, ext, contentType: mimeType || 'application/octet-stream' };
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const kind = String(formData.get('kind') || 'image'); // 'image' | 'voice'

    if (!file) return NextResponse.json({ error: 'فایلی ارسال نشده است' }, { status: 400 });

    const rawBuffer = Buffer.from(await file.arrayBuffer());

    if (kind === 'voice') {
      if (file.size > MAX_VOICE_SIZE_BYTES) {
        return NextResponse.json({ error: 'حجم فایل صوتی زیاد است' }, { status: 413 });
      }
      const ext = file.type.includes('mp4') ? 'm4a' : file.type.includes('mpeg') ? 'mp3' : 'webm';
      const filename = `voice-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: filename,
          Body: rawBuffer,
          ContentType: file.type || 'audio/webm',
          ACL: 'public-read',
        })
      );
      const publicUrl = `https://${process.env.S3_BUCKET_NAME}.s3.ir-thr-at1.arvanstorage.ir/${filename}`;
      return NextResponse.json({ url: publicUrl }, { status: 200 });
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json({ error: 'حجم فایل تصویر زیاد است' }, { status: 413 });
    }
    const { buffer, ext, contentType } = await processImage(rawBuffer, file.type, file.name);
    const filename = `chat-img-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
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
    return NextResponse.json({ url: publicUrl }, { status: 200 });
  } catch (error: any) {
    console.error('Chat upload error:', error?.message);
    return NextResponse.json({ error: error?.message || 'خطا در آپلود فایل' }, { status: 500 });
  }
}
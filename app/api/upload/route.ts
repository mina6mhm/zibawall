//app/api/upload/route.ts
import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

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

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const originalExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const ext = file.type === 'image/jpeg' ? 'jpg'
                : file.type === 'image/png'  ? 'png'
                : file.type === 'image/webp' ? 'webp'
                : originalExt;

      const filename = `img-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: filename,
          Body: buffer,
          ContentType: file.type || 'image/jpeg',
          ACL: 'public-read',
        })
      );

      const publicUrl = `https://${process.env.S3_BUCKET_NAME}.s3.ir-thr-at1.arvanstorage.ir/${filename}`;
      uploadedUrls.push(publicUrl);
    }

    return NextResponse.json({ urls: uploadedUrls }, { status: 200 });

  } catch (error: any) {
    console.error('S3 Upload Error:', error?.message, error?.$metadata);
    return NextResponse.json(
      { error: error?.message || 'خطای سرور در آپلود فایل' },
      { status: 500 }
    );
  }
}
//app/api/upload/route.ts
import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: 'default',
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: true, // اضافه کردن این خط برای سرویس‌های مثل آروان ضروری است
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY as string,
    secretAccessKey: process.env.S3_SECRET_KEY as string,
  },
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('file') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'هیچ فایلی ارسال نشده است' }, { status: 400 });
    }

    const uploadedUrls: string[] = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const ext = file.name.split('.').pop();
      const filename = `img-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: filename,
          Body: buffer,
          ContentType: file.type,
          ACL: 'public-read', // اگر باکت شما کاملا عمومی نیست، این مورد نیاز است تا عکس‌ها در فرانت‌اند لود شوند
        })
      );

      // اصلاح نحوه ساخت لینک عمومی (فرمت استاندارد آروان کلاد)
      // خروجی به شکل: https://salon-app.s3.ir-thr-at1.arvanstorage.ir/filename.jpg
      const publicUrl = `https://${process.env.S3_BUCKET_NAME}.s3.ir-thr-at1.arvanstorage.ir/${filename}`;
      uploadedUrls.push(publicUrl);
    }

    return NextResponse.json({ urls: uploadedUrls }, { status: 200 });

  } catch (error: any) {
  console.error('S3 Upload Error');
  console.error(error);
  console.error(error?.name);
  console.error(error?.message);
  console.error(error?.$metadata);

  return NextResponse.json(
    {
      error: error?.message || 'خطای سرور در آپلود فایل'
    },
    { status: 500 }
  );
}
}

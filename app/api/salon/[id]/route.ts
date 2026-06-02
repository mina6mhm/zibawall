// app/api/salon/[id]/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const salonIdString = resolvedParams.id; 

    const salon = await prisma.salon.findUnique({
      where: { 
        id: salonIdString 
      },
      include: { 
        socials: true, 
        reviews: {
          orderBy: { createdAt: 'desc' } // نمایش جدیدترین نظرات در بالا
        } 
      }
    });

        // ... کدهای جستجوی سالن با prisma.salon.findUnique ...
    if (!salon) {
      return NextResponse.json({ error: 'سالنی یافت نشد' }, { status: 404 });
    }

    // اضافه کردن coordinates برای نمایش نقشه در صفحه جزئیات
    const formattedSalon = {
      ...salon,
      coordinates: (salon.lat && salon.lng) ? [salon.lat, salon.lng] : null
    };

    return NextResponse.json(formattedSalon, { status: 200 });

  } catch (error) {
    console.error('Error fetching salon by id:', error);
    return NextResponse.json({ error: 'خطای سرور در دریافت اطلاعات سالن' }, { status: 500 });
  }
}

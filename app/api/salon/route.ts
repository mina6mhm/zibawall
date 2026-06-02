//app/api/salon/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ۱. اضافه شدن این خط برای جلوگیری از کش شدن و نمایش دیتای لحظه‌ای
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const user = await prisma.user.findUnique({
      where: { phone: body.userPhone }
    });

    if (!user) {
      return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 });
    }

    const existingSalon = await prisma.salon.findUnique({
      where: { userId: user.id }
    });

    if (existingSalon) {
      return NextResponse.json({ error: 'شما قبلا یک کسب‌وکار ثبت کرده‌اید' }, { status: 400 });
    }

    const newSalon = await prisma.salon.create({
      data: {
        name: body.name,
        province: body.province,
        city: body.city,
        address: body.address,
        phones: body.phones,
        workingHours: body.workingHours,
        closedDays: body.closedDays,
        tags: body.tags,
        description: body.description,
        imageUrl: body.imageUrl,
        portfolios: body.portfolios || [],
        userId: user.id,

        lat: body.coordinates && body.coordinates.length === 2 ? body.coordinates[0] : null,
        lng: body.coordinates && body.coordinates.length === 2 ? body.coordinates[1] : null,
        
        socials: {
          create: {
            website: body.socials.website || null,
            instagram: body.socials.instagram || null,
            whatsapp: body.socials.whatsapp || null,
            telegram: body.socials.telegram || null,
            rubika: body.socials.rubika || null,
            bale: body.socials.bale || null,
          }
        }
      }
    });

    return NextResponse.json({ success: true, salon: newSalon }, { status: 201 });

  } catch (error) {
    console.error('Error creating salon:', error);
    return NextResponse.json({ error: 'خطای سرور در ثبت اطلاعات' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userPhone = searchParams.get('userPhone');

    // اگر شماره تلفن ارسال نشده بود (دریافت همه سالن‌ها برای صفحه اصلی)
    if (!userPhone) {
      const allSalons = await prisma.salon.findMany({
        orderBy: { createdAt: 'desc' },
        // ۲. اضافه شدن include برای دریافت نظرات هر سالن جهت محاسبه صحیح امتیازات
        include: {
          reviews: true,
        },
      });
      
      const formattedSalons = allSalons.map(s => ({
        ...s,
        coordinates: (s.lat && s.lng) ? [s.lat, s.lng] : null
      }));

      return NextResponse.json({ salons: formattedSalons }, { status: 200 });
    }

    // دریافت سالن یک کاربر خاص (صفحه ویرایش)
    const user = await prisma.user.findUnique({
      where: { phone: userPhone }
    });

    if (!user) {
      return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 });
    }

    const salon = await prisma.salon.findUnique({
      where: { userId: user.id },
      include: { socials: true }
    });

    if (!salon) {
      return NextResponse.json({ error: 'سالنی یافت نشد' }, { status: 404 });
    }

    const formattedSalon = {
      ...salon,
      coordinates: (salon.lat && salon.lng) ? [salon.lat, salon.lng] : null
    };

    return NextResponse.json({ salon: formattedSalon }, { status: 200 });

  } catch (error) {
    console.error('Error fetching salon(s):', error);
    return NextResponse.json({ error: 'خطای سرور در دریافت اطلاعات' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();

    const user = await prisma.user.findUnique({
      where: { phone: body.userPhone }
    });

    if (!user) {
      return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 });
    }

    const existingSalon = await prisma.salon.findUnique({
      where: { userId: user.id }
    });

    if (!existingSalon) {
      return NextResponse.json({ error: 'سالنی برای ویرایش یافت نشد' }, { status: 404 });
    }

    const updatedSalon = await prisma.salon.update({
      where: { userId: user.id },
      data: {
        name: body.name,
        province: body.province,
        city: body.city,
        address: body.address,
        phones: body.phones,
        workingHours: body.workingHours,
        closedDays: body.closedDays,
        tags: body.tags,
        description: body.description,
        imageUrl: body.imageUrl,
        portfolios: body.portfolios || [],
        
        lat: body.coordinates && body.coordinates.length === 2 ? body.coordinates[0] : null,
        lng: body.coordinates && body.coordinates.length === 2 ? body.coordinates[1] : null,
        
        socials: {
          upsert: {
            create: {
              website: body.socials?.website || null,
              instagram: body.socials?.instagram || null,
              whatsapp: body.socials?.whatsapp || null,
              telegram: body.socials?.telegram || null,
              rubika: body.socials?.rubika || null,
              bale: body.socials?.bale || null,
            },
            update: {
              website: body.socials?.website || null,
              instagram: body.socials?.instagram || null,
              whatsapp: body.socials?.whatsapp || null,
              telegram: body.socials?.telegram || null,
              rubika: body.socials?.rubika || null,
              bale: body.socials?.bale || null,
            }
          }
        }
      }
    });

    return NextResponse.json({ success: true, salon: updatedSalon }, { status: 200 });

  } catch (error) {
    console.error('Error updating salon:', error);
    return NextResponse.json({ error: 'خطای سرور در بروزرسانی اطلاعات' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'آیدی کسب‌وکار ارسال نشده است' }, { status: 400 });
    }

    const existingSalon = await prisma.salon.findUnique({
      where: { id }
    });

    if (!existingSalon) {
      return NextResponse.json({ error: 'کسب‌وکاری یافت نشد' }, { status: 404 });
    }

    await prisma.salon.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'کسب‌وکار با موفقیت حذف شد' }, { status: 200 });

  } catch (error) {
    console.error('Error deleting salon:', error);
    return NextResponse.json({ error: 'خطای سرور در حذف اطلاعات' }, { status: 500 });
  }
}

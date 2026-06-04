//app/api/salon/[id]/reviews/route.ts

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // تغییر تایپ به Promise
) {
  try {
    const { name, rating, comment } = await request.json();
    
    // حل مشکل خطای سرور: params باید await شود
    const resolvedParams = await params;
    const salonId = resolvedParams.id;

        // اگر نه نام وجود داشت، یا اینکه کاربر نه امتیاز داده و نه متنی نوشته
    if (!name || (rating === 0 && !comment)) {
      return NextResponse.json(
        { error: "نام و حداقل یکی از موارد (امتیاز یا متن نظر) الزامی است" },
        { status: 400 }
      );
    }


    // بررسی اینکه آیا کاربر با این نام قبلاً برای این سالن نظر داده است یا خیر
    const existingReviews = await prisma.review.findMany({
      where: {
        salonId: salonId,
        name: name,
      },
    });

    const hasRatedBefore = existingReviews.some((r) => r.rating > 0);

    if (hasRatedBefore && rating > 0) {
      return NextResponse.json(
        { error: "شما قبلاً امتیاز خود را ثبت کرده‌اید. فقط می‌توانید نظر متنی ارسال کنید." },
        { status: 403 }
      );
    }

    const finalRating = hasRatedBefore ? 0 : rating;

    const newReview = await prisma.review.create({
      data: {
        name,
        rating: finalRating,
        comment,
        salonId,
      },
    });

    // محاسبه میانگین امتیازات
    const allValidReviews = await prisma.review.findMany({
      where: {
        salonId: salonId,
        rating: { gt: 0 },
      },
    });

    const averageRating =
      allValidReviews.length > 0
        ? allValidReviews.reduce((acc, curr) => acc + curr.rating, 0) / allValidReviews.length
        : 0;

    await prisma.salon.update({
      where: { id: salonId },
      data: { rating: averageRating },
    });

    return NextResponse.json(newReview, { status: 201 });
  } catch (error) {
    console.error("Error creating review:", error);
    return NextResponse.json(
      { error: "خطا در ثبت اطلاعات در دیتابیس" },
      { status: 500 }
    );
  }
}

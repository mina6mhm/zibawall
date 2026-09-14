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


    let resultReview;

    if (rating > 0) {
      // --- امتیازدهی ستاره‌ای: هر کاربر یک رکورد امتیاز دارد، اما می‌تواند آن را تغییر دهد ---
      // (رکوردهای نظر متنی صرف، rating=0 دارند و اینجا دست‌نخورده می‌مانند)
      const existingRating = await prisma.review.findFirst({
        where: { salonId, name, rating: { gt: 0 } },
      });

      if (existingRating) {
        resultReview = await prisma.review.update({
          where: { id: existingRating.id },
          data: { rating },
        });
      } else {
        resultReview = await prisma.review.create({
          data: { name, rating, comment: comment || "", salonId },
        });
      }
    } else {
      // --- نظر متنی: همیشه یک رکورد جدید، بدون هیچ محدودیتی در تعداد ---
      resultReview = await prisma.review.create({
        data: { name, rating: 0, comment, salonId },
      });
    }

    // محاسبه میانگین امتیازات (پس از آپدیت/ساخت بالا، همیشه به‌روز است)
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

    return NextResponse.json(resultReview, { status: 201 });
  } catch (error) {
    console.error("Error creating review:", error);
    return NextResponse.json(
      { error: "خطا در ثبت اطلاعات در دیتابیس" },
      { status: 500 }
    );
  }
}
// app/api/locations/route.ts
import { NextResponse } from 'next/server';
import locationsData from '@/lib/data/locations.json';

export async function GET() {
  try {
    // تبدیل ساختار JSON جدید به ساختاری که فرانت‌اند انتظار دارد
    const formattedData = locationsData.map((prov, index) => ({
      id: String(index + 1),
      name: prov.province,
      cities: prov.cities.map((city, cityIndex) => ({
        id: `${index + 1}-${cityIndex + 1}`,
        name: city
      }))
    }));

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error("خطا در خواندن فایل شهرها:", error);
    return NextResponse.json(
      { message: "خطا در دریافت اطلاعات شهرها" },
      { status: 500 }
    );
  }
}

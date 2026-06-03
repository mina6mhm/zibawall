//app/api/locations/route.ts
import { NextResponse } from 'next/server';
import locationsData from '@/lib/data/locations.json'; // مسیر فایل جیسون شما

export async function GET() {
  try {
    const formattedData = locationsData.map((prov: any, index: number) => ({
      id: String(index + 1),
      name: prov.province || prov.name,
      districts: prov.districts, // آبجکت مناطق و محله‌ها
      cities: prov.cities.map((city: any, cityIndex: number) => ({
        id: `${index + 1}-${cityIndex + 1}`,
        name: typeof city === 'string' ? city : city.name,
        districts: typeof city === 'object' ? city.districts : undefined
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

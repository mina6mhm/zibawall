// components/SubscriptionPicker.tsx
'use client';

import { CheckCircle2 } from 'lucide-react';

// 1. تعریف نوع داده پلن‌ها + یک فیلد برای مشخص کردن پلن پیشنهادی
export type Plan = {
  id: string;
  title: string;
  durationMonths: number;
  price: number;
  features: string[];
  popular: boolean;
};

// 2. تعریف دو پلن جدید
export const PLANS: Plan[] = [
  {
    id: 'monthly-normal',
    title: 'اشتراک عادی',
    durationMonths: 1,
    price: 1000000, //  1 میلیون تومان
    features: [
      'آپلود تا ۱۰ نمونه کار',
      'نمایش در لیست سالن‌ها', 
      'پشتیبانی عادی'
    ],
    popular: false,
  },
  {
    id: 'monthly-advanced',
    title: 'اشتراک پیشرفته',
    durationMonths: 1,
    price: 2000000, // 2 میلیون تومان
    features: [
      'آپلود تا ۳۰ نمونه کار', 
      'پین شدن در صفحه نخست', 
      'نمایش ویژه در لیست سالن‌ها', 
      'پشتیبانی ویژه'
    ],
    popular: true,
  },
];

// 3. تعریف پراپ‌های کامپوننت برای مدیریت پلن انتخابی
interface SubscriptionPickerProps {
  selectedPlanId: string;
  onSelectPlan: (planId: string) => void;
}

export default function SubscriptionPicker({ selectedPlanId, onSelectPlan }: SubscriptionPickerProps) {
  return (
    <div className="mt-2 md:mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
      {PLANS.map((plan) => {
        const isSelected = selectedPlanId === plan.id;

        return (
          <div
            key={plan.id}
            onClick={() => onSelectPlan(plan.id)}
            className={`relative rounded-xl md:rounded-2xl border-2 cursor-pointer transition-all p-4 md:p-6 ${
              isSelected
                ? 'border-rose-600 bg-rose-50/30 shadow-md'
                : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50'
            }`}
          >
            {/* لیبل پیشنهادی */}
            {plan.popular && (
              <span className="absolute -top-3 left-4 md:-top-3.5 md:left-6 bg-rose-600 text-white text-[10px] md:text-xs font-bold px-2 py-0.5 md:px-3 md:py-1 rounded-full shadow-sm">
                پیشنهاد ویژه
              </span>
            )}

            <div className="flex justify-between items-start mb-3 md:mb-4">
              <div>
                <h3 className={`text-base md:text-lg font-bold ${isSelected ? 'text-rose-700' : 'text-zinc-800'}`}>
                  {plan.title}
                </h3>
                <p className="text-xs md:text-sm text-zinc-500 mt-0.5 md:mt-1">
                  اعتبار: {plan.durationMonths} ماه
                </p>
              </div>
              <div
                className={`w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center border-2 transition-colors shrink-0 ${
                  isSelected ? 'border-rose-600 bg-rose-600' : 'border-zinc-300'
                }`}
              >
                {isSelected && <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4 text-white" />}
              </div>
            </div>

            <div className="mb-4 md:mb-6">
              <span className="text-xl md:text-2xl font-bold text-zinc-900">
                {plan.price.toLocaleString('fa-IR')}
              </span>
              <span className="text-zinc-500 text-xs md:text-sm mr-1">تومان</span>
            </div>

            <ul className="space-y-2.5 md:space-y-3">
              {plan.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-1.5 md:gap-2 text-xs md:text-sm text-zinc-700">
                  <CheckCircle2 className="w-4 h-4 md:w-[18px] md:h-[18px] text-green-500 shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

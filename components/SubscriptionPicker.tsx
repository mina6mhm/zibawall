'use client';

import { CheckCircle2 } from 'lucide-react';

export type Plan = {
  id: string;
  title: string;
  durationMonths: number;
  price: number;
  discountedPrice?: number;
  features: string[];
  popular?: boolean;
};

// می‌توانید این پلن‌ها را بعدا از API بک‌اند دریافت کنید
export const PLANS: Plan[] = [
  {
    id: 'monthly',
    title: 'اشتراک ۱ ماهه',
    durationMonths: 1,
    price: 150000,
    features: ['نمایش در لیست سالن‌ها', 'ثبت نمونه کار', 'پشتیبانی عادی'],
  },
  {
    id: 'quarterly',
    title: 'اشتراک ۳ ماهه',
    durationMonths: 3,
    price: 450000,
    discountedPrice: 390000,
    features: ['نمایش در لیست سالن‌ها', 'ثبت نمونه کار نامحدود', 'پشتیبانی سریع‌تر'],
    popular: true, // پیشنهاد ویژه
  },
  {
    id: 'yearly',
    title: 'اشتراک ۱ ساله',
    durationMonths: 12,
    price: 1800000,
    discountedPrice: 1400000,
    features: ['نمایش ویژه در جستجو', 'ثبت نمونه کار نامحدود', 'پشتیبانی اختصاصی', 'نشان سالن تایید شده'],
  }
];

interface SubscriptionPickerProps {
  selectedPlanId: string;
  onSelectPlan: (planId: string) => void;
}

export default function SubscriptionPicker({ selectedPlanId, onSelectPlan }: SubscriptionPickerProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
      {PLANS.map((plan) => (
        <div
          key={plan.id}
          onClick={() => onSelectPlan(plan.id)}
          className={`relative cursor-pointer rounded-2xl border-2 transition-all p-6 flex flex-col ${
            selectedPlanId === plan.id
              ? 'border-rose-500 bg-rose-50/40 shadow-md shadow-rose-100'
              : 'border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm'
          }`}
        >
          {plan.popular && (
            <span className="absolute -top-3.5 inset-x-0 mx-auto w-max bg-rose-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-sm">
              پیشنهاد ویژه
            </span>
          )}
          
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-zinc-800">{plan.title}</h3>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${
              selectedPlanId === plan.id ? 'border-rose-500 bg-rose-500' : 'border-zinc-300'
            }`}>
              {selectedPlanId === plan.id && <CheckCircle2 className="text-white" size={16} />}
            </div>
          </div>

          <div className="mb-6">
            {plan.discountedPrice ? (
              <>
                <div className="text-sm text-zinc-400 line-through mb-1">
                  {plan.price.toLocaleString('fa-IR')} تومان
                </div>
                <div className="text-2xl font-bold text-rose-600">
                  {plan.discountedPrice.toLocaleString('fa-IR')} <span className="text-sm font-medium text-zinc-500">تومان</span>
                </div>
              </>
            ) : (
              <div className="text-2xl font-bold text-rose-600 mt-6">
                {plan.price.toLocaleString('fa-IR')} <span className="text-sm font-medium text-zinc-500">تومان</span>
              </div>
            )}
          </div>

          <ul className="space-y-3 mt-auto pt-6 border-t border-zinc-100">
            {plan.features.map((feature, index) => (
              <li key={index} className="flex items-center gap-2 text-sm text-zinc-600 font-medium">
                <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

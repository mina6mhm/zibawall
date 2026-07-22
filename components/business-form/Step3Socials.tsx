// components/business-form/Step3Socials.tsx
'use client';

import { Globe, MessageCircle, Send } from 'lucide-react';
import { SOCIAL_FIELDS } from './constants';

export type Socials = {
  instagram: string;
  whatsapp: string;
  telegram: string;
  rubika: string;
  bale: string;
  website: string;
};

type Props = {
  socials: Socials;
  onSocialChange: (key: keyof Socials, value: string) => void;
};

const InstagramIcon = () => (
  <svg className="absolute right-2.5 md:right-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

export default function Step3Socials({ socials, onSocialChange }: Props) {
  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <div className="flex items-center gap-1.5 md:gap-2 border-b border-zinc-100 pb-2 md:pb-3">
        <Globe className="text-zinc-700 w-5 h-5 md:w-6 md:h-6" />
        <h2 className="text-base md:text-lg font-semibold text-zinc-800">شبکه‌های اجتماعی (اختیاری)</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {SOCIAL_FIELDS.map(({ key, label, placeholder, icon }) => (
          <div key={key} className="space-y-1.5 md:space-y-2">
            <label className="block text-xs md:text-sm font-medium text-zinc-700">{label}</label>
            <div className="relative">
              {icon === 'instagram' && <InstagramIcon />}
              {icon === 'send' && <Send className="absolute right-2.5 md:right-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4 md:w-5 md:h-5" />}
              {icon === 'message' && <MessageCircle className="absolute right-2.5 md:right-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4 md:w-5 md:h-5" />}
              {icon === 'globe' && <Globe className="absolute right-2.5 md:right-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4 md:w-5 md:h-5" />}
              <input
                type={key === 'website' ? 'url' : 'text'}
                value={socials[key]}
                onChange={(e) => onSocialChange(key, e.target.value)}
                placeholder={placeholder}
                className="w-full pr-8 md:pr-10 pl-3 md:pl-4 py-2.5 md:py-3 text-sm md:text-base rounded-lg md:rounded-xl border border-zinc-200 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 outline-none transition-all text-left dir-ltr"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

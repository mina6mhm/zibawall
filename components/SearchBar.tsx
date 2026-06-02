// components/SearchBar.tsx

import React from 'react';

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export default function SearchBar({ searchQuery, setSearchQuery }: SearchBarProps) {
  return (
    <div className="flex gap-2">
      <div className="flex-1 flex items-center bg-zinc-50 rounded-full px-4 py-3 h-12">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400 ml-2 shrink-0">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="جستجوی سالن، خدمات یا..." 
          className="bg-transparent border-none outline-none text-sm w-full text-zinc-900 placeholder:text-zinc-500"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-zinc-400 hover:text-zinc-600 shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

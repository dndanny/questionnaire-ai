import React from 'react';
import { messages } from '@/contents/messages/en/message';

export const Logo = ({ className }: { className?: string }) => (
  <div className={`font-black tracking-tighter flex items-center gap-3 select-none ${className}`}>
    {/* Using standard img tag for simplicity with public folder */}
    <img src="/logo.png" alt={messages.general.logoAlt} className="h-10 w-auto object-contain" />
    <span className="text-brand-500 text-shadow-sm hidden sm:block" style={{ textShadow: '1px 1px 0px #000' }}>
      {messages.general.brand}
    </span>
  </div>
);
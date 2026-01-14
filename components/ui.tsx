
import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Button = ({ children, onClick, className, variant = 'primary', ...props }: any) => {
  const base = "px-6 py-3 rounded-2xl font-bold transition-all transform active:translate-y-1 active:shadow-neopop-active border-2 border-black";
  const styles = {
    primary: "bg-brand-300 hover:bg-brand-500 text-black shadow-neopop",
    secondary: "bg-white hover:bg-gray-100 text-black shadow-neopop",
    danger: "bg-accent-pink text-white shadow-neopop"
  };
  return (
    <button onClick={onClick} className={cn(base, styles[variant as keyof typeof styles], className)} {...props}>
      {children}
    </button>
  );
};

export const Card = ({ children, className }: any) => (
  <div className={cn("bg-white p-6 rounded-3xl border-2 border-black shadow-neopop", className)}>
    {children}
  </div>
);

export const Input = ({ ...props }) => (
  <input 
    className="w-full p-3 rounded-xl border-2 border-black focus:outline-none focus:ring-4 focus:ring-brand-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
    {...props} 
  />
);

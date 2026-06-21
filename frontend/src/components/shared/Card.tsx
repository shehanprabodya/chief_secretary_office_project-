import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`rounded-lg bg-white p-6 shadow-sm dark:bg-slate-800 ${className}`}
    >
      {children}
    </div>
  );
}
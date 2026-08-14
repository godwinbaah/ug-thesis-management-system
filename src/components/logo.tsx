"use client";

import { useId } from "react";

/** Graduation-cap mark in a rounded gradient badge — the app's brand icon. */
export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  const gradId = useId();
  return (
    <svg viewBox="0 0 32 32" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill={`url(#${gradId})`} />
      <path d="M16 9 26 13.5 16 18 6 13.5 16 9Z" fill="white" />
      <path
        d="M10.5 15.3V20c0 1.8 2.8 3.3 5.5 3.3s5.5-1.5 5.5-3.3v-4.7"
        stroke="white"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M26 13.5V19" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="26" cy="20.3" r="1.2" fill="white" />
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1e3a8a" />
        </linearGradient>
      </defs>
    </svg>
  );
}

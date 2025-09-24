"use client";
import { cn } from '@/lib/utils/utils';
import { useRouter, usePathname } from "next/navigation";

const tabList = [
  { key: "wallet", label: "지갑", path: "/", icon: (
    <svg width="32" height="32" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="8" width="22" height="12" rx="3" stroke="currentColor" strokeWidth="2"/>
      <rect x="18" y="13" width="4" height="2" rx="1" fill="currentColor"/>
    </svg>
  ) },
  { key: "purchase", label: "구매", path: "/purchase", icon: (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2"/>
      <path d="M12 16h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M16 12v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M20 8l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ) },
  { key: "action", label: "액션", path: "/action", icon: (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 12L16 4L24 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 20L16 12L24 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 28L16 20L24 28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ) },
  { key: "coupon-swap", label: "쿠폰스왑", path: "/coupon-swap", icon: (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2"/>
      <path d="M12 16h8M16 12v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ) },
  { key: "settings", label: "설정", path: "/settings", icon: (
    <svg width="32" height="32" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="2"/>
      <path d="M14 10V14L16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ) },
];

export function TabBar() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <nav className="tab-bar">
      {tabList.map(tab => {
        const isActive = pathname === tab.path;
        return (
          <button
            key={tab.key}
            onClick={() => router.push(tab.path)}
            className="bg-transparent border-0 flex flex-col items-center flex-1 cursor-pointer font-bold text-sm"
            style={{
              color: isActive ? '#F2A003' : '#888A92',
              fontSize: '13px',
              fontWeight: 700,
              gap: '2px'
            }}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
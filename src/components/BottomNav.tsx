import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

type Tab = {
  to: string;
  label: string;
  icon: ReactNode;
};

const iconProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true as const,
};

const tabs: Tab[] = [
  {
    to: '/',
    label: '이번달',
    icon: (
      <svg {...iconProps}>
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M8 2v4M16 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    to: '/extra',
    label: '추가지출',
    icon: (
      <svg {...iconProps}>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20M6 15h4" />
      </svg>
    ),
  },
  {
    to: '/fixed',
    label: '고정비',
    icon: (
      <svg {...iconProps}>
        <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />
      </svg>
    ),
  },
  {
    to: '/income',
    label: '수입',
    icon: (
      <svg {...iconProps}>
        <path d="M12 3v18M17 7.5c0-1.9-2.2-3.5-5-3.5s-5 1.6-5 3.5 2.2 3.5 5 3.5 5 1.6 5 3.5-2.2 3.5-5 3.5-5-1.6-5-3.5" />
      </svg>
    ),
  },
  {
    to: '/balance',
    label: '잔고',
    icon: (
      <svg {...iconProps}>
        <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
        <path d="M16 12h5" />
      </svg>
    ),
  },
  {
    to: '/history',
    label: '히스토리',
    icon: (
      <svg {...iconProps}>
        <path d="M4 19h16M7 16v-4M12 16V8M17 16v-6" />
      </svg>
    ),
  },
];

export function BottomNav() {
  return (
    <nav
      aria-label="하단 메뉴"
      className="fixed bottom-0 inset-x-0 z-30 flex items-stretch gap-1 border-t border-[#d5dfd4] bg-white/95 px-1.5 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] shadow-[0_-6px_20px_rgba(47,59,53,0.08)] backdrop-blur-md"
    >
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.to === '/'}
          className={({ isActive }) =>
            `bottom-nav-link flex-1 min-w-0 min-h-[54px] flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[12px] sm:text-[13px] leading-none whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage ${
              isActive
                ? 'bg-[#e6f0e8] text-[#284b36] font-bold shadow-[inset_0_0_0_1px_#bfd4c3]'
                : 'text-[#4d5d54] font-semibold hover:bg-[#f3f6f2] hover:text-[#284b36]'
            }`
          }
        >
          {t.icon}
          <span>{t.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

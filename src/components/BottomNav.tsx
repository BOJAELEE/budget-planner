import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/', label: '이번달' },
  { to: '/extra', label: '추가지출' },
  { to: '/fixed', label: '고정비' },
  { to: '/income', label: '수입' },
  { to: '/history', label: '히스토리' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 flex">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.to === '/'}
          className={({ isActive }) =>
            `flex-1 py-3 text-center text-xs ${isActive ? 'text-brand font-semibold' : 'text-gray-400'}`
          }
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}

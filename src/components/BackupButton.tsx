import { useState } from 'react';
import { BackupPanel } from './BackupPanel';

export function BackupButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="백업 및 복구"
        title="백업 및 복구"
        className="inline-flex h-[42px] shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#d4d4d8] bg-white px-2.5 text-xs font-bold text-[#111827] hover:bg-[#f4f4f5]"
        onClick={() => setOpen(true)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        <span className="hidden sm:inline">백업</span>
      </button>
      {open && (
        <div
          className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/40 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="데이터 백업 및 복구"
            className="w-full max-w-md rounded-2xl border border-[#e4e4e7] bg-white p-4 shadow-xl space-y-3"
          >
            <div className="flex items-center justify-between border-b border-[#e4e4e7] pb-2.5">
              <h2 className="text-base font-bold text-[#111827]">데이터 백업 · 복구</h2>
              <button
                type="button"
                className="min-h-[36px] rounded-lg px-2.5 text-sm font-semibold text-[#6b7280] hover:bg-[#f4f4f5] hover:text-[#111827]"
                onClick={() => setOpen(false)}
              >
                닫기
              </button>
            </div>
            <BackupPanel />
          </div>
        </div>
      )}
    </>
  );
}

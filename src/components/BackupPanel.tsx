import { useRef } from 'react';
import { useRepository } from '../data/RepositoryContext';
import { exportData, importData } from '../lib/backup';

export function BackupPanel() {
  const repo = useRepository();
  const fileRef = useRef<HTMLInputElement>(null);

  const download = async () => {
    const json = await exportData(repo);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `budget-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  };
  const upload = async (file: File) => {
    if (!confirm('현재 데이터를 백업 파일로 덮어씁니다. 계속할까요?')) return;
    await importData(repo, await file.text());
    alert('복원 완료. 새로고침 해주세요.');
  };

  return (
    <div className="rounded-2xl bg-white p-4 space-y-3">
      <div className="text-sm font-semibold text-[#6b7280]">데이터 백업 및 복구</div>
      <div className="flex gap-2">
        <button
          type="button"
          className="flex-1 min-h-[44px] rounded-xl border border-[#d4d4d8] px-3 py-2 text-sm font-semibold text-[#111827] hover:bg-[#f4f4f5]"
          onClick={download}
        >
          내보내기(JSON)
        </button>
        <button
          type="button"
          className="flex-1 min-h-[44px] rounded-xl border border-[#d4d4d8] px-3 py-2 text-sm font-semibold text-[#111827] hover:bg-[#f4f4f5]"
          onClick={() => fileRef.current?.click()}
        >
          불러오기
        </button>
      </div>
      <input ref={fileRef} type="file" accept="application/json" className="hidden"
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
    </div>
  );
}

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
    <div className="rounded-2xl bg-white shadow-card p-4 space-y-2">
      <div className="text-sm text-gray-500">백업</div>
      <div className="flex gap-2">
        <button className="flex-1 rounded-lg border py-2 text-sm" onClick={download}>내보내기(JSON)</button>
        <button className="flex-1 rounded-lg border py-2 text-sm" onClick={() => fileRef.current?.click()}>불러오기</button>
      </div>
      <input ref={fileRef} type="file" accept="application/json" className="hidden"
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
    </div>
  );
}

# 추가지출 기능 — 구현 계획

> **For agentic workers:** 이 계획은 세션 내 인라인으로 TDD 실행한다. 체크박스로 추적.

**Goal:** 고정비 외 결제를 항목 단위로 기록하는 추가지출 기능. 총 필요 예산 = 전체 고정비 + 추가지출 합계. 기존 카드값 입력은 대시보드 접이식 "카드값 계산기"로 이동·유지.

**Architecture:** 기존 Repository/calc/hook/page 패턴을 그대로 확장. 새 `extra_spendings` 테이블/타입/CRUD 추가, calc에 순수함수 추가(TDD), 대시보드·히스토리 계산을 추가지출 기반으로 변경, 신규 추가지출 탭.

**Tech Stack:** 기존과 동일(React19+Vite+TS+Tailwind+Supabase+Vitest).

## Global Constraints
- 카드 결제수단 3종: 현대카드/신한카드/삼성카드. `ExtraSpending.card: CardMethod`.
- 금액 정수, 통화 `formatKRW`(₩+콤마). 파생값 저장 안 함.
- created_at 자동(사용자 입력 안 함), year_month는 삽입 시 현재 월(YYYY-MM) 자동.
- Repository 메서드 시그니처는 memory/supabase 양쪽 동일.
- 개인 금융파일/.env는 커밋 금지(기존 .gitignore).

**계산 정의:**
```
fixedCostsTotal   = Σ(active fixedCosts.amount)
extraSpendingTotal= Σ(extras.amount)
extraByCard(card) = Σ(extras where card == card .amount)
총 필요 예산       = fixedCostsTotal + extraSpendingTotal
잔여금액          = incomeTotal − 총 필요 예산
```

---

### Task 1: ExtraSpending 타입 + calc 순수함수 (TDD)

**Files:** Modify `src/types.ts`; Modify `src/lib/calc.ts`, `src/lib/calc.test.ts`

**Produces:**
- `ExtraSpending { id, yearMonth, card: CardMethod, name, amount, createdAt }`
- `fixedCostsTotal(fixedCosts: FixedCost[]): number`
- `extraSpendingTotal(items: ExtraSpending[]): number`
- `extraByCardFromSpendings(items: ExtraSpending[]): Record<CardMethod, number>`
- `totalBudgetV2(fixedCosts: FixedCost[], extras: ExtraSpending[]): number`
- `remainingV2(fixedCosts: FixedCost[], incomes: Income[], extras: ExtraSpending[]): number`

- [ ] Step 1: add `ExtraSpending` to `src/types.ts`:
```ts
export interface ExtraSpending {
  id: string;
  yearMonth: string; // "2026-07"
  card: CardMethod;
  name: string;
  amount: number;
  createdAt: string; // ISO timestamp
}
```
- [ ] Step 2: failing tests appended to `src/lib/calc.test.ts`:
```ts
import type { ExtraSpending } from '../types';
import { fixedCostsTotal, extraSpendingTotal, extraByCardFromSpendings, totalBudgetV2, remainingV2 } from './calc';

const ex = (over: Partial<ExtraSpending>): ExtraSpending => ({
  id: Math.random().toString(), yearMonth: '2026-07', card: '현대카드',
  name: 'x', amount: 1000, createdAt: new Date().toISOString(), ...over,
});

describe('extra spending calc', () => {
  const costs = [
    fc({ paymentMethod: '현대카드', amount: 54000 }),
    fc({ paymentMethod: '현금이체', amount: 150000 }),
    fc({ paymentMethod: '현금이체(자동)', amount: 200000, active: false }),
  ];
  it('fixedCostsTotal 활성 전체', () => {
    expect(fixedCostsTotal(costs)).toBe(204000); // 54000+150000 (비활성 제외)
  });
  it('extraSpendingTotal', () => {
    expect(extraSpendingTotal([ex({ amount: 30000 }), ex({ amount: 20000 })])).toBe(50000);
  });
  it('extraByCardFromSpendings', () => {
    const r = extraByCardFromSpendings([ex({ card: '현대카드', amount: 30000 }), ex({ card: '신한카드', amount: 5000 })]);
    expect(r['현대카드']).toBe(30000);
    expect(r['신한카드']).toBe(5000);
    expect(r['삼성카드']).toBe(0);
  });
  it('totalBudgetV2 = 고정비합 + 추가지출합', () => {
    expect(totalBudgetV2(costs, [ex({ amount: 100000 })])).toBe(304000);
  });
  it('remainingV2 = 수입 − totalBudgetV2', () => {
    const incomes = [{ id: 'a', name: '월급', amount: 1000000, active: true }];
    expect(remainingV2(costs, incomes, [ex({ amount: 100000 })])).toBe(696000);
  });
});
```
- [ ] Step 3: RED `npx vitest run src/lib/calc.test.ts`
- [ ] Step 4: implement in `src/lib/calc.ts`:
```ts
import type { /* existing */, ExtraSpending } from '../types';
import { CARD_METHODS } from '../types';

export function fixedCostsTotal(fixedCosts: FixedCost[]): number {
  return activeAmount(fixedCosts);
}
export function extraSpendingTotal(items: ExtraSpending[]): number {
  return items.reduce((a, x) => a + x.amount, 0);
}
export function extraByCardFromSpendings(items: ExtraSpending[]): Record<CardMethod, number> {
  const r = Object.fromEntries(CARD_METHODS.map((c) => [c, 0])) as Record<CardMethod, number>;
  for (const it of items) r[it.card] += it.amount;
  return r;
}
export function totalBudgetV2(fixedCosts: FixedCost[], extras: ExtraSpending[]): number {
  return fixedCostsTotal(fixedCosts) + extraSpendingTotal(extras);
}
export function remainingV2(fixedCosts: FixedCost[], incomes: Income[], extras: ExtraSpending[]): number {
  return incomeTotal(incomes) - totalBudgetV2(fixedCosts, extras);
}
```
- [ ] Step 5: GREEN + full suite. Commit `feat: 추가지출 타입 + calc 순수함수`.

---

### Task 2: Repository extra_spendings CRUD (interface + memory + supabase) (TDD)

**Files:** Modify `src/data/repository.ts`, `src/data/memoryRepository.ts`, `src/data/memoryRepository.test.ts`, `src/data/supabaseRepository.ts`

**Produces (added to `Repository`):**
- `listExtraSpendings(yearMonth: string): Promise<ExtraSpending[]>` (createdAt desc)
- `addExtraSpending(data: { yearMonth: string; card: CardMethod; name: string; amount: number }): Promise<ExtraSpending>`
- `updateExtraSpending(id: string, patch: Partial<{ card: CardMethod; name: string; amount: number }>): Promise<void>`
- `deleteExtraSpending(id: string): Promise<void>`
- `listAllExtraSpendings(): Promise<ExtraSpending[]>`
- `deleteAllExtraSpendings(): Promise<void>`

- [ ] Step 1: add signatures to `Repository` interface.
- [ ] Step 2: failing test in `memoryRepository.test.ts`:
```ts
it('추가지출 CRUD + 월필터', async () => {
  const repo = createSeededMemoryRepository();
  const a = await repo.addExtraSpending({ yearMonth: '2026-07', card: '현대카드', name: '코스트코', amount: 120000 });
  await repo.addExtraSpending({ yearMonth: '2026-06', card: '신한카드', name: '지난달', amount: 5000 });
  expect((await repo.listExtraSpendings('2026-07'))).toHaveLength(1);
  expect((await repo.listAllExtraSpendings())).toHaveLength(2);
  await repo.updateExtraSpending(a.id, { amount: 130000 });
  expect((await repo.listExtraSpendings('2026-07'))[0].amount).toBe(130000);
  await repo.deleteExtraSpending(a.id);
  expect((await repo.listExtraSpendings('2026-07'))).toHaveLength(0);
  await repo.deleteAllExtraSpendings();
  expect((await repo.listAllExtraSpendings())).toHaveLength(0);
});
```
- [ ] Step 3: RED.
- [ ] Step 4: implement in MemoryRepository:
```ts
private extras: ExtraSpending[] = [];
async listExtraSpendings(yearMonth: string) {
  return this.extras.filter((e) => e.yearMonth === yearMonth)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
async addExtraSpending(data: { yearMonth: string; card: CardMethod; name: string; amount: number }) {
  const item: ExtraSpending = { ...data, id: uid(), createdAt: new Date().toISOString() };
  this.extras.push(item); return item;
}
async updateExtraSpending(id: string, patch: Partial<{ card: CardMethod; name: string; amount: number }>) {
  const i = this.extras.findIndex((e) => e.id === id);
  if (i >= 0) this.extras[i] = { ...this.extras[i], ...patch };
}
async deleteExtraSpending(id: string) { this.extras = this.extras.filter((e) => e.id !== id); }
async listAllExtraSpendings() { return [...this.extras]; }
async deleteAllExtraSpendings() { this.extras = []; }
```
- [ ] Step 5: implement in SupabaseRepository (table `extra_spendings`, snake/camel map):
```ts
const toExtra = (r: any): ExtraSpending => ({
  id: r.id, yearMonth: r.year_month, card: r.card, name: r.name, amount: r.amount, createdAt: r.created_at,
});
async listExtraSpendings(yearMonth: string) {
  const { data, error } = await this.db.from('extra_spendings').select('*')
    .eq('year_month', yearMonth).order('created_at', { ascending: false });
  if (error) throw error; return (data ?? []).map(toExtra);
}
async addExtraSpending(d) {
  const { data, error } = await this.db.from('extra_spendings')
    .insert({ year_month: d.yearMonth, card: d.card, name: d.name, amount: d.amount }).select().single();
  if (error) throw error; return toExtra(data);
}
async updateExtraSpending(id, patch) {
  const { error } = await this.db.from('extra_spendings').update({ card: patch.card, name: patch.name, amount: patch.amount }).eq('id', id);
  if (error) throw error;
}
async deleteExtraSpending(id) { const { error } = await this.db.from('extra_spendings').delete().eq('id', id); if (error) throw error; }
async listAllExtraSpendings() {
  const { data, error } = await this.db.from('extra_spendings').select('*').order('created_at', { ascending: false });
  if (error) throw error; return (data ?? []).map(toExtra);
}
async deleteAllExtraSpendings() { const { error } = await this.db.from('extra_spendings').delete().not('id','is',null); if (error) throw error; }
```
- [ ] Step 6: GREEN + build. Commit `feat: Repository extra_spendings CRUD`.

---

### Task 3: 백업에 추가지출 포함 (TDD)

**Files:** Modify `src/lib/backup.ts`, `src/lib/backup.test.ts`

- [ ] Step 1: test: seeded repo + one extra spending → export → import into fresh → extra survives; malformed still guarded.
```ts
it('백업에 추가지출 포함', async () => {
  const src = createSeededMemoryRepository();
  await src.addExtraSpending({ yearMonth: '2026-07', card: '현대카드', name: 'x', amount: 100 });
  const json = await exportData(src);
  const dst = new MemoryRepository();
  await importData(dst, json);
  expect(await dst.listAllExtraSpendings()).toHaveLength(1);
});
```
- [ ] Step 2: RED.
- [ ] Step 3: `exportData` add `extraSpendings: await repo.listAllExtraSpendings()`. `importData`: validate `parsed.extraSpendings` is Array or undefined; after other deletes call `await repo.deleteAllExtraSpendings()`; re-insert via `addExtraSpending({yearMonth,card,name,amount})` (ids/createdAt dropped).
- [ ] Step 4: GREEN. Commit `feat: 백업에 추가지출 포함`.

---

### Task 4: useBudget 훅 확장 + 대시보드 변경

**Files:** Modify `src/hooks/useBudget.ts`; Modify `src/pages/DashboardPage.tsx`; Create `src/components/CardCalculator.tsx`

- [ ] Step 1: useBudget: also load `extras = await repo.listExtraSpendings(yearMonth)`; add to `derived`: `fixedTotal = fixedCostsTotal(fixedCosts)`, `extraTotal = extraSpendingTotal(extras)`, `extraByCard = extraByCardFromSpendings(extras)`, `totalBudget = totalBudgetV2(...)`, `remaining = remainingV2(...)`. Keep `actualByCard`/old actuals for the calculator (`cardActualSum` etc.). Expose `extras` and `reload`.
- [ ] Step 2: DashboardPage: 총 필요 예산/잔여 use new derived; per-card row shows `기준선 {cardBaselines[card]} · 추가지출 {extraByCard[card]}` (read-only); remove old per-card AmountInput; keep 현금이체 합계/수입합계 + donut. Add `<CardCalculator yearMonth={yearMonth} />` collapsible at bottom.
- [ ] Step 3: `CardCalculator.tsx` — collapsible "💳 카드값으로 빠른 계산": loads actuals, per-card AmountInput → setActual+reload, shows `예상 필요 예산 = transferSum + Σ(actual)`. (Reuses `useBudget` transferSum or computes from repo.) Local `open` state.
- [ ] Step 4: `npm run build` + full suite green. Manual: dashboard shows fixed+extra budget. Commit `feat: 대시보드 추가지출 기반 계산 + 카드값 계산기 분리`.

---

### Task 5: 추가지출 탭 (신규 페이지 + 네비)

**Files:** Create `src/pages/ExtraSpendingPage.tsx`; Modify `src/components/BottomNav.tsx`, `src/App.tsx`

- [ ] Step 1: BottomNav add `{ to: '/extra', label: '추가지출' }` between 이번달 and 고정비. App.tsx add route `/extra` → ExtraSpendingPage.
- [ ] Step 2: ExtraSpendingPage: current month; list items (내용 · 카드 배지 · 금액 · 작성일 `createdAt` as YYYY.MM.DD); add form (내용 input + 카드 select + AmountInput) → addExtraSpending; edit/delete(confirm); bottom 이번달 추가지출 합계 via extraSpendingTotal.
- [ ] Step 3: `npm run build` + suite green. Commit `feat: 추가지출 탭`.

---

### Task 6: 히스토리 추가지출 기반으로 변경

**Files:** Modify `src/pages/HistoryPage.tsx`

- [ ] Step 1: replace `listAllActuals` aggregation with `listAllExtraSpendings()` grouped by yearMonth; per month `totalBudget = fixedCostsTotal(fc) + Σ(extra.amount)`, `remaining = incomeTotal(inc) − totalBudget`. Empty-state message when no extras.
- [ ] Step 2: build + suite green. Commit `feat: 히스토리 추가지출 기반 집계`.

---

### Task 7: Supabase 테이블 생성 (사용자 실행)

사용자가 Supabase SQL Editor에서 실행:
```sql
create table if not exists extra_spendings (
  id uuid primary key default gen_random_uuid(),
  year_month text not null,
  card text not null,
  name text not null,
  amount integer not null check (amount >= 0),
  created_at timestamptz not null default now()
);
alter table extra_spendings enable row level security;
create policy "anon all extra_spendings" on extra_spendings for all using (true) with check (true);
grant all privileges on extra_spendings to anon, authenticated;
```
또한 `supabase/schema.sql`에 위 내용 추가(문서화). Commit `docs: extra_spendings 스키마 추가`.

---

## Self-Review
- ✅ 계산 모델(fixedCostsTotal/extraSpendingTotal/totalBudgetV2/remainingV2) → Task 1
- ✅ 데이터/CRUD(6메서드, memory+supabase) → Task 2
- ✅ 백업 포함 → Task 3
- ✅ 대시보드 변경 + 카드계산기 분리 → Task 4
- ✅ 추가지출 탭 + 네비 → Task 5
- ✅ 히스토리 변경 → Task 6
- ✅ Supabase 테이블 → Task 7
- 타입 일관성: `ExtraSpending`, `CardMethod`, 메서드명 전 태스크 통일. created_at 자동/year_month 현재월.

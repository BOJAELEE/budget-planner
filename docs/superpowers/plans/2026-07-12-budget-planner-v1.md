# 가계부 예산 계산기 v1 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 고정비를 등록해두고 이번달 실제 카드값만 입력하면 `총 필요 예산 / 잔여금액 / 고정비 외 카드지출`을 자동 계산해 보여주는 폰 우선 PWA 가계부.

**Architecture:** React 단일 페이지 앱(SPA/PWA). 데이터는 Supabase(클라우드 Postgres)에 저장해 PC↔폰 자동 연동. 데이터 접근은 `Repository` 인터페이스로 추상화하여 테스트는 인메모리 구현으로, 런타임은 Supabase 구현으로 동작한다. 순수 계산 로직(`calc.ts`)을 핵심으로 두고 TDD로 검증한다.

**Tech Stack:** React 18 + Vite + TypeScript + Tailwind CSS + Recharts + Supabase JS 클라이언트 + Vitest/@testing-library. 배포는 GitHub Pages.

## Global Constraints

- 통화 표기: 원화 정수(소수점 없음), 천 단위 콤마. 예: `₩5,838,945`.
- 결제수단 enum(고정): `현대카드 / 신한카드 / 삼성카드 / 현금이체 / 현금이체(자동)`.
- 카드 결제수단(3종): `현대카드 / 신한카드 / 삼성카드`. 이체 결제수단(2종): `현금이체 / 현금이체(자동)`.
- 카테고리: `보험 / 교육비 / 통신요금 / 공과금 / 구독 / 보험&구독 / 계비 / 용돈 / 저금 / 대출 / 생활비 / 기타`.
- 파생값(현금이체 합계·총 필요 예산·잔여금액·고정비 외 지출)은 **저장하지 않고 프론트에서 계산**한다.
- 개인 금융정보 파일(`*.xls`, `*.xlsx`, `_parsed_*.txt`)과 `.env*`는 **절대 커밋 금지** (이미 `.gitignore`에 등록됨).
- 모바일 세로 화면 우선. 디자인 톤: 흰 배경 + 부드러운 카드 그림자 + 파스텔 포인트 + 큰 숫자 타이포(뱅크샐러드풍).
- 모든 금액은 정수(number). 문자열 금액 입력은 파싱 시 콤마 제거 후 정수 변환.

**계산 정의(전 태스크 공통 기준):**
```
현금이체 합계          = Σ(active && method ∈ {현금이체, 현금이체(자동)} 의 amount)
카드 고정비 기준선(카드)  = Σ(active && method == 해당 카드 의 amount)
총 필요 예산           = 현금이체 합계 + Σ(이번달 카드별 실제값)
수입합계              = Σ(active income 의 amount)
잔여금액              = 수입합계 − 총 필요 예산
고정비 외 카드지출(카드)  = 이번달 실제값(카드) − 카드 고정비 기준선(카드)
```

**사전 준비(사용자 수동, Task 6 전까지 필요):** Supabase 무료 프로젝트 생성 → Project URL과 anon key 확보. Task 1~5는 Supabase 없이 진행 가능(인메모리/로컬 테스트).

---

### Task 1: 프로젝트 스캐폴드 (Vite + React + TS + Tailwind)

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `postcss.config.js`, `tailwind.config.js`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `vitest.config.ts`, `src/setupTests.ts`

**Interfaces:**
- Produces: 실행 가능한 개발 서버(`npm run dev`), 테스트 러너(`npm test`), 빌드(`npm run build`).

- [ ] **Step 1: Vite 프로젝트 생성 및 의존성 설치**

프로젝트 루트(`c:/VS CODE/Budget Planner`)에서 실행:
```bash
npm create vite@latest . -- --template react-ts
npm install
npm install -D tailwindcss@3 postcss autoprefixer vitest @testing-library/react @testing-library/jest-dom jsdom @testing-library/user-event
npm install @supabase/supabase-js recharts react-router-dom
npx tailwindcss init -p
```
> `.` 위치에 생성 시 기존 파일 유지 프롬프트가 뜨면 "Ignore files and continue" 선택. 생성 후 `.gitignore`가 덮어써졌다면 개인 금융파일 제외 규칙(`*.xls` 등)이 남아있는지 확인하고 없으면 다시 추가.

- [ ] **Step 2: Tailwind 설정**

`tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#3182F6', soft: '#E8F1FE' },
        pos: '#1DB47C',
        neg: '#F04452',
      },
      boxShadow: { card: '0 2px 12px rgba(0,0,0,0.06)' },
    },
  },
  plugins: [],
};
```

`src/index.css` 최상단:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body { @apply bg-gray-50 text-gray-900; }
```

- [ ] **Step 3: Vitest 설정**

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
});
```

`src/setupTests.ts`:
```ts
import '@testing-library/jest-dom';
```

`package.json`의 `scripts`에 추가:
```json
"test": "vitest run",
"test:watch": "vitest",
"build": "tsc -b && vite build"
```

- [ ] **Step 4: 앱 진입점 최소 구성**

`src/App.tsx`:
```tsx
export default function App() {
  return <div className="p-6 text-2xl font-bold">가계부 예산 계산기</div>;
}
```

`src/main.tsx`:
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 5: 개발 서버·빌드·테스트 동작 확인**

Run: `npm run build`
Expected: 타입 오류 없이 `dist/` 생성.
Run: `npm test`
Expected: "No test files found" (아직 테스트 없음) — 정상.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: Vite+React+TS+Tailwind+Vitest 스캐폴드"
```

---

### Task 2: 도메인 타입 + 시드 데이터

**Files:**
- Create: `src/types.ts`, `src/data/seedData.ts`, `src/data/seedData.test.ts`

**Interfaces:**
- Produces:
  - `PaymentMethod`, `CardMethod`, `TransferMethod`, `Variability`, `Category` 타입
  - `CARD_METHODS: readonly CardMethod[]`, `TRANSFER_METHODS`, `PAYMENT_METHODS`, `CATEGORIES`
  - `FixedCost`, `Income`, `MonthlyCardActual` 인터페이스
  - `SEED_FIXED_COSTS: Omit<FixedCost,'id'>[]`, `SEED_INCOMES: Omit<Income,'id'>[]`

- [ ] **Step 1: 타입 정의**

`src/types.ts`:
```ts
export const CARD_METHODS = ['현대카드', '신한카드', '삼성카드'] as const;
export const TRANSFER_METHODS = ['현금이체', '현금이체(자동)'] as const;
export const PAYMENT_METHODS = [...CARD_METHODS, ...TRANSFER_METHODS] as const;

export type CardMethod = (typeof CARD_METHODS)[number];
export type TransferMethod = (typeof TRANSFER_METHODS)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const CATEGORIES = [
  '보험', '교육비', '통신요금', '공과금', '구독', '보험&구독',
  '계비', '용돈', '저금', '대출', '생활비', '기타',
] as const;
export type Category = (typeof CATEGORIES)[number];

export type Variability = '고정' | '변동';

export interface FixedCost {
  id: string;
  paymentMethod: PaymentMethod;
  category: Category;
  name: string;
  amount: number;
  variability: Variability;
  active: boolean;
  sortOrder: number;
}

export interface Income {
  id: string;
  name: string;
  amount: number;
  active: boolean;
}

export interface MonthlyCardActual {
  id: string;
  yearMonth: string; // "2026-07"
  paymentMethod: CardMethod;
  actualAmount: number;
}

export function isCardMethod(m: PaymentMethod): m is CardMethod {
  return (CARD_METHODS as readonly string[]).includes(m);
}
```

- [ ] **Step 2: 실패하는 테스트 작성 (시드 무결성)**

`src/data/seedData.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { SEED_FIXED_COSTS, SEED_INCOMES } from './seedData';
import { PAYMENT_METHODS, CATEGORIES } from '../types';

describe('시드 데이터', () => {
  it('고정비 39개', () => {
    expect(SEED_FIXED_COSTS).toHaveLength(39);
  });
  it('모든 고정비의 결제수단·카테고리가 유효', () => {
    for (const fc of SEED_FIXED_COSTS) {
      expect(PAYMENT_METHODS).toContain(fc.paymentMethod);
      expect(CATEGORIES).toContain(fc.category);
      expect(fc.amount).toBeGreaterThan(0);
    }
  });
  it('현금이체 합계 = 4,664,052', () => {
    const sum = SEED_FIXED_COSTS
      .filter((f) => f.paymentMethod === '현금이체' || f.paymentMethod === '현금이체(자동)')
      .reduce((a, f) => a + f.amount, 0);
    expect(sum).toBe(4664052);
  });
  it('수입 2개, 합계 5,505,000', () => {
    expect(SEED_INCOMES).toHaveLength(2);
    expect(SEED_INCOMES.reduce((a, i) => a + i.amount, 0)).toBe(5505000);
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npx vitest run src/data/seedData.test.ts`
Expected: FAIL — `Cannot find module './seedData'`.

- [ ] **Step 4: 시드 데이터 구현**

`src/data/seedData.ts`:
```ts
import type { FixedCost, Income } from '../types';

export const SEED_FIXED_COSTS: Omit<FixedCost, 'id'>[] = [
  { paymentMethod: '현대카드', category: '교육비', name: '크런치랩스', amount: 54000, variability: '변동', active: true, sortOrder: 1 },
  { paymentMethod: '현대카드', category: '기타', name: '고속도로 통행료', amount: 50000, variability: '변동', active: true, sortOrder: 2 },
  { paymentMethod: '신한카드', category: '통신요금', name: '스카이라이프_보재&집&정한', amount: 65747, variability: '고정', active: true, sortOrder: 3 },
  { paymentMethod: '신한카드', category: '통신요금', name: 'KT_두동', amount: 29940, variability: '고정', active: true, sortOrder: 4 },
  { paymentMethod: '신한카드', category: '공과금', name: '도시가스', amount: 84000, variability: '변동', active: true, sortOrder: 5 },
  { paymentMethod: '신한카드', category: '공과금', name: '아파트관리비', amount: 240000, variability: '변동', active: true, sortOrder: 6 },
  { paymentMethod: '신한카드', category: '구독', name: '쿠팡', amount: 7890, variability: '고정', active: true, sortOrder: 7 },
  { paymentMethod: '신한카드', category: '구독', name: '넷플릭스', amount: 17000, variability: '고정', active: true, sortOrder: 8 },
  { paymentMethod: '신한카드', category: '구독', name: '디즈니(페이플)', amount: 4465, variability: '고정', active: true, sortOrder: 9 },
  { paymentMethod: '신한카드', category: '구독', name: '유튜브', amount: 23000, variability: '변동', active: true, sortOrder: 10 },
  { paymentMethod: '신한카드', category: '구독', name: '클로드 PRO', amount: 30000, variability: '고정', active: true, sortOrder: 11 },
  { paymentMethod: '신한카드', category: '구독', name: '제미나이(구글원)', amount: 13000, variability: '변동', active: true, sortOrder: 12 },
  { paymentMethod: '신한카드', category: '보험', name: '삼성화재_주아', amount: 14117, variability: '고정', active: true, sortOrder: 13 },
  { paymentMethod: '신한카드', category: '보험', name: '삼성화재_정한', amount: 10347, variability: '고정', active: true, sortOrder: 14 },
  { paymentMethod: '신한카드', category: '보험', name: 'DB_정임', amount: 68860, variability: '고정', active: true, sortOrder: 15 },
  { paymentMethod: '신한카드', category: '보험', name: 'DB_보재', amount: 60140, variability: '고정', active: true, sortOrder: 16 },
  { paymentMethod: '신한카드', category: '보험', name: '메리츠_보재', amount: 40650, variability: '고정', active: true, sortOrder: 17 },
  { paymentMethod: '신한카드', category: '보험', name: '메리츠_보재', amount: 10740, variability: '고정', active: true, sortOrder: 18 },
  { paymentMethod: '신한카드', category: '보험', name: '메리츠_보재', amount: 10660, variability: '고정', active: true, sortOrder: 19 },
  { paymentMethod: '신한카드', category: '보험', name: '현대해상_주아', amount: 54080, variability: '고정', active: true, sortOrder: 20 },
  { paymentMethod: '신한카드', category: '보험', name: '현대해상_주아', amount: 7620, variability: '고정', active: true, sortOrder: 21 },
  { paymentMethod: '신한카드', category: '보험', name: '현대해상_정한', amount: 31940, variability: '고정', active: true, sortOrder: 22 },
  { paymentMethod: '신한카드', category: '보험', name: '현대해상_정한', amount: 7620, variability: '고정', active: true, sortOrder: 23 },
  { paymentMethod: '현금이체', category: '보험', name: 'KB_보재', amount: 50018, variability: '고정', active: true, sortOrder: 24 },
  { paymentMethod: '현금이체', category: '보험', name: '예별손보_보재', amount: 70281, variability: '고정', active: true, sortOrder: 25 },
  { paymentMethod: '현금이체', category: '교육비', name: '코딩학원_정한', amount: 150000, variability: '고정', active: true, sortOrder: 26 },
  { paymentMethod: '현금이체', category: '교육비', name: '댄스학원_주아', amount: 150000, variability: '고정', active: true, sortOrder: 27 },
  { paymentMethod: '현금이체', category: '교육비', name: '수영학원_주아', amount: 157000, variability: '고정', active: true, sortOrder: 28 },
  { paymentMethod: '현금이체', category: '교육비', name: '수영학원_정한', amount: 157000, variability: '고정', active: true, sortOrder: 29 },
  { paymentMethod: '현금이체(자동)', category: '계비', name: '가족계모임비', amount: 50000, variability: '고정', active: true, sortOrder: 30 },
  { paymentMethod: '현금이체(자동)', category: '계비', name: '보재계비', amount: 20000, variability: '고정', active: true, sortOrder: 31 },
  { paymentMethod: '현금이체(자동)', category: '용돈', name: '보재용돈', amount: 200000, variability: '고정', active: true, sortOrder: 32 },
  { paymentMethod: '현금이체(자동)', category: '용돈', name: '정임용돈', amount: 400000, variability: '고정', active: true, sortOrder: 33 },
  { paymentMethod: '현금이체(자동)', category: '보험&구독', name: '보험&구독', amount: 200000, variability: '고정', active: true, sortOrder: 34 },
  { paymentMethod: '현금이체(자동)', category: '생활비', name: '생활비', amount: 1300000, variability: '고정', active: true, sortOrder: 35 },
  { paymentMethod: '현금이체(자동)', category: '대출', name: '주택담보대출', amount: 1104753, variability: '고정', active: true, sortOrder: 36 },
  { paymentMethod: '현금이체(자동)', category: '저금', name: '여행 저금', amount: 250000, variability: '고정', active: true, sortOrder: 37 },
  { paymentMethod: '현금이체(자동)', category: '저금', name: '예비 생활비(월급통장에서)', amount: 300000, variability: '고정', active: true, sortOrder: 38 },
  { paymentMethod: '현금이체(자동)', category: '저금', name: '예비 생활비(양육수당통장에서)', amount: 105000, variability: '고정', active: true, sortOrder: 39 },
];

export const SEED_INCOMES: Omit<Income, 'id'>[] = [
  { name: '월급', amount: 5400000, active: true },
  { name: '아동수당', amount: 105000, active: true },
];
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run src/data/seedData.test.ts`
Expected: PASS (4 tests).
> 만약 "현금이체 합계" 테스트가 4,664,052와 다르면 시드 금액 오타이므로 표와 대조해 수정.

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/data/seedData.ts src/data/seedData.test.ts
git commit -m "feat: 도메인 타입 및 초기 시드 데이터(고정비 39·수입 2)"
```

---

### Task 3: 순수 계산 모듈 (calc.ts) — 핵심

**Files:**
- Create: `src/lib/calc.ts`, `src/lib/calc.test.ts`

**Interfaces:**
- Consumes: `FixedCost`, `Income`, `MonthlyCardActual`, `CardMethod`, `Category` (from `src/types.ts`)
- Produces:
  - `transferTotal(fixedCosts: FixedCost[]): number`
  - `cardBaseline(fixedCosts: FixedCost[], card: CardMethod): number`
  - `incomeTotal(incomes: Income[]): number`
  - `actualsTotal(actuals: MonthlyCardActual[]): number`
  - `totalBudget(fixedCosts: FixedCost[], actuals: MonthlyCardActual[]): number`
  - `remaining(fixedCosts: FixedCost[], incomes: Income[], actuals: MonthlyCardActual[]): number`
  - `extraCardSpending(fixedCosts: FixedCost[], card: CardMethod, actualAmount: number): number`
  - `categoryBreakdown(fixedCosts: FixedCost[]): { category: Category; amount: number }[]`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/calc.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import {
  transferTotal, cardBaseline, incomeTotal, actualsTotal,
  totalBudget, remaining, extraCardSpending, categoryBreakdown,
} from './calc';
import type { FixedCost, Income, MonthlyCardActual } from '../types';

const fc = (over: Partial<FixedCost>): FixedCost => ({
  id: Math.random().toString(), paymentMethod: '신한카드', category: '구독',
  name: 'x', amount: 1000, variability: '고정', active: true, sortOrder: 0, ...over,
});

describe('calc', () => {
  const costs: FixedCost[] = [
    fc({ paymentMethod: '현대카드', amount: 54000, category: '교육비' }),
    fc({ paymentMethod: '신한카드', amount: 65747, category: '통신요금' }),
    fc({ paymentMethod: '삼성카드', amount: 10000, category: '구독' }),
    fc({ paymentMethod: '현금이체', amount: 150000, category: '교육비' }),
    fc({ paymentMethod: '현금이체(자동)', amount: 200000, category: '용돈' }),
    fc({ paymentMethod: '현금이체(자동)', amount: 100000, active: false, category: '저금' }), // 비활성 제외
  ];

  it('현금이체 합계는 활성 이체 항목만', () => {
    expect(transferTotal(costs)).toBe(350000);
  });
  it('카드 기준선은 해당 카드만', () => {
    expect(cardBaseline(costs, '현대카드')).toBe(54000);
    expect(cardBaseline(costs, '신한카드')).toBe(65747);
    expect(cardBaseline(costs, '삼성카드')).toBe(10000);
  });
  it('총 필요 예산 = 현금이체 합계 + 실제 카드값 합', () => {
    const actuals: MonthlyCardActual[] = [
      { id: '1', yearMonth: '2026-07', paymentMethod: '현대카드', actualAmount: 104000 },
      { id: '2', yearMonth: '2026-07', paymentMethod: '신한카드', actualAmount: 831816 },
    ];
    expect(actualsTotal(actuals)).toBe(935816);
    expect(totalBudget(costs, actuals)).toBe(350000 + 935816);
  });
  it('잔여금액 = 수입 - 총 필요 예산', () => {
    const incomes: Income[] = [{ id: 'a', name: '월급', amount: 1000000, active: true }];
    const actuals: MonthlyCardActual[] = [
      { id: '1', yearMonth: '2026-07', paymentMethod: '현대카드', actualAmount: 100000 },
    ];
    // 수입 1,000,000 - (이체 350,000 + 카드 100,000) = 550,000
    expect(remaining(costs, incomes, actuals)).toBe(550000);
  });
  it('고정비 외 카드지출 = 실제값 - 기준선', () => {
    expect(extraCardSpending(costs, '현대카드', 104000)).toBe(50000);
  });
  it('수입합계는 활성만', () => {
    expect(incomeTotal([
      { id: '1', name: '월급', amount: 100, active: true },
      { id: '2', name: 'x', amount: 999, active: false },
    ])).toBe(100);
  });
  it('카테고리별 합계는 금액 내림차순', () => {
    const r = categoryBreakdown(costs);
    expect(r[0].amount).toBeGreaterThanOrEqual(r[r.length - 1].amount);
    const 용돈 = r.find((x) => x.category === '용돈');
    expect(용돈?.amount).toBe(200000); // 비활성 저금 100000은 제외
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/lib/calc.test.ts`
Expected: FAIL — `Cannot find module './calc'`.

- [ ] **Step 3: calc.ts 구현**

`src/lib/calc.ts`:
```ts
import type { FixedCost, Income, MonthlyCardActual, CardMethod, Category } from '../types';
import { TRANSFER_METHODS } from '../types';

const activeAmount = (items: { amount: number; active: boolean }[]) =>
  items.filter((i) => i.active).reduce((a, i) => a + i.amount, 0);

export function transferTotal(fixedCosts: FixedCost[]): number {
  return activeAmount(
    fixedCosts.filter((f) => (TRANSFER_METHODS as readonly string[]).includes(f.paymentMethod)),
  );
}

export function cardBaseline(fixedCosts: FixedCost[], card: CardMethod): number {
  return activeAmount(fixedCosts.filter((f) => f.paymentMethod === card));
}

export function incomeTotal(incomes: Income[]): number {
  return activeAmount(incomes);
}

export function actualsTotal(actuals: MonthlyCardActual[]): number {
  return actuals.reduce((a, x) => a + x.actualAmount, 0);
}

export function totalBudget(fixedCosts: FixedCost[], actuals: MonthlyCardActual[]): number {
  return transferTotal(fixedCosts) + actualsTotal(actuals);
}

export function remaining(
  fixedCosts: FixedCost[], incomes: Income[], actuals: MonthlyCardActual[],
): number {
  return incomeTotal(incomes) - totalBudget(fixedCosts, actuals);
}

export function extraCardSpending(
  fixedCosts: FixedCost[], card: CardMethod, actualAmount: number,
): number {
  return actualAmount - cardBaseline(fixedCosts, card);
}

export function categoryBreakdown(
  fixedCosts: FixedCost[],
): { category: Category; amount: number }[] {
  const map = new Map<Category, number>();
  for (const f of fixedCosts) {
    if (!f.active) continue;
    map.set(f.category, (map.get(f.category) ?? 0) + f.amount);
  }
  return [...map.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/calc.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/calc.ts src/lib/calc.test.ts
git commit -m "feat: 예산 계산 순수 모듈(calc) + 테스트"
```

---

### Task 4: 통화·금액 포맷 유틸

**Files:**
- Create: `src/lib/format.ts`, `src/lib/format.test.ts`

**Interfaces:**
- Produces:
  - `formatKRW(n: number): string` — `₩5,838,945`, 음수는 `-₩94,868`
  - `parseAmount(input: string): number` — 콤마·₩·공백 제거 후 정수. 빈 문자열/NaN은 0.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/format.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { formatKRW, parseAmount } from './format';

describe('format', () => {
  it('원화 천단위 콤마', () => {
    expect(formatKRW(5838945)).toBe('₩5,838,945');
    expect(formatKRW(0)).toBe('₩0');
  });
  it('음수는 마이너스 접두', () => {
    expect(formatKRW(-94868)).toBe('-₩94,868');
  });
  it('parseAmount는 콤마·기호 제거', () => {
    expect(parseAmount('₩1,174,893')).toBe(1174893);
    expect(parseAmount('1,174,893')).toBe(1174893);
    expect(parseAmount('')).toBe(0);
    expect(parseAmount('abc')).toBe(0);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/lib/format.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: format.ts 구현**

`src/lib/format.ts`:
```ts
export function formatKRW(n: number): string {
  const sign = n < 0 ? '-' : '';
  return `${sign}₩${Math.abs(Math.round(n)).toLocaleString('ko-KR')}`;
}

export function parseAmount(input: string): number {
  const cleaned = input.replace(/[^0-9-]/g, '');
  const n = parseInt(cleaned, 10);
  return Number.isNaN(n) ? 0 : n;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/format.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/format.ts src/lib/format.test.ts
git commit -m "feat: 원화 포맷/파싱 유틸"
```

---

### Task 5: Repository 인터페이스 + 인메모리 구현

**Files:**
- Create: `src/data/repository.ts`, `src/data/memoryRepository.ts`, `src/data/memoryRepository.test.ts`

**Interfaces:**
- Consumes: `FixedCost`, `Income`, `MonthlyCardActual`, `CardMethod` (types), `SEED_FIXED_COSTS`, `SEED_INCOMES` (seed)
- Produces:
  - `interface Repository` with:
    - `listFixedCosts(): Promise<FixedCost[]>`
    - `addFixedCost(data: Omit<FixedCost,'id'>): Promise<FixedCost>`
    - `updateFixedCost(id: string, patch: Partial<Omit<FixedCost,'id'>>): Promise<void>`
    - `deleteFixedCost(id: string): Promise<void>`
    - `listIncomes(): Promise<Income[]>`
    - `addIncome(data: Omit<Income,'id'>): Promise<Income>`
    - `updateIncome(id: string, patch: Partial<Omit<Income,'id'>>): Promise<void>`
    - `deleteIncome(id: string): Promise<void>`
    - `listActuals(yearMonth: string): Promise<MonthlyCardActual[]>`
    - `setActual(yearMonth: string, card: CardMethod, amount: number): Promise<void>`
    - `listAllActuals(): Promise<MonthlyCardActual[]>`
  - `class MemoryRepository implements Repository`
  - `createSeededMemoryRepository(): MemoryRepository` — 시드로 채워진 인스턴스

- [ ] **Step 1: 인터페이스 정의**

`src/data/repository.ts`:
```ts
import type { FixedCost, Income, MonthlyCardActual, CardMethod } from '../types';

export interface Repository {
  listFixedCosts(): Promise<FixedCost[]>;
  addFixedCost(data: Omit<FixedCost, 'id'>): Promise<FixedCost>;
  updateFixedCost(id: string, patch: Partial<Omit<FixedCost, 'id'>>): Promise<void>;
  deleteFixedCost(id: string): Promise<void>;

  listIncomes(): Promise<Income[]>;
  addIncome(data: Omit<Income, 'id'>): Promise<Income>;
  updateIncome(id: string, patch: Partial<Omit<Income, 'id'>>): Promise<void>;
  deleteIncome(id: string): Promise<void>;

  listActuals(yearMonth: string): Promise<MonthlyCardActual[]>;
  setActual(yearMonth: string, card: CardMethod, amount: number): Promise<void>;
  listAllActuals(): Promise<MonthlyCardActual[]>;
}
```

- [ ] **Step 2: 실패하는 테스트 작성**

`src/data/memoryRepository.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createSeededMemoryRepository } from './memoryRepository';

describe('MemoryRepository', () => {
  it('시드 고정비 39개 로드', async () => {
    const repo = createSeededMemoryRepository();
    expect(await repo.listFixedCosts()).toHaveLength(39);
  });
  it('고정비 추가/수정/삭제', async () => {
    const repo = createSeededMemoryRepository();
    const added = await repo.addFixedCost({
      paymentMethod: '삼성카드', category: '구독', name: '테스트',
      amount: 5000, variability: '고정', active: true, sortOrder: 99,
    });
    expect((await repo.listFixedCosts())).toHaveLength(40);
    await repo.updateFixedCost(added.id, { amount: 6000 });
    const found = (await repo.listFixedCosts()).find((f) => f.id === added.id);
    expect(found?.amount).toBe(6000);
    await repo.deleteFixedCost(added.id);
    expect(await repo.listFixedCosts()).toHaveLength(39);
  });
  it('카드별 실제값 upsert (같은 월·카드는 덮어쓰기)', async () => {
    const repo = createSeededMemoryRepository();
    await repo.setActual('2026-07', '현대카드', 104000);
    await repo.setActual('2026-07', '현대카드', 120000);
    const list = await repo.listActuals('2026-07');
    expect(list).toHaveLength(1);
    expect(list[0].actualAmount).toBe(120000);
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npx vitest run src/data/memoryRepository.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 4: 인메모리 구현**

`src/data/memoryRepository.ts`:
```ts
import type { FixedCost, Income, MonthlyCardActual, CardMethod } from '../types';
import type { Repository } from './repository';
import { SEED_FIXED_COSTS, SEED_INCOMES } from './seedData';

const uid = () =>
  (globalThis.crypto?.randomUUID?.() ?? `id_${Math.random().toString(36).slice(2)}`);

export class MemoryRepository implements Repository {
  private fixedCosts: FixedCost[] = [];
  private incomes: Income[] = [];
  private actuals: MonthlyCardActual[] = [];

  async listFixedCosts() {
    return [...this.fixedCosts].sort((a, b) => a.sortOrder - b.sortOrder);
  }
  async addFixedCost(data: Omit<FixedCost, 'id'>) {
    const item = { ...data, id: uid() };
    this.fixedCosts.push(item);
    return item;
  }
  async updateFixedCost(id: string, patch: Partial<Omit<FixedCost, 'id'>>) {
    const i = this.fixedCosts.findIndex((f) => f.id === id);
    if (i >= 0) this.fixedCosts[i] = { ...this.fixedCosts[i], ...patch };
  }
  async deleteFixedCost(id: string) {
    this.fixedCosts = this.fixedCosts.filter((f) => f.id !== id);
  }

  async listIncomes() {
    return [...this.incomes];
  }
  async addIncome(data: Omit<Income, 'id'>) {
    const item = { ...data, id: uid() };
    this.incomes.push(item);
    return item;
  }
  async updateIncome(id: string, patch: Partial<Omit<Income, 'id'>>) {
    const i = this.incomes.findIndex((x) => x.id === id);
    if (i >= 0) this.incomes[i] = { ...this.incomes[i], ...patch };
  }
  async deleteIncome(id: string) {
    this.incomes = this.incomes.filter((x) => x.id !== id);
  }

  async listActuals(yearMonth: string) {
    return this.actuals.filter((a) => a.yearMonth === yearMonth);
  }
  async setActual(yearMonth: string, card: CardMethod, amount: number) {
    const i = this.actuals.findIndex(
      (a) => a.yearMonth === yearMonth && a.paymentMethod === card,
    );
    if (i >= 0) this.actuals[i] = { ...this.actuals[i], actualAmount: amount };
    else this.actuals.push({ id: uid(), yearMonth, paymentMethod: card, actualAmount: amount });
  }
  async listAllActuals() {
    return [...this.actuals];
  }
}

export function createSeededMemoryRepository(): MemoryRepository {
  const repo = new MemoryRepository();
  SEED_FIXED_COSTS.forEach((f) => void repo.addFixedCost(f));
  SEED_INCOMES.forEach((i) => void repo.addIncome(i));
  return repo;
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run src/data/memoryRepository.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/data/repository.ts src/data/memoryRepository.ts src/data/memoryRepository.test.ts
git commit -m "feat: Repository 인터페이스 + 인메모리 구현"
```

---

### Task 6: Supabase 스키마·시드 SQL + Supabase Repository

**Files:**
- Create: `supabase/schema.sql`, `supabase/seed.sql`, `src/lib/supabase.ts`, `src/data/supabaseRepository.ts`, `.env.example`
- Modify: `.env.local` (사용자가 직접 값 채움 — 커밋 안 됨)

**Interfaces:**
- Consumes: `Repository` 인터페이스, 도메인 타입
- Produces: `class SupabaseRepository implements Repository`, `getSupabase()` 클라이언트 팩토리

> **사전 준비:** Supabase 프로젝트 생성 → SQL Editor에서 `schema.sql`, `seed.sql` 실행 → Project URL·anon key를 `.env.local`에 기입.
> 이 태스크는 실 DB 연동이라 자동 단위테스트 대신 **수동 스모크 테스트**로 검증한다.

- [ ] **Step 1: 스키마 SQL 작성**

`supabase/schema.sql`:
```sql
create table if not exists fixed_costs (
  id uuid primary key default gen_random_uuid(),
  payment_method text not null,
  category text not null,
  name text not null,
  amount integer not null check (amount >= 0),
  variability text not null default '고정',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists incomes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  amount integer not null check (amount >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists monthly_card_actuals (
  id uuid primary key default gen_random_uuid(),
  year_month text not null,
  payment_method text not null,
  actual_amount integer not null check (actual_amount >= 0),
  unique (year_month, payment_method)
);

-- 개인용: 익명 키로 접근하되 RLS로 전체 허용(단일 사용자 전제).
alter table fixed_costs enable row level security;
alter table incomes enable row level security;
alter table monthly_card_actuals enable row level security;

create policy "anon all fixed_costs" on fixed_costs for all using (true) with check (true);
create policy "anon all incomes" on incomes for all using (true) with check (true);
create policy "anon all actuals" on monthly_card_actuals for all using (true) with check (true);
```
> 주의: 이 RLS는 "anon 키를 아는 사람은 누구나 접근"이다. 개인용·비공개 전제. 추후 보안 강화(로그인) 시 정책 교체.

- [ ] **Step 2: 시드 SQL 작성**

`supabase/seed.sql` — Task 2의 `SEED_FIXED_COSTS`/`SEED_INCOMES`와 동일 값. 실행:
```sql
insert into fixed_costs (payment_method, category, name, amount, variability, active, sort_order) values
('현대카드','교육비','크런치랩스',54000,'변동',true,1),
('현대카드','기타','고속도로 통행료',50000,'변동',true,2),
('신한카드','통신요금','스카이라이프_보재&집&정한',65747,'고정',true,3),
('신한카드','통신요금','KT_두동',29940,'고정',true,4),
('신한카드','공과금','도시가스',84000,'변동',true,5),
('신한카드','공과금','아파트관리비',240000,'변동',true,6),
('신한카드','구독','쿠팡',7890,'고정',true,7),
('신한카드','구독','넷플릭스',17000,'고정',true,8),
('신한카드','구독','디즈니(페이플)',4465,'고정',true,9),
('신한카드','구독','유튜브',23000,'변동',true,10),
('신한카드','구독','클로드 PRO',30000,'고정',true,11),
('신한카드','구독','제미나이(구글원)',13000,'변동',true,12),
('신한카드','보험','삼성화재_주아',14117,'고정',true,13),
('신한카드','보험','삼성화재_정한',10347,'고정',true,14),
('신한카드','보험','DB_정임',68860,'고정',true,15),
('신한카드','보험','DB_보재',60140,'고정',true,16),
('신한카드','보험','메리츠_보재',40650,'고정',true,17),
('신한카드','보험','메리츠_보재',10740,'고정',true,18),
('신한카드','보험','메리츠_보재',10660,'고정',true,19),
('신한카드','보험','현대해상_주아',54080,'고정',true,20),
('신한카드','보험','현대해상_주아',7620,'고정',true,21),
('신한카드','보험','현대해상_정한',31940,'고정',true,22),
('신한카드','보험','현대해상_정한',7620,'고정',true,23),
('현금이체','보험','KB_보재',50018,'고정',true,24),
('현금이체','보험','예별손보_보재',70281,'고정',true,25),
('현금이체','교육비','코딩학원_정한',150000,'고정',true,26),
('현금이체','교육비','댄스학원_주아',150000,'고정',true,27),
('현금이체','교육비','수영학원_주아',157000,'고정',true,28),
('현금이체','교육비','수영학원_정한',157000,'고정',true,29),
('현금이체(자동)','계비','가족계모임비',50000,'고정',true,30),
('현금이체(자동)','계비','보재계비',20000,'고정',true,31),
('현금이체(자동)','용돈','보재용돈',200000,'고정',true,32),
('현금이체(자동)','용돈','정임용돈',400000,'고정',true,33),
('현금이체(자동)','보험&구독','보험&구독',200000,'고정',true,34),
('현금이체(자동)','생활비','생활비',1300000,'고정',true,35),
('현금이체(자동)','대출','주택담보대출',1104753,'고정',true,36),
('현금이체(자동)','저금','여행 저금',250000,'고정',true,37),
('현금이체(자동)','저금','예비 생활비(월급통장에서)',300000,'고정',true,38),
('현금이체(자동)','저금','예비 생활비(양육수당통장에서)',105000,'고정',true,39);

insert into incomes (name, amount, active) values
('월급',5400000,true),
('아동수당',105000,true);
```

- [ ] **Step 3: 환경변수 파일**

`.env.example`:
```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```
사용자는 `.env.local`을 만들어 실제 값 기입(`.env*`는 `.gitignore`로 제외됨).

- [ ] **Step 4: Supabase 클라이언트**

`src/lib/supabase.ts`:
```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  if (!url || !key) throw new Error('Supabase 환경변수(.env.local) 미설정');
  client = createClient(url, key);
  return client;
}
```

- [ ] **Step 5: Supabase Repository 구현**

`src/data/supabaseRepository.ts`:
```ts
import type { FixedCost, Income, MonthlyCardActual, CardMethod } from '../types';
import type { Repository } from './repository';
import { getSupabase } from '../lib/supabase';

// DB(snake_case) ↔ 도메인(camelCase) 매핑
const toFixed = (r: any): FixedCost => ({
  id: r.id, paymentMethod: r.payment_method, category: r.category, name: r.name,
  amount: r.amount, variability: r.variability, active: r.active, sortOrder: r.sort_order,
});
const fromFixed = (d: Partial<Omit<FixedCost, 'id'>>) => ({
  payment_method: d.paymentMethod, category: d.category, name: d.name,
  amount: d.amount, variability: d.variability, active: d.active, sort_order: d.sortOrder,
});

export class SupabaseRepository implements Repository {
  private db = getSupabase();

  async listFixedCosts() {
    const { data, error } = await this.db.from('fixed_costs').select('*').order('sort_order');
    if (error) throw error;
    return (data ?? []).map(toFixed);
  }
  async addFixedCost(d: Omit<FixedCost, 'id'>) {
    const { data, error } = await this.db.from('fixed_costs').insert(fromFixed(d)).select().single();
    if (error) throw error;
    return toFixed(data);
  }
  async updateFixedCost(id: string, patch: Partial<Omit<FixedCost, 'id'>>) {
    const { error } = await this.db.from('fixed_costs').update(fromFixed(patch)).eq('id', id);
    if (error) throw error;
  }
  async deleteFixedCost(id: string) {
    const { error } = await this.db.from('fixed_costs').delete().eq('id', id);
    if (error) throw error;
  }

  async listIncomes() {
    const { data, error } = await this.db.from('incomes').select('*').order('created_at');
    if (error) throw error;
    return (data ?? []) as Income[];
  }
  async addIncome(d: Omit<Income, 'id'>) {
    const { data, error } = await this.db.from('incomes').insert(d).select().single();
    if (error) throw error;
    return data as Income;
  }
  async updateIncome(id: string, patch: Partial<Omit<Income, 'id'>>) {
    const { error } = await this.db.from('incomes').update(patch).eq('id', id);
    if (error) throw error;
  }
  async deleteIncome(id: string) {
    const { error } = await this.db.from('incomes').delete().eq('id', id);
    if (error) throw error;
  }

  async listActuals(yearMonth: string) {
    const { data, error } = await this.db
      .from('monthly_card_actuals').select('*').eq('year_month', yearMonth);
    if (error) throw error;
    return (data ?? []).map((r: any): MonthlyCardActual => ({
      id: r.id, yearMonth: r.year_month, paymentMethod: r.payment_method, actualAmount: r.actual_amount,
    }));
  }
  async setActual(yearMonth: string, card: CardMethod, amount: number) {
    const { error } = await this.db.from('monthly_card_actuals').upsert(
      { year_month: yearMonth, payment_method: card, actual_amount: amount },
      { onConflict: 'year_month,payment_method' },
    );
    if (error) throw error;
  }
  async listAllActuals() {
    const { data, error } = await this.db.from('monthly_card_actuals').select('*');
    if (error) throw error;
    return (data ?? []).map((r: any): MonthlyCardActual => ({
      id: r.id, yearMonth: r.year_month, paymentMethod: r.payment_method, actualAmount: r.actual_amount,
    }));
  }
}
```

- [ ] **Step 6: 수동 스모크 테스트**

`.env.local`에 실제 값 기입 후 `src/App.tsx`에 임시 코드로 `new SupabaseRepository().listFixedCosts()` 호출 → 콘솔에 39개가 찍히는지 확인. 확인 후 임시 코드 제거.
Run: `npm run dev` → 브라우저 콘솔 확인.
Expected: 고정비 39개 배열 로그, 에러 없음.

- [ ] **Step 7: Commit**

```bash
git add supabase/ src/lib/supabase.ts src/data/supabaseRepository.ts .env.example
git commit -m "feat: Supabase 스키마/시드 SQL + SupabaseRepository"
```

---

### Task 7: 데이터 로딩 훅 + Repository 주입

**Files:**
- Create: `src/data/RepositoryContext.tsx`, `src/hooks/useBudget.ts`
- Modify: `src/main.tsx` (RepositoryProvider로 감싸기)

**Interfaces:**
- Consumes: `Repository`, `SupabaseRepository`, `MemoryRepository`, calc 함수들
- Produces:
  - `RepositoryProvider`, `useRepository(): Repository`
  - `useBudget(yearMonth: string)` → `{ fixedCosts, incomes, actuals, loading, reload, derived }` 여기서 `derived = { transferSum, cardBaselines, totalBudget, incomeSum, remaining, extraByCard, breakdown }`

- [ ] **Step 1: Repository 컨텍스트**

`src/data/RepositoryContext.tsx`:
```tsx
import { createContext, useContext, type ReactNode } from 'react';
import type { Repository } from './repository';

const Ctx = createContext<Repository | null>(null);

export function RepositoryProvider({ repo, children }: { repo: Repository; children: ReactNode }) {
  return <Ctx.Provider value={repo}>{children}</Ctx.Provider>;
}

export function useRepository(): Repository {
  const r = useContext(Ctx);
  if (!r) throw new Error('RepositoryProvider 필요');
  return r;
}
```

- [ ] **Step 2: 실패하는 테스트 작성 (파생값 계산 훅)**

`src/hooks/useBudget.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { RepositoryProvider } from '../data/RepositoryContext';
import { createSeededMemoryRepository } from '../data/memoryRepository';
import { useBudget } from './useBudget';
import type { ReactNode } from 'react';

describe('useBudget', () => {
  it('시드 로드 후 파생값 계산', async () => {
    const repo = createSeededMemoryRepository();
    await repo.setActual('2026-07', '현대카드', 104000);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <RepositoryProvider repo={repo}>{children}</RepositoryProvider>
    );
    const { result } = renderHook(() => useBudget('2026-07'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.derived.transferSum).toBe(4664052);
    expect(result.current.derived.incomeSum).toBe(5505000);
    expect(result.current.derived.extraByCard['현대카드']).toBe(50000);
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npx vitest run src/hooks/useBudget.test.tsx`
Expected: FAIL — `useBudget` 모듈 없음.

- [ ] **Step 4: 훅 구현**

`src/hooks/useBudget.ts`:
```ts
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRepository } from '../data/RepositoryContext';
import type { FixedCost, Income, MonthlyCardActual, CardMethod } from '../types';
import { CARD_METHODS } from '../types';
import {
  transferTotal, cardBaseline, incomeTotal, totalBudget, remaining,
  extraCardSpending, categoryBreakdown, actualsTotal,
} from '../lib/calc';

export function useBudget(yearMonth: string) {
  const repo = useRepository();
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [actuals, setActuals] = useState<MonthlyCardActual[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const [fc, inc, act] = await Promise.all([
      repo.listFixedCosts(), repo.listIncomes(), repo.listActuals(yearMonth),
    ]);
    setFixedCosts(fc); setIncomes(inc); setActuals(act); setLoading(false);
  }, [repo, yearMonth]);

  useEffect(() => { void reload(); }, [reload]);

  const derived = useMemo(() => {
    const cardBaselines = Object.fromEntries(
      CARD_METHODS.map((c) => [c, cardBaseline(fixedCosts, c)]),
    ) as Record<CardMethod, number>;
    const actualByCard = Object.fromEntries(
      CARD_METHODS.map((c) => [c, actuals.find((a) => a.paymentMethod === c)?.actualAmount ?? 0]),
    ) as Record<CardMethod, number>;
    const extraByCard = Object.fromEntries(
      CARD_METHODS.map((c) => [c, extraCardSpending(fixedCosts, c, actualByCard[c])]),
    ) as Record<CardMethod, number>;
    return {
      transferSum: transferTotal(fixedCosts),
      cardBaselines,
      actualByCard,
      extraByCard,
      totalBudget: totalBudget(fixedCosts, actuals),
      incomeSum: incomeTotal(incomes),
      remaining: remaining(fixedCosts, incomes, actuals),
      breakdown: categoryBreakdown(fixedCosts),
    };
  }, [fixedCosts, incomes, actuals]);

  return { fixedCosts, incomes, actuals, loading, reload, derived };
}
```

- [ ] **Step 5: main.tsx에서 Provider 주입**

`src/main.tsx` 수정 (런타임은 Supabase 사용):
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { RepositoryProvider } from './data/RepositoryContext';
import { SupabaseRepository } from './data/supabaseRepository';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RepositoryProvider repo={new SupabaseRepository()}>
      <App />
    </RepositoryProvider>
  </React.StrictMode>,
);
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `npx vitest run src/hooks/useBudget.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/data/RepositoryContext.tsx src/hooks/useBudget.ts src/hooks/useBudget.test.tsx src/main.tsx
git commit -m "feat: Repository 컨텍스트 + useBudget 훅(파생값 계산)"
```

---

### Task 8: 공통 UI 컴포넌트 (숫자 카드·금액 입력)

**Files:**
- Create: `src/components/StatCard.tsx`, `src/components/AmountInput.tsx`, `src/components/StatCard.test.tsx`

**Interfaces:**
- Produces:
  - `StatCard({ label, amount, tone }: { label: string; amount: number; tone?: 'default'|'pos'|'neg' })`
  - `AmountInput({ value, onCommit }: { value: number; onCommit: (n: number) => void })` — 숫자 입력, blur/Enter 시 `parseAmount` 후 `onCommit`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/StatCard.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatCard } from './StatCard';

describe('StatCard', () => {
  it('라벨과 포맷된 금액 표시', () => {
    render(<StatCard label="총 필요 예산" amount={5838945} />);
    expect(screen.getByText('총 필요 예산')).toBeInTheDocument();
    expect(screen.getByText('₩5,838,945')).toBeInTheDocument();
  });
  it('음수 tone=neg면 음수 금액 표시', () => {
    render(<StatCard label="잔여금액" amount={-94868} tone="neg" />);
    expect(screen.getByText('-₩94,868')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/components/StatCard.test.tsx`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 컴포넌트 구현**

`src/components/StatCard.tsx`:
```tsx
import { formatKRW } from '../lib/format';

export function StatCard({
  label, amount, tone = 'default',
}: { label: string; amount: number; tone?: 'default' | 'pos' | 'neg' }) {
  const color = tone === 'pos' ? 'text-pos' : tone === 'neg' ? 'text-neg' : 'text-gray-900';
  return (
    <div className="rounded-2xl bg-white shadow-card p-5">
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${color}`}>{formatKRW(amount)}</div>
    </div>
  );
}
```

`src/components/AmountInput.tsx`:
```tsx
import { useState, useEffect } from 'react';
import { parseAmount, formatKRW } from '../lib/format';

export function AmountInput({
  value, onCommit,
}: { value: number; onCommit: (n: number) => void }) {
  const [text, setText] = useState(value ? value.toLocaleString('ko-KR') : '');
  useEffect(() => { setText(value ? value.toLocaleString('ko-KR') : ''); }, [value]);

  const commit = () => {
    const n = parseAmount(text);
    setText(n ? n.toLocaleString('ko-KR') : '');
    onCommit(n);
  };
  return (
    <input
      inputMode="numeric"
      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-right text-lg"
      value={text}
      placeholder={formatKRW(0)}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
    />
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/components/StatCard.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/StatCard.tsx src/components/AmountInput.tsx src/components/StatCard.test.tsx
git commit -m "feat: 공통 컴포넌트 StatCard/AmountInput"
```

---

### Task 9: 라우팅 + 하단 탭 네비게이션 (앱 셸)

**Files:**
- Create: `src/components/BottomNav.tsx`, `src/pages/DashboardPage.tsx`, `src/pages/FixedCostsPage.tsx`, `src/pages/IncomePage.tsx`, `src/pages/HistoryPage.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: react-router-dom
- Produces: 4개 경로(`/`, `/fixed`, `/income`, `/history`)와 하단 탭. 각 페이지는 이 태스크에서 제목만 있는 스텁으로 만들고 이후 태스크에서 채운다.

- [ ] **Step 1: 페이지 스텁 4개 생성**

각 파일 동일 패턴 (제목만):
`src/pages/DashboardPage.tsx`:
```tsx
export default function DashboardPage() {
  return <div className="p-4"><h1 className="text-xl font-bold">이번달</h1></div>;
}
```
`src/pages/FixedCostsPage.tsx`:
```tsx
export default function FixedCostsPage() {
  return <div className="p-4"><h1 className="text-xl font-bold">고정비</h1></div>;
}
```
`src/pages/IncomePage.tsx`:
```tsx
export default function IncomePage() {
  return <div className="p-4"><h1 className="text-xl font-bold">수입</h1></div>;
}
```
`src/pages/HistoryPage.tsx`:
```tsx
export default function HistoryPage() {
  return <div className="p-4"><h1 className="text-xl font-bold">히스토리</h1></div>;
}
```

- [ ] **Step 2: 하단 네비게이션**

`src/components/BottomNav.tsx`:
```tsx
import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/', label: '이번달' },
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
            `flex-1 py-3 text-center text-sm ${isActive ? 'text-brand font-semibold' : 'text-gray-400'}`
          }
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
```

- [ ] **Step 3: App.tsx 라우팅**

`src/App.tsx`:
```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import DashboardPage from './pages/DashboardPage';
import FixedCostsPage from './pages/FixedCostsPage';
import IncomePage from './pages/IncomePage';
import HistoryPage from './pages/HistoryPage';

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div className="mx-auto max-w-md pb-16">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/fixed" element={<FixedCostsPage />} />
          <Route path="/income" element={<IncomePage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}
```

- [ ] **Step 4: 수동 확인**

Run: `npm run dev`
Expected: 하단 탭 4개, 탭 전환 시 각 제목 표시.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/components/BottomNav.tsx src/pages/
git commit -m "feat: 라우팅 + 하단 탭 네비게이션(앱 셸)"
```

---

### Task 10: 대시보드 페이지 (메인)

**Files:**
- Create: `src/components/CategoryDonut.tsx`
- Modify: `src/pages/DashboardPage.tsx`

**Interfaces:**
- Consumes: `useBudget`, `StatCard`, `AmountInput`, `useRepository`, calc 파생값, Recharts
- Produces: 완성된 대시보드 화면

- [ ] **Step 1: 현재 연월 유틸 인라인 + 카테고리 도넛**

`src/components/CategoryDonut.tsx`:
```tsx
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatKRW } from '../lib/format';

const COLORS = ['#3182F6', '#1DB47C', '#F7A64B', '#9B7EDE', '#F0658A', '#4BC0C0', '#B0B8C1', '#5B8DEF'];

export function CategoryDonut({ data }: { data: { category: string; amount: number }[] }) {
  return (
    <div className="rounded-2xl bg-white shadow-card p-4">
      <div className="text-sm text-gray-500 mb-2">카테고리별 고정비</div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="amount" nameKey="category" innerRadius={55} outerRadius={90}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v: number) => formatKRW(v)} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: 대시보드 구현**

`src/pages/DashboardPage.tsx`:
```tsx
import { useState } from 'react';
import { useBudget } from '../hooks/useBudget';
import { useRepository } from '../data/RepositoryContext';
import { StatCard } from '../components/StatCard';
import { AmountInput } from '../components/AmountInput';
import { CategoryDonut } from '../components/CategoryDonut';
import { CARD_METHODS } from '../types';
import { formatKRW } from '../lib/format';

const nowYearMonth = () => new Date().toISOString().slice(0, 7);

export default function DashboardPage() {
  const [yearMonth] = useState(nowYearMonth());
  const repo = useRepository();
  const { loading, derived, reload } = useBudget(yearMonth);

  if (loading) return <div className="p-8 text-center text-gray-400">불러오는 중…</div>;

  const onCommitActual = async (card: (typeof CARD_METHODS)[number], n: number) => {
    await repo.setActual(yearMonth, card, n);
    await reload();
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">{yearMonth.replace('-', '년 ')}월</h1>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="총 필요 예산" amount={derived.totalBudget} />
        <StatCard
          label="잔여금액"
          amount={derived.remaining}
          tone={derived.remaining < 0 ? 'neg' : 'pos'}
        />
      </div>

      <div className="rounded-2xl bg-white shadow-card p-4 space-y-4">
        <div className="text-sm text-gray-500">이번달 실제 카드값 입력</div>
        {CARD_METHODS.map((card) => (
          <div key={card} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{card}</span>
              <span className="text-gray-400">
                기준선 {formatKRW(derived.cardBaselines[card])}
              </span>
            </div>
            <AmountInput
              value={derived.actualByCard[card]}
              onCommit={(n) => onCommitActual(card, n)}
            />
            <div className="text-right text-xs">
              고정비 외 지출{' '}
              <span className={derived.extraByCard[card] > 0 ? 'text-neg font-semibold' : 'text-gray-400'}>
                {formatKRW(derived.extraByCard[card])}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white shadow-card p-4 text-sm text-gray-600">
        현금이체 합계 <b>{formatKRW(derived.transferSum)}</b> · 수입합계{' '}
        <b>{formatKRW(derived.incomeSum)}</b>
      </div>

      <CategoryDonut data={derived.breakdown} />
    </div>
  );
}
```

- [ ] **Step 3: 수동 확인**

Run: `npm run dev`
Expected: 총 필요 예산·잔여금액 표시, 카드 3종 실제값 입력 시 "고정비 외 지출"·총 예산·잔여가 즉시 갱신, 도넛 차트 표시. (Supabase 연결 상태 필요)

- [ ] **Step 4: Commit**

```bash
git add src/pages/DashboardPage.tsx src/components/CategoryDonut.tsx
git commit -m "feat: 대시보드 페이지(예산 요약·카드 입력·도넛)"
```

---

### Task 11: 고정비 관리 페이지

**Files:**
- Create: `src/components/FixedCostEditor.tsx`
- Modify: `src/pages/FixedCostsPage.tsx`

**Interfaces:**
- Consumes: `useBudget`(fixedCosts 재사용) 또는 직접 `useRepository`, `PAYMENT_METHODS`, `CATEGORIES`, `AmountInput`
- Produces: 결제수단별 그룹 리스트 + 항목 추가/수정/삭제 UI

- [ ] **Step 1: 항목 편집 폼 컴포넌트**

`src/components/FixedCostEditor.tsx`:
```tsx
import { useState } from 'react';
import type { FixedCost } from '../types';
import { PAYMENT_METHODS, CATEGORIES } from '../types';
import { AmountInput } from './AmountInput';

export type FixedCostDraft = Omit<FixedCost, 'id'>;

export function FixedCostEditor({
  initial, onSave, onCancel,
}: { initial: FixedCostDraft; onSave: (d: FixedCostDraft) => void; onCancel: () => void }) {
  const [d, setD] = useState<FixedCostDraft>(initial);
  return (
    <div className="rounded-xl border border-gray-200 p-3 space-y-2 bg-gray-50">
      <input
        className="w-full rounded-lg border px-2 py-1"
        placeholder="이름" value={d.name}
        onChange={(e) => setD({ ...d, name: e.target.value })}
      />
      <div className="flex gap-2">
        <select className="flex-1 rounded-lg border px-2 py-1" value={d.paymentMethod}
          onChange={(e) => setD({ ...d, paymentMethod: e.target.value as FixedCost['paymentMethod'] })}>
          {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
        </select>
        <select className="flex-1 rounded-lg border px-2 py-1" value={d.category}
          onChange={(e) => setD({ ...d, category: e.target.value as FixedCost['category'] })}>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <AmountInput value={d.amount} onCommit={(n) => setD({ ...d, amount: n })} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={d.variability === '변동'}
          onChange={(e) => setD({ ...d, variability: e.target.checked ? '변동' : '고정' })} />
        변동 항목(금액이 매달 바뀜)
      </label>
      <div className="flex gap-2 justify-end">
        <button className="px-3 py-1 text-gray-500" onClick={onCancel}>취소</button>
        <button className="px-3 py-1 rounded-lg bg-brand text-white" onClick={() => onSave(d)}>저장</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 고정비 페이지 구현**

`src/pages/FixedCostsPage.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { useRepository } from '../data/RepositoryContext';
import type { FixedCost } from '../types';
import { PAYMENT_METHODS } from '../types';
import { FixedCostEditor, type FixedCostDraft } from '../components/FixedCostEditor';
import { formatKRW } from '../lib/format';
import { transferTotal } from '../lib/calc';

const blankDraft: FixedCostDraft = {
  paymentMethod: '신한카드', category: '구독', name: '', amount: 0,
  variability: '고정', active: true, sortOrder: 999,
};

export default function FixedCostsPage() {
  const repo = useRepository();
  const [items, setItems] = useState<FixedCost[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = async () => setItems(await repo.listFixedCosts());
  useEffect(() => { void load(); }, []);

  const save = async (id: string | null, d: FixedCostDraft) => {
    if (id) await repo.updateFixedCost(id, d);
    else await repo.addFixedCost(d);
    setEditingId(null); setAdding(false); await load();
  };
  const remove = async (id: string) => {
    if (confirm('삭제할까요?')) { await repo.deleteFixedCost(id); await load(); }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">고정비</h1>
        <button className="px-3 py-1 rounded-lg bg-brand text-white text-sm"
          onClick={() => setAdding(true)}>+ 추가</button>
      </div>
      {adding && (
        <FixedCostEditor initial={blankDraft}
          onSave={(d) => save(null, d)} onCancel={() => setAdding(false)} />
      )}
      {PAYMENT_METHODS.map((method) => {
        const group = items.filter((i) => i.paymentMethod === method);
        if (group.length === 0) return null;
        const sum = group.filter((g) => g.active).reduce((a, g) => a + g.amount, 0);
        return (
          <div key={method} className="space-y-2">
            <div className="flex justify-between text-sm font-semibold text-gray-700">
              <span>{method}</span><span>{formatKRW(sum)}</span>
            </div>
            {group.map((item) => editingId === item.id ? (
              <FixedCostEditor key={item.id} initial={item}
                onSave={(d) => save(item.id, d)} onCancel={() => setEditingId(null)} />
            ) : (
              <div key={item.id} className="flex items-center justify-between rounded-xl bg-white shadow-card px-3 py-2">
                <div>
                  <div className="font-medium">
                    {item.name}
                    {item.variability === '변동' && (
                      <span className="ml-2 text-xs rounded bg-amber-100 text-amber-700 px-1.5 py-0.5">변동</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">{item.category}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{formatKRW(item.amount)}</span>
                  <button className="text-gray-400 text-sm" onClick={() => setEditingId(item.id)}>수정</button>
                  <button className="text-neg text-sm" onClick={() => remove(item.id)}>삭제</button>
                </div>
              </div>
            ))}
          </div>
        );
      })}
      <div className="rounded-2xl bg-brand-soft p-4 text-sm">
        현금이체 합계 <b>{formatKRW(transferTotal(items))}</b>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 수동 확인**

Run: `npm run dev` → 고정비 탭
Expected: 결제수단별 그룹·금액 표시, 추가/수정/삭제 동작, 하단 현금이체 합계 4,664,052 표시.

- [ ] **Step 4: Commit**

```bash
git add src/pages/FixedCostsPage.tsx src/components/FixedCostEditor.tsx
git commit -m "feat: 고정비 관리 페이지(추가·수정·삭제·그룹합계)"
```

---

### Task 12: 수입 관리 페이지

**Files:**
- Modify: `src/pages/IncomePage.tsx`

**Interfaces:**
- Consumes: `useRepository`, `AmountInput`, `incomeTotal`
- Produces: 수입 항목 추가/수정/삭제 + 수입합계 표시

- [ ] **Step 1: 수입 페이지 구현**

`src/pages/IncomePage.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { useRepository } from '../data/RepositoryContext';
import type { Income } from '../types';
import { AmountInput } from '../components/AmountInput';
import { formatKRW } from '../lib/format';
import { incomeTotal } from '../lib/calc';

export default function IncomePage() {
  const repo = useRepository();
  const [items, setItems] = useState<Income[]>([]);
  const [newName, setNewName] = useState('');

  const load = async () => setItems(await repo.listIncomes());
  useEffect(() => { void load(); }, []);

  const add = async () => {
    if (!newName.trim()) return;
    await repo.addIncome({ name: newName.trim(), amount: 0, active: true });
    setNewName(''); await load();
  };
  const setAmount = async (id: string, amount: number) => {
    await repo.updateIncome(id, { amount }); await load();
  };
  const remove = async (id: string) => {
    if (confirm('삭제할까요?')) { await repo.deleteIncome(id); await load(); }
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">수입</h1>
      {items.map((it) => (
        <div key={it.id} className="rounded-xl bg-white shadow-card px-3 py-2 space-y-1">
          <div className="flex justify-between items-center">
            <span className="font-medium">{it.name}</span>
            <button className="text-neg text-sm" onClick={() => remove(it.id)}>삭제</button>
          </div>
          <AmountInput value={it.amount} onCommit={(n) => setAmount(it.id, n)} />
        </div>
      ))}
      <div className="flex gap-2">
        <input className="flex-1 rounded-lg border px-2 py-2" placeholder="새 수입 이름(예: 상여금)"
          value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button className="px-3 rounded-lg bg-brand text-white" onClick={add}>추가</button>
      </div>
      <div className="rounded-2xl bg-brand-soft p-4 text-sm">
        수입합계 <b>{formatKRW(incomeTotal(items))}</b>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 수동 확인**

Run: `npm run dev` → 수입 탭
Expected: 월급·아동수당 표시(합계 5,505,000), 추가/금액수정/삭제 동작.

- [ ] **Step 3: Commit**

```bash
git add src/pages/IncomePage.tsx
git commit -m "feat: 수입 관리 페이지"
```

---

### Task 13: 월 히스토리 페이지

**Files:**
- Create: `src/components/HistoryChart.tsx`
- Modify: `src/pages/HistoryPage.tsx`

**Interfaces:**
- Consumes: `useRepository`(listAllActuals, listFixedCosts, listIncomes), calc, Recharts
- Produces: 월별 `총 필요 예산 / 잔여금액` 추이 (현재 고정비·수입 기준으로 계산)

- [ ] **Step 1: 히스토리 차트 컴포넌트**

`src/components/HistoryChart.tsx`:
```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatKRW } from '../lib/format';

export function HistoryChart({
  data,
}: { data: { yearMonth: string; totalBudget: number; remaining: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <XAxis dataKey="yearMonth" tick={{ fontSize: 11 }} />
        <YAxis hide />
        <Tooltip formatter={(v: number) => formatKRW(v)} />
        <Bar dataKey="totalBudget" fill="#3182F6" name="총 필요 예산" radius={[4, 4, 0, 0]} />
        <Bar dataKey="remaining" fill="#1DB47C" name="잔여금액" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: 히스토리 페이지 구현**

`src/pages/HistoryPage.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { useRepository } from '../data/RepositoryContext';
import type { FixedCost, Income, MonthlyCardActual } from '../types';
import { transferTotal, incomeTotal } from '../lib/calc';
import { HistoryChart } from '../components/HistoryChart';
import { formatKRW } from '../lib/format';

export default function HistoryPage() {
  const repo = useRepository();
  const [rows, setRows] = useState<{ yearMonth: string; totalBudget: number; remaining: number }[]>([]);

  useEffect(() => {
    (async () => {
      const [fc, inc, acts] = await Promise.all([
        repo.listFixedCosts(), repo.listIncomes(), repo.listAllActuals(),
      ]);
      const transfer = transferTotal(fc as FixedCost[]);
      const income = incomeTotal(inc as Income[]);
      const byMonth = new Map<string, number>();
      (acts as MonthlyCardActual[]).forEach((a) => {
        byMonth.set(a.yearMonth, (byMonth.get(a.yearMonth) ?? 0) + a.actualAmount);
      });
      const result = [...byMonth.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([yearMonth, cardSum]) => {
          const totalBudget = transfer + cardSum;
          return { yearMonth, totalBudget, remaining: income - totalBudget };
        });
      setRows(result);
    })();
  }, [repo]);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">월 히스토리</h1>
      {rows.length === 0 ? (
        <p className="text-gray-400 text-sm">아직 데이터가 없습니다. 이번달 카드값을 입력하면 쌓입니다.</p>
      ) : (
        <>
          <div className="rounded-2xl bg-white shadow-card p-4"><HistoryChart data={rows} /></div>
          {rows.map((r) => (
            <div key={r.yearMonth} className="flex justify-between rounded-xl bg-white shadow-card px-3 py-2 text-sm">
              <span className="font-medium">{r.yearMonth}</span>
              <span>예산 {formatKRW(r.totalBudget)} · 잔여{' '}
                <b className={r.remaining < 0 ? 'text-neg' : 'text-pos'}>{formatKRW(r.remaining)}</b>
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 수동 확인**

Run: `npm run dev` → 히스토리 탭
Expected: 카드값 입력한 달의 예산·잔여 막대그래프와 리스트.

- [ ] **Step 4: Commit**

```bash
git add src/pages/HistoryPage.tsx src/components/HistoryChart.tsx
git commit -m "feat: 월 히스토리 페이지(추이 차트)"
```

---

### Task 14: 백업 내보내기/불러오기 (JSON)

**Files:**
- Create: `src/lib/backup.ts`, `src/lib/backup.test.ts`, `src/components/BackupPanel.tsx`
- Modify: `src/pages/IncomePage.tsx` (백업 패널을 수입 탭 하단에 배치) 또는 별도 진입점

**Interfaces:**
- Produces:
  - `exportData(repo: Repository): Promise<string>` — 전체 데이터를 JSON 문자열로
  - `importData(repo: Repository, json: string): Promise<void>` — JSON을 파싱해 DB에 복원(기존 삭제 후 삽입)
  - `BackupPanel` — 다운로드/파일 선택 UI

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/backup.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { exportData, importData } from './backup';
import { createSeededMemoryRepository, MemoryRepository } from '../data/memoryRepository';

describe('backup', () => {
  it('내보낸 JSON을 새 저장소로 복원하면 동일 개수', async () => {
    const src = createSeededMemoryRepository();
    await src.setActual('2026-07', '현대카드', 104000);
    const json = await exportData(src);

    const dst = new MemoryRepository();
    await importData(dst, json);
    expect(await dst.listFixedCosts()).toHaveLength(39);
    expect(await dst.listIncomes()).toHaveLength(2);
    expect(await dst.listAllActuals()).toHaveLength(1);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/lib/backup.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: backup.ts 구현**

`src/lib/backup.ts`:
```ts
import type { Repository } from '../data/repository';

export async function exportData(repo: Repository): Promise<string> {
  const [fixedCosts, incomes, actuals] = await Promise.all([
    repo.listFixedCosts(), repo.listIncomes(), repo.listAllActuals(),
  ]);
  return JSON.stringify({ version: 1, fixedCosts, incomes, actuals }, null, 2);
}

export async function importData(repo: Repository, json: string): Promise<void> {
  const parsed = JSON.parse(json) as {
    fixedCosts: any[]; incomes: any[]; actuals: any[];
  };
  // 기존 데이터 제거
  for (const f of await repo.listFixedCosts()) await repo.deleteFixedCost(f.id);
  for (const i of await repo.listIncomes()) await repo.deleteIncome(i.id);
  // 복원 (id 제외하고 재삽입)
  for (const f of parsed.fixedCosts) {
    const { id, ...rest } = f; await repo.addFixedCost(rest);
  }
  for (const i of parsed.incomes) {
    const { id, ...rest } = i; await repo.addIncome(rest);
  }
  for (const a of parsed.actuals ?? []) {
    await repo.setActual(a.yearMonth, a.paymentMethod, a.actualAmount);
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/backup.test.ts`
Expected: PASS.

- [ ] **Step 5: 백업 UI 패널**

`src/components/BackupPanel.tsx`:
```tsx
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
```

`src/pages/IncomePage.tsx` 하단(수입합계 아래)에 추가:
```tsx
// import { BackupPanel } from '../components/BackupPanel';  ← 상단 import에 추가
// 수입합계 div 다음 줄에:
<BackupPanel />
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/backup.ts src/lib/backup.test.ts src/components/BackupPanel.tsx src/pages/IncomePage.tsx
git commit -m "feat: JSON 백업 내보내기/불러오기"
```

---

### Task 15: PWA 설정 (홈 화면 설치)

**Files:**
- Create: `public/manifest.webmanifest`, `public/icon-192.png`, `public/icon-512.png`
- Modify: `index.html`, `vite.config.ts`

**Interfaces:**
- Produces: 설치 가능한 PWA(매니페스트 + 아이콘 + 서비스워커)

- [ ] **Step 1: vite-plugin-pwa 설치**

```bash
npm install -D vite-plugin-pwa
```

- [ ] **Step 2: vite.config.ts에 PWA + GitHub Pages base 설정**

`vite.config.ts`:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages 리포지토리명으로 base 설정 (예: /budget-planner/)
export default defineConfig({
  base: '/budget-planner/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: '가계부 예산 계산기',
        short_name: '가계부',
        theme_color: '#3182F6',
        background_color: '#F9FAFB',
        display: 'standalone',
        start_url: '/budget-planner/',
        scope: '/budget-planner/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
});
```
> `base`와 manifest의 `start_url`/`scope`는 실제 GitHub 리포 이름과 일치시켜야 함. 리포명이 다르면 3곳 모두 수정.

- [ ] **Step 3: 아이콘 생성**

`public/icon-192.png`, `public/icon-512.png` 배치 (파란 배경 + 흰 통장/지갑 심볼 등 단색 PNG). 임시로 단색 사각형 PNG라도 배치해 설치가 되게 한다.

- [ ] **Step 4: 빌드 확인**

Run: `npm run build`
Expected: `dist/`에 `manifest.webmanifest`, `sw.js` 생성. 오류 없음.

- [ ] **Step 5: 로컬 미리보기로 설치 확인**

Run: `npm run preview`
Expected: 브라우저 주소창에 "설치" 아이콘 노출(PWA 인식).

- [ ] **Step 6: Commit**

```bash
git add vite.config.ts index.html public/
git commit -m "feat: PWA(매니페스트·서비스워커·아이콘)"
```

---

### Task 16: GitHub Pages 배포

**Files:**
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- Produces: main 브랜치 푸시 시 GitHub Pages 자동 배포. GitHub Actions에 Supabase 환경변수(Secrets) 주입.

> **사전 준비:** GitHub 저장소 생성 → 원격 연결. Settings → Secrets에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 등록. Settings → Pages → Source를 "GitHub Actions"로.

- [ ] **Step 1: 배포 워크플로 작성**

`.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: SPA 라우팅 404 대응**

GitHub Pages는 SPA 새로고침 시 404가 나므로, 빌드 후 `dist/404.html`을 `index.html` 복사본으로 둔다. `package.json` build 스크립트를 확장:
```json
"build": "tsc -b && vite build && node -e \"require('fs').copyFileSync('dist/index.html','dist/404.html')\""
```
> 또는 `HashRouter` 사용도 가능하나, 위 방식이 URL이 깔끔함.

- [ ] **Step 3: 원격 연결 및 푸시**

```bash
git remote add origin https://github.com/<user>/budget-planner.git
git branch -M main
git push -u origin main
```

- [ ] **Step 4: 배포 확인**

Actions 탭에서 워크플로 성공 확인 → `https://<user>.github.io/budget-planner/` 접속.
Expected: 앱 로드, Supabase 데이터 표시, 폰에서 홈 화면 설치 가능.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/deploy.yml package.json
git commit -m "ci: GitHub Pages 자동 배포 + SPA 404 대응"
git push
```

---

## Self-Review (계획 검토)

**스펙 커버리지:**
- ✅ 핵심 계산 모델(현금이체/카드 기준선/총예산/잔여/고정비외지출) → Task 3, 7
- ✅ 데이터 구조 3종(fixed_costs/incomes/monthly_card_actuals) → Task 2, 6
- ✅ 화면 4개(대시보드/고정비/수입/히스토리) → Task 10~13
- ✅ 뱅크샐러드풍 UI(카드 그림자·큰 숫자·도넛) → Task 8, 10
- ✅ 결제수단 5종(삼성카드 포함) → Task 2
- ✅ React+Vite+TS+Tailwind+Recharts+Supabase → Task 1, 6
- ✅ GitHub Pages 배포 + PWA → Task 15, 16
- ✅ PC↔폰 연동(Supabase 공용 DB) → Task 6, 7
- ✅ 백업 내보내기/불러오기 → Task 14
- ✅ 초기 시드(고정비 39·수입 2) → Task 2, 6
- ✅ 금융파일 커밋 금지(.gitignore) → Global Constraints(기존 반영)

**범위 밖(YAGNI) 확인:** 카드 스크래핑·SMS 자동수집·체크카드 상세·다중사용자·과거 고정비 이력 → 계획에 미포함(정상, Phase 2).

**타입 일관성:** `Repository` 메서드 시그니처가 Task 5 정의와 Task 6·7·14 사용처에서 일치. `CardMethod`/`PaymentMethod`/`Category` 명칭 전 태스크 통일. `derived` 필드명(transferSum·cardBaselines·actualByCard·extraByCard·totalBudget·incomeSum·remaining·breakdown)이 Task 7 정의와 Task 10 사용처 일치.

**주의 포인트(구현자 참고):**
- Task 6 이후에야 실제 데이터가 뜬다. Task 1~5는 테스트로만 검증(인메모리).
- Supabase 미설정 상태에서 `npm run dev`는 흰 화면+콘솔 에러가 정상. `.env.local` 채운 뒤 정상 동작.
- `base` 경로는 GitHub 리포명과 반드시 일치(Task 15).

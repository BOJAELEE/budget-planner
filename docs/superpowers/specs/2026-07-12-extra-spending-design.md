# 추가지출(Extra Spending) 기능 — 설계 문서

작성일: 2026-07-12
대상: 기존 가계부 v1(feature/budget-v1)에 기능 추가

## 1. 배경/목적

기존 대시보드는 카드별 "이번달 실제 카드값"(총액 한 숫자)을 입력해 `고정비 외 지출 = 실제값 − 기준선`으로 역산했다. 사용자는 대신 **고정비 외 결제를 항목 단위로 직접 기록**하고 싶어 한다(원래 목표). 동시에 "카드 청구서 총액을 넣으면 필요 예산이 나오는" 빠른 계산기도 유지하고 싶어 한다.

## 2. 계산 모델 변경

```
전체 고정비 합계  = Σ(활성 고정비 amount)                  // 현금이체 + 카드 기준선 전부
추가지출 합계     = Σ(이번달 extra_spendings.amount)
총 필요 예산      = 전체 고정비 합계 + 추가지출 합계          // 새 방식(대시보드/히스토리)
잔여금액         = 수입합계 − 총 필요 예산
카드별 추가지출   = Σ(이번달 해당 카드 extra_spendings.amount)
```

카드값 계산기(별도 도구)는 기존 로직 유지: `예상 필요 예산 = 현금이체 합계 + Σ(입력한 카드 총액)`. `monthly_card_actuals` 테이블/`setActual`을 그대로 재사용하며 대시보드 본 숫자에는 영향 없음.

## 3. 데이터 구조

### 새 테이블 `extra_spendings`
| 필드 | 타입 | 설명 |
|---|---|---|
| id | uuid | |
| year_month | text | 작성 시점의 이번달(예: '2026-07'). 삽입 시 자동 |
| card | text | 현대카드 / 신한카드 / 삼성카드 |
| name | text | 내용 |
| amount | integer | 금액(>=0) |
| created_at | timestamptz | 작성 날짜·시각. 자동(default now()) — 사용자가 입력하지 않음 |

도메인 타입 `ExtraSpending`: `{ id, yearMonth, card: CardMethod, name, amount, createdAt }`.

### Repository 추가 메서드
- `listExtraSpendings(yearMonth: string): Promise<ExtraSpending[]>` (created_at 내림차순)
- `addExtraSpending(data: { yearMonth: string; card: CardMethod; name: string; amount: number }): Promise<ExtraSpending>`
- `updateExtraSpending(id: string, patch: Partial<{ card: CardMethod; name: string; amount: number }>): Promise<void>`
- `deleteExtraSpending(id: string): Promise<void>`
- `listAllExtraSpendings(): Promise<ExtraSpending[]>` (히스토리용)
- `deleteAllExtraSpendings(): Promise<void>` (백업 복원용 true replace)

## 4. 계산 함수(calc.ts, 순수·TDD)
- `fixedCostsTotal(fixedCosts): number` — 활성 고정비 전체 합
- `extraSpendingTotal(items: ExtraSpending[]): number`
- `extraByCardFromSpendings(items: ExtraSpending[]): Record<CardMethod, number>`
- `totalBudgetV2(fixedCosts, extras): number` = fixedCostsTotal + extraSpendingTotal
- `remainingV2(fixedCosts, incomes, extras): number` = incomeTotal − totalBudgetV2

기존 `totalBudget/remaining`(actuals 기반)은 카드계산기에서 계속 사용.

## 5. 화면

### 이번달(대시보드)
- 총 필요 예산 = totalBudgetV2, 잔여금액 = remainingV2(음수 빨강).
- 카드별 행: `기준선 {formatKRW} · 추가지출 {formatKRW}` 읽기전용(extraByCard from spendings).
- 카테고리 도넛 유지, 현금이체 합계/수입합계 요약 유지.
- 기존 per-card AmountInput(실제 카드값 입력) **제거**.
- 하단 **접이식 "💳 카드값으로 빠른 계산"**: 카드별 AmountInput → `예상 필요 예산 = 현금이체 합계 + Σ(입력)`. `setActual`로 저장(기존 유지). 펼침/접힘 로컬 상태.

### 추가지출 탭(신규, 하단 탭 5번째)
- 하단 탭: 이번달 · **추가지출** · 고정비 · 수입 · 히스토리.
- 이번달 항목 리스트: 내용 · 금액 · 카드 배지 · 작성일(created_at, `YYYY.MM.DD`).
- 추가 폼: 내용(text) + 금액(AmountInput) + 카드(select). 저장 시 year_month=이번달, created_at 자동.
- 수정/삭제(삭제는 confirm). 하단에 이번달 추가지출 합계.

### 히스토리
- 월별 `총 필요 예산 = fixedCostsTotal + 그 달 추가지출 합계`, 잔여 = 수입 − 그 총액. `listAllExtraSpendings()`를 year_month로 그룹.
- (기존 monthly_card_actuals 기반 집계 → extra_spendings 기반으로 변경.)

## 6. 백업
`exportData`/`importData`에 `extraSpendings` 포함. import는 검증 후 삭제(fixedCosts/incomes/actuals/extraSpendings 모두)→재삽입. `deleteAllExtraSpendings` 사용.

## 7. Supabase SQL(사용자가 SQL Editor에서 실행)
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

## 8. 범위 밖(YAGNI)
- 추가지출 날짜 수동 편집(자동 기록만).
- 추가지출 카테고리 분류(카드 태그만).
- 카드계산기와 추가지출의 상호 자동 반영(독립 유지).

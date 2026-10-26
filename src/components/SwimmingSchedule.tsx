import { isSwimmingPaymentMonth } from '../lib/swimmingSchedule';

export function SwimmingSchedule({ yearMonth }: { yearMonth: string }) {
  const year = yearMonth.slice(0, 4);

  return (
    <section className="swimming-schedule" aria-label={`${year}년 수영회비 납부 일정`}>
      <div className="swimming-schedule-heading">
        <h2>수영회비 <span className="swimming-schedule-note">해당 월말에 납부</span></h2>
        <span className="swimming-schedule-year">{year}년</span>
      </div>
      <ol className="swimming-schedule-months" aria-label="12개월 납부 일정">
        {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => {
          const due = isSwimmingPaymentMonth(`${year}-${String(month).padStart(2, '0')}`);
          return (
            <li key={month} className={due ? 'swimming-month swimming-month--due' : 'swimming-month'}
              aria-label={`${year}년 ${month}월 ${due ? '수영회비 해당 월말에 납부' : '납부 일정 없음'}`}>
              <span aria-hidden="true">{month}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

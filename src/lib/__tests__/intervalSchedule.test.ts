import { describe, expect, it } from 'vitest';
import { computeSlotPlan, firesPerDay, truncateBody, type IntervalSettings } from '../intervalSchedule';

describe('truncateBody', () => {
  it('90자 이하는 그대로 반환한다', () => {
    expect(truncateBody('짧은 문장')).toBe('짧은 문장');
  });

  it('초과 시 어절 경계에서 자르고 …을 붙인다', () => {
    const body = '가나다 '.repeat(40).trim(); // 159자
    const out = truncateBody(body);
    expect(out.length).toBeLessThanOrEqual(91); // 90 + '…'
    expect(out.endsWith('…')).toBe(true);
    expect(out).not.toMatch(/\s…$/); // 공백 뒤 … 금지
  });

  it('공백이 없는 긴 문자열은 하드 컷한다', () => {
    const out = truncateBody('가'.repeat(200));
    expect(out).toBe('가'.repeat(90) + '…');
  });

  it('개행은 공백으로 정규화된다', () => {
    expect(truncateBody('첫 줄\n둘째 줄')).toBe('첫 줄 둘째 줄');
  });
});

const S1: IntervalSettings = { intervalHours: 1, activeStartHour: 8, activeEndHour: 22 };
const S4: IntervalSettings = { intervalHours: 4, activeStartHour: 8, activeEndHour: 22 };

describe('firesPerDay', () => {
  it('1시간·08–22시 = 15회, 4시간·08–22시 = 4회', () => {
    expect(firesPerDay(S1)).toBe(15);
    expect(firesPerDay(S4)).toBe(4);
  });
});

describe('computeSlotPlan', () => {
  it('낮 10:30 기준: 오늘은 11시부터, 총 4일치(63/15=4), 재충전은 5일째 08시', () => {
    const now = new Date(2026, 0, 5, 10, 30); // 로컬 2026-01-05 10:30
    const { fireDates, reminderDate } = computeSlotPlan(S1, now);
    expect(fireDates[0]!.getHours()).toBe(11);
    expect(fireDates[0]!.getDate()).toBe(5);
    // 오늘 11~22시 = 12회 + 3일 × 15회 = 57회
    expect(fireDates.length).toBe(57);
    const last = fireDates[fireDates.length - 1]!;
    expect(last.getDate()).toBe(8);
    expect(last.getHours()).toBe(22);
    // 22+1=23 > 22 → 다음 날 08시
    expect(reminderDate!.getDate()).toBe(9);
    expect(reminderDate!.getHours()).toBe(8);
  });

  it('모든 슬롯은 now+60초 이후이고 정각이며 오름차순이다', () => {
    const now = new Date(2026, 0, 5, 21, 59, 30);
    const { fireDates } = computeSlotPlan(S1, now);
    for (const d of fireDates) {
      expect(d.getTime()).toBeGreaterThan(now.getTime() + 60_000 - 1);
      expect(d.getMinutes()).toBe(0);
    }
    const sorted = [...fireDates].sort((a, b) => a.getTime() - b.getTime());
    expect(fireDates.map((d) => d.getTime())).toEqual(sorted.map((d) => d.getTime()));
  });

  it('4시간 간격은 7일 상한이 걸린다 (63/4=15 → 7일)', () => {
    const now = new Date(2026, 0, 5, 6, 0);
    const { fireDates, reminderDate } = computeSlotPlan(S4, now);
    expect(fireDates.length).toBe(7 * 4); // 08,12,16,20 × 7일
    expect(fireDates.length + 1).toBeLessThanOrEqual(64);
    expect(reminderDate!.getHours()).toBe(8); // 20+4=24>22 → 다음 날 08시
  });

  it('총 예약 수(안내 포함)는 어떤 설정에서도 64를 넘지 않는다', () => {
    const combos: IntervalSettings[] = [];
    for (const intervalHours of [1, 2, 3, 4] as const)
      for (let s = 0; s < 24; s++)
        for (let e = s + 1; e < 24; e++)
          combos.push({ intervalHours, activeStartHour: s, activeEndHour: e });
    const now = new Date(2026, 0, 5, 0, 0);
    for (const c of combos) {
      const { fireDates } = computeSlotPlan(c, now);
      expect(fireDates.length + 1).toBeLessThanOrEqual(64);
    }
  });
});

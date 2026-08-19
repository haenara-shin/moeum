import { describe, expect, it } from 'vitest';
import { computeSlotPlan, firesPerDay, truncateBody, reconcileQueue, takeFromQueue, type IntervalSettings, type QueueState } from '../intervalSchedule';

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

// mulberry32 — 시드 고정 rng
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('reconcileQueue', () => {
  it('prev 없으면 전체 ID를 셔플해 cursor 0으로 시작한다', () => {
    const q = reconcileQueue(null, [1, 2, 3, 4, 5], seeded(1));
    expect([...q.ids].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
    expect(q.cursor).toBe(0);
  });

  it('삭제된 ID는 제거되고 cursor가 보정된다', () => {
    const prev: QueueState = { ids: [3, 1, 4, 2, 5], cursor: 3 }; // 3,1,4 소진됨
    const q = reconcileQueue(prev, [1, 2, 5], seeded(1)); // 3,4 삭제
    expect(q.ids).toHaveLength(3);
    expect(q.cursor).toBe(1); // 소진분(3,1,4) 중 생존 = 1 하나
    expect(q.ids.slice(0, 1)).toEqual([1]);
  });

  it('신규 ID는 미소진 구간에만 삽입된다', () => {
    const prev: QueueState = { ids: [1, 2, 3, 4], cursor: 2 };
    const q = reconcileQueue(prev, [1, 2, 3, 4, 99], seeded(7));
    expect(q.ids.slice(0, 2)).toEqual([1, 2]); // 소진 구간 불변
    expect(q.ids).toContain(99);
    expect(q.ids.indexOf(99)).toBeGreaterThanOrEqual(2);
  });
});

describe('takeFromQueue', () => {
  it('cursor가 전진하며 뽑는다', () => {
    const { picked, next } = takeFromQueue({ ids: [10, 20, 30], cursor: 0 }, 2, seeded(1));
    expect(picked).toEqual([10, 20]);
    expect(next.cursor).toBe(2);
  });

  it('소진되면 재셔플해 이어서 뽑는다 — 요청 수만큼 항상 반환', () => {
    const { picked, next } = takeFromQueue({ ids: [1, 2, 3], cursor: 2 }, 4, seeded(2));
    expect(picked).toHaveLength(4);
    expect(picked[0]).toBe(3); // 재셔플 전 잔여분 먼저
    expect(next.cursor).toBe(3); // 3 소진 후 재셔플 → 3개 중 3개 소진
  });

  it('빈 큐면 빈 결과를 돌려준다', () => {
    const { picked } = takeFromQueue({ ids: [], cursor: 0 }, 5, seeded(1));
    expect(picked).toEqual([]);
  });
});


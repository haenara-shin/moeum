# M1 — 시간 간격 랜덤 문장 알림 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 수집한 문장을 1·2·3·4시간 간격으로 활성 시간대 안에서 랜덤 노출하는 로컬 알림 옵션(기존 "하루 1번"과 배타 모드)을 구현하고, 알림 탭 시 해당 문장 상세로 딥링크한다.

**Architecture:** iOS 로컬 알림은 발송 시점 내용 계산이 불가하므로 절대 시각 DATE 트리거를 배치로 사전 예약한다(≤64). 순수 계산(슬롯·셔플 큐·말줄임)은 `intervalSchedule.ts`(RN import 없음, vitest 테스트 대상)로 분리하고, 부수효과(expo-notifications·AsyncStorage·DB·store)는 `intervalScheduler.ts`가 single-flight 리컨실러로 통합 관리한다 — daily/interval 모드 전환·취소·재예약을 모두 이 한 곳이 수렴시킨다.

**Tech Stack:** Expo SDK 54 / RN 0.81 / expo-notifications(기존) / zustand persist(AsyncStorage) / expo-sqlite / vitest(신규 devDep, 순수 함수 전용)

**Spec:** `docs/superpowers/specs/2026-08-18-interval-alerts-and-groups-design.md` §1 (v3.1)

## Global Constraints

- Expo SDK **54 고정** (55 금지 — ASC 호환 이슈), 패키지 매니저 **pnpm** (`.npmrc` node-linker=hoisted 유지)
- **새 네이티브 의존성 금지** (M1은 재빌드 불필요가 요구사항 — devDep(vitest)만 허용)
- 기존 "하루 1번" 알림(`moeum-daily`)과 위젯 동기화(`syncWidget`) 동작 보존
- 알림 예약 총합 ≤ 64 (문장 알림 ≤ 63 + 재충전 안내 1)
- 활성 시간대: `start ≤ t ≤ end`(양끝 포함, 정각), UI가 `start < end` 강제, 야간 넘김 미지원
- 검증 명령: `pnpm lint`(= `tsc --noEmit`), `pnpm test`(= `vitest run`)
- 커밋: 한국어 conventional commit + 마지막 줄 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- 파일 참조 기준 커밋: `aeecda4` (라인 번호는 이 시점 기준)

---

### Task 1: vitest 셋업 + 본문 말줄임 `truncateBody`

**Files:**
- Modify: `package.json` (devDep + scripts)
- Create: `src/lib/intervalSchedule.ts`
- Test: `src/lib/__tests__/intervalSchedule.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces: `truncateBody(body: string, max?: number): string` (기본 max 90, 어절 경계 우선, 초과 시 `…` 접미)

- [ ] **Step 1: vitest 설치 + 스크립트 추가**

```bash
pnpm add -D vitest
```

`package.json`의 `"scripts"`에 추가 (기존 항목 유지):

```json
"test": "vitest run"
```

- [ ] **Step 2: 실패하는 테스트 작성**

`src/lib/__tests__/intervalSchedule.test.ts` 생성:

```ts
import { describe, expect, it } from 'vitest';
import { truncateBody } from '../intervalSchedule';

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
```

- [ ] **Step 3: 실패 확인**

Run: `pnpm test`
Expected: FAIL — `Failed to resolve import "../intervalSchedule"` (모듈 없음)

- [ ] **Step 4: 최소 구현**

`src/lib/intervalSchedule.ts` 생성:

```ts
/**
 * 간격 알림의 순수 계산 모듈 — spec §1.2 (v3.1)
 * RN/Expo import 금지: vitest가 Node에서 직접 실행한다.
 */

export function truncateBody(body: string, max = 90): string {
  const normalized = body.replace(/\s+/g, ' ').trim();
  if (normalized.length <= max) return normalized;
  const hard = normalized.slice(0, max);
  const lastSpace = hard.lastIndexOf(' ');
  const cut = lastSpace > max * 0.6 ? hard.slice(0, lastSpace) : hard;
  return `${cut.trimEnd()}…`;
}
```

- [ ] **Step 5: 통과 확인 + 타입 체크**

Run: `pnpm test` → PASS (4 tests)
Run: `pnpm lint` → 오류 없음

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml src/lib/intervalSchedule.ts src/lib/__tests__/intervalSchedule.test.ts
git commit -m "feat(M1): vitest 셋업 + 알림 본문 말줄임 truncateBody

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: 슬롯 계산 `computeSlotPlan`

**Files:**
- Modify: `src/lib/intervalSchedule.ts`
- Test: `src/lib/__tests__/intervalSchedule.test.ts` (추가)

**Interfaces:**
- Consumes: 없음
- Produces:
  - `type IntervalSettings = { intervalHours: 1 | 2 | 3 | 4; activeStartHour: number; activeEndHour: number }`
  - `firesPerDay(s: IntervalSettings): number` — `floor((end-start)/interval) + 1`
  - `computeSlotPlan(s: IntervalSettings, now: Date): { fireDates: Date[]; reminderDate: Date | null }`
    - fireDates: 오늘부터 `days = min(7, floor(63 / firesPerDay))`일간, 활성 시간대 내 정각, `now + 60초` 이후만
    - reminderDate: 마지막 fireDate + interval, 활성 시간대 초과 시 다음 날 start 정각. fireDates 비면 null

- [ ] **Step 1: 실패하는 테스트 추가**

테스트 파일에 추가:

```ts
import { computeSlotPlan, firesPerDay, type IntervalSettings } from '../intervalSchedule';

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
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm test`
Expected: FAIL — `computeSlotPlan is not a function` (미구현)

- [ ] **Step 3: 구현**

`src/lib/intervalSchedule.ts`에 추가:

```ts
export type IntervalSettings = {
  intervalHours: 1 | 2 | 3 | 4;
  activeStartHour: number; // 0–23
  activeEndHour: number; // 0–23, start < end (UI 강제)
};

export type SlotPlan = { fireDates: Date[]; reminderDate: Date | null };

export function firesPerDay(s: IntervalSettings): number {
  return Math.floor((s.activeEndHour - s.activeStartHour) / s.intervalHours) + 1;
}

export function computeSlotPlan(s: IntervalSettings, now: Date): SlotPlan {
  const perDay = firesPerDay(s);
  const days = Math.min(7, Math.floor(63 / perDay));
  const minTime = now.getTime() + 60_000;
  const fireDates: Date[] = [];
  for (let d = 0; d < days; d++) {
    for (let h = s.activeStartHour; h <= s.activeEndHour; h += s.intervalHours) {
      const slot = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, h, 0, 0, 0);
      if (slot.getTime() >= minTime) fireDates.push(slot);
    }
  }
  if (fireDates.length === 0) return { fireDates, reminderDate: null };
  const last = fireDates[fireDates.length - 1]!;
  const bump = new Date(last.getTime());
  bump.setHours(bump.getHours() + s.intervalHours);
  const reminderDate =
    bump.getHours() <= s.activeEndHour && bump.getDate() === last.getDate()
      ? bump
      : new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1, s.activeStartHour, 0, 0, 0);
  return { fireDates, reminderDate };
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm test` → PASS / Run: `pnpm lint` → 오류 없음

- [ ] **Step 5: Commit**

```bash
git add src/lib/intervalSchedule.ts src/lib/__tests__/intervalSchedule.test.ts
git commit -m "feat(M1): 활성 시간대 슬롯 계산 computeSlotPlan — 64개 상한·재충전 슬롯

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: 셔플 큐 `reconcileQueue` / `takeFromQueue`

**Files:**
- Modify: `src/lib/intervalSchedule.ts`
- Test: `src/lib/__tests__/intervalSchedule.test.ts` (추가)

**Interfaces:**
- Consumes: 없음
- Produces:
  - `type QueueState = { ids: number[]; cursor: number }`
  - `reconcileQueue(prev: QueueState | null, currentIds: number[], rng: () => number): QueueState` — 삭제된 ID 제거(커서 보정), 신규 ID는 미소진 구간 `[cursor..len]`에 랜덤 삽입, prev 없으면 전체 셔플
  - `takeFromQueue(q: QueueState, count: number, rng: () => number): { picked: number[]; next: QueueState }` — 소진 시 재셔플 후 계속, 커서 전진
  - `rng`: `Math.random` 호환 주입(테스트 결정성)

- [ ] **Step 1: 실패하는 테스트 추가**

```ts
import { reconcileQueue, takeFromQueue, type QueueState } from '../intervalSchedule';

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
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm test` — FAIL (`reconcileQueue is not a function`)

- [ ] **Step 3: 구현**

```ts
export type QueueState = { ids: number[]; cursor: number };

function shuffle(arr: number[], rng: () => number): number[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function reconcileQueue(
  prev: QueueState | null,
  currentIds: number[],
  rng: () => number,
): QueueState {
  if (!prev) return { ids: shuffle(currentIds, rng), cursor: 0 };
  const currentSet = new Set(currentIds);
  const kept: number[] = [];
  let cursor = 0;
  prev.ids.forEach((id, idx) => {
    if (!currentSet.has(id)) return;
    kept.push(id);
    if (idx < prev.cursor) cursor++;
  });
  const prevSet = new Set(prev.ids);
  for (const id of currentIds) {
    if (prevSet.has(id)) continue;
    const pos = cursor + Math.floor(rng() * (kept.length - cursor + 1));
    kept.splice(pos, 0, id);
  }
  return { ids: kept, cursor };
}

export function takeFromQueue(
  q: QueueState,
  count: number,
  rng: () => number,
): { picked: number[]; next: QueueState } {
  if (q.ids.length === 0) return { picked: [], next: q };
  let ids = [...q.ids];
  let cursor = q.cursor;
  const picked: number[] = [];
  while (picked.length < count) {
    if (cursor >= ids.length) {
      ids = shuffle(ids, rng);
      cursor = 0;
    }
    picked.push(ids[cursor]!);
    cursor++;
  }
  return { picked, next: { ids, cursor } };
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm test` → PASS / `pnpm lint` → 오류 없음

- [ ] **Step 5: Commit**

```bash
git add src/lib/intervalSchedule.ts src/lib/__tests__/intervalSchedule.test.ts
git commit -m "feat(M1): 셔플 큐 reconcileQueue/takeFromQueue — 삭제 보정·미소진 삽입·재셔플

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: DB 무제한 쿼리 + 알림 예약/취소 프리미티브

**Files:**
- Modify: `src/db/index.ts` (getRandomQuotes 아래에 추가)
- Modify: `src/lib/notifications.ts` (파일 끝에 추가)

**Interfaces:**
- Consumes: 기존 `getDb()`, 기존 상수 `DAILY_NOTIFICATION_ID = 'moeum-daily'`
- Produces:
  - `listQuotesForScheduler(): Promise<{ id: number; body: string }[]>` — LIMIT 없음 (spec §1.2 전용 쿼리)
  - `scheduleQuoteNotification(identifier: string, body: string, date: Date, quoteId: number): Promise<void>`
  - `scheduleReminderNotification(identifier: string, date: Date): Promise<void>` — 본문 "앱을 열면 알림이 이어져요"
  - `cancelNotifications(identifiers: string[]): Promise<void>` — 존재하지 않는 ID는 무시

- [ ] **Step 1: 구현 — `src/db/index.ts`**

`getRandomQuotes` 함수 아래에 추가:

```ts
/** 간격 알림 스케줄러 전용 — LIMIT 없이 전체 (spec §1.2) */
export async function listQuotesForScheduler(): Promise<{ id: number; body: string }[]> {
  const db = await getDb();
  return db.getAllAsync<{ id: number; body: string }>(`SELECT id, body FROM quotes`);
}
```

- [ ] **Step 2: 구현 — `src/lib/notifications.ts`**

파일 끝에 추가:

```ts
export async function scheduleQuoteNotification(
  identifier: string,
  body: string,
  date: Date,
  quoteId: number,
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: '모두의 마음가짐',
      body,
      sound: 'default',
      data: { quoteId },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
  });
}

export async function scheduleReminderNotification(identifier: string, date: Date): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: '모두의 마음가짐',
      body: '앱을 열면 알림이 이어져요',
      sound: 'default',
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
  });
}

export async function cancelNotifications(identifiers: string[]): Promise<void> {
  await Promise.all(
    identifiers.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})),
  );
}
```

- [ ] **Step 3: 타입 체크**

Run: `pnpm lint` → 오류 없음

- [ ] **Step 4: Commit**

```bash
git add src/db/index.ts src/lib/notifications.ts
git commit -m "feat(M1): 스케줄러 전용 무제한 쿼리 + DATE 트리거 예약/취소 프리미티브

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: notification store 확장 (mode·간격·시간대, persist migrate)

**Files:**
- Modify: `src/store/notification.ts` (전면 개정)

**Interfaces:**
- Consumes: Task 6의 `syncNotificationSchedule(reason)` (동적 import — 아직 없으므로 이 Task에서는 호출부를 `void import('../lib/intervalScheduler').then((m) => m.syncNotificationSchedule('integrity'));` 형태로 작성하며, Task 6 완료 전까지 `pnpm lint`가 해당 모듈 부재로 실패한다 → **Task 5와 6은 연속 실행 후 함께 커밋 검증**)
- Produces (다른 Task가 의존하는 형태):
  - `type NotificationMode = 'daily' | 'interval'`
  - store state: `{ enabled: boolean; mode: NotificationMode; hour: number; minute: number; intervalHours: 1|2|3|4; activeStartHour: number; activeEndHour: number }`
  - actions: `setEnabled(enabled): Promise<boolean>`, `setMode(mode): Promise<void>`, `setTime(h, m): Promise<void>`, `setIntervalHours(h): Promise<void>`, `setActiveWindow(start, end): Promise<void>`
  - `waitForNotificationHydration(): Promise<void>`
  - persist name `'moeum-notification'` 유지, `version: 1` + migrate(구버전 → mode:'daily', intervalHours:1, activeStartHour:8, activeEndHour:22 채움)

- [ ] **Step 1: 파일 전체를 아래로 교체**

```ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestPermission } from '../lib/notifications';

export type NotificationMode = 'daily' | 'interval';

type NotificationState = {
  enabled: boolean;
  mode: NotificationMode;
  hour: number;
  minute: number;
  intervalHours: 1 | 2 | 3 | 4;
  activeStartHour: number;
  activeEndHour: number;
  setEnabled: (enabled: boolean) => Promise<boolean>;
  setMode: (mode: NotificationMode) => Promise<void>;
  setTime: (hour: number, minute: number) => Promise<void>;
  setIntervalHours: (h: 1 | 2 | 3 | 4) => Promise<void>;
  setActiveWindow: (start: number, end: number) => Promise<void>;
};

// 순환 참조 회피 — scheduler는 이 store를 정적 import하므로 역방향은 동적 import
async function requestIntegritySync(): Promise<void> {
  const m = await import('../lib/intervalScheduler');
  await m.syncNotificationSchedule('integrity');
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      enabled: false,
      mode: 'daily',
      hour: 8,
      minute: 0,
      intervalHours: 1,
      activeStartHour: 8,
      activeEndHour: 22,

      setEnabled: async (enabled) => {
        if (enabled) {
          const granted = await requestPermission();
          if (!granted) {
            set({ enabled: false });
            await requestIntegritySync();
            return false;
          }
        }
        set({ enabled });
        await requestIntegritySync();
        return true;
      },

      setMode: async (mode) => {
        set({ mode });
        await requestIntegritySync();
      },

      setTime: async (hour, minute) => {
        set({ hour, minute });
        await requestIntegritySync();
      },

      setIntervalHours: async (h) => {
        set({ intervalHours: h });
        await requestIntegritySync();
      },

      setActiveWindow: async (start, end) => {
        if (start >= end) return; // UI가 막지만 최종 방어
        set({ activeStartHour: start, activeEndHour: end });
        await requestIntegritySync();
      },
    }),
    {
      name: 'moeum-notification',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as Partial<NotificationState>;
        if (version === 0) {
          return {
            ...p,
            mode: 'daily' as const,
            intervalHours: 1 as const,
            activeStartHour: 8,
            activeEndHour: 22,
          };
        }
        return p;
      },
    },
  ),
);

/** persist hydration 완료 대기 — scheduler 실행 전제 (spec §1.2) */
export function waitForNotificationHydration(): Promise<void> {
  if (useNotificationStore.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsub = useNotificationStore.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}
```

- [ ] **Step 2: 진행 표시만 하고 검증은 Task 6 종료 시** (`../lib/intervalScheduler` 부재로 이 시점 `pnpm lint`는 실패가 정상)

---

### Task 6: 통합 리컨실러 `intervalScheduler.ts`

**Files:**
- Create: `src/lib/intervalScheduler.ts`

**Interfaces:**
- Consumes: Task 2·3 순수 함수, Task 4 프리미티브(`listQuotesForScheduler`, `scheduleQuoteNotification`, `scheduleReminderNotification`, `cancelNotifications`), Task 5 store(`useNotificationStore`, `waitForNotificationHydration`), 기존 `scheduleDaily`/`cancelDaily`/`getPermissionStatus`
- Produces:
  - `syncNotificationSchedule(reason: 'integrity' | 'topup'): Promise<void>` — **daily/interval 전체 알림 상태의 유일한 리컨실러**
  - `debouncedSync(reason: 'integrity' | 'topup'): void` — 5초 디바운스(quotes 변경용)

- [ ] **Step 1: 구현**

```ts
/**
 * 알림 스케줄 리컨실러 — spec §1.2 (v3.1)
 * daily/interval 모드 공통의 단일 수렴 지점: 모든 설정 변경·앱 이벤트가
 * 이 함수를 호출하고, 여기서만 예약/취소가 일어난다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  computeSlotPlan,
  reconcileQueue,
  takeFromQueue,
  truncateBody,
  firesPerDay,
  type QueueState,
} from './intervalSchedule';
import {
  cancelDaily,
  cancelNotifications,
  getPermissionStatus,
  scheduleDaily,
  scheduleQuoteNotification,
  scheduleReminderNotification,
} from './notifications';
import { listQuotesForScheduler } from '../db';
import { useNotificationStore, waitForNotificationHydration } from '../store/notification';

const STATE_KEY = 'moeum-interval-state';

type SchedulerState = {
  generation: number;
  queue: QueueState;
  scheduled: { id: string; at: number }[];
};

async function loadState(): Promise<SchedulerState | null> {
  try {
    const raw = await AsyncStorage.getItem(STATE_KEY);
    return raw ? (JSON.parse(raw) as SchedulerState) : null;
  } catch {
    return null;
  }
}

async function saveState(s: SchedulerState): Promise<void> {
  await AsyncStorage.setItem(STATE_KEY, JSON.stringify(s));
}

// single-flight: 동시 호출은 직렬 체인으로 병합 (spec §1.2)
let chain: Promise<void> = Promise.resolve();

export function syncNotificationSchedule(reason: 'integrity' | 'topup'): Promise<void> {
  chain = chain.then(() => run(reason)).catch(() => {});
  return chain;
}

async function run(reason: 'integrity' | 'topup'): Promise<void> {
  await waitForNotificationHydration();
  const st = useNotificationStore.getState();
  const prev = (await loadState()) ?? { generation: 0, queue: { ids: [], cursor: 0 }, scheduled: [] };

  const cancelAllInterval = async () => {
    if (prev.scheduled.length > 0) {
      await cancelNotifications(prev.scheduled.map((s) => s.id));
      await saveState({ ...prev, scheduled: [] });
    }
  };

  // 꺼짐: 둘 다 정리
  if (!st.enabled) {
    await cancelDaily();
    await cancelAllInterval();
    return;
  }

  const perm = await getPermissionStatus();
  if (perm !== 'granted') return; // 권한 UX는 설정 화면이 담당

  if (st.mode === 'daily') {
    await cancelAllInterval();
    await scheduleDaily(st.hour, st.minute);
    return;
  }

  // interval 모드
  await cancelDaily();

  const quotes = await listQuotesForScheduler();
  if (quotes.length === 0) {
    await cancelAllInterval(); // 문장 0개 전환 (spec §1.1)
    return;
  }

  const settings = {
    intervalHours: st.intervalHours,
    activeStartHour: st.activeStartHour,
    activeEndHour: st.activeEndHour,
  };
  const now = Date.now();
  const futureCount = prev.scheduled.filter((s) => s.at > now).length;
  if (reason === 'topup' && futureCount >= firesPerDay(settings)) return; // 하루치 이상 남음

  // 전체 재예약 (세대 +1)
  await cancelNotifications(prev.scheduled.map((s) => s.id));
  const generation = prev.generation + 1;
  const { fireDates, reminderDate } = computeSlotPlan(settings, new Date(now));
  const bodyById = new Map(quotes.map((q) => [q.id, q.body]));
  let queue = reconcileQueue(
    prev.queue.ids.length > 0 ? prev.queue : null,
    quotes.map((q) => q.id),
    Math.random,
  );
  const { picked, next } = takeFromQueue(queue, fireDates.length, Math.random);

  const scheduled: { id: string; at: number }[] = [];
  let consumed = 0;
  try {
    for (let i = 0; i < fireDates.length; i++) {
      const quoteId = picked[i]!;
      const identifier = `moeum-interval-g${generation}-${i}`;
      await scheduleQuoteNotification(
        identifier,
        truncateBody(bodyById.get(quoteId) ?? ''),
        fireDates[i]!,
        quoteId,
      );
      scheduled.push({ id: identifier, at: fireDates[i]!.getTime() });
      consumed++;
    }
    if (reminderDate) {
      const rid = `moeum-interval-g${generation}-reminder`;
      await scheduleReminderNotification(rid, reminderDate);
      scheduled.push({ id: rid, at: reminderDate.getTime() });
    }
  } finally {
    // 부분 실패 시에도 성공분만큼만 커서 커밋 (spec §1.2)
    queue = consumed === fireDates.length ? next : { ids: next.ids, cursor: Math.min(queue.cursor + consumed, next.ids.length) };
    await saveState({ generation, queue, scheduled });
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function debouncedSync(reason: 'integrity' | 'topup'): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void syncNotificationSchedule(reason);
  }, 5000);
}
```

- [ ] **Step 2: 타입 체크 (Task 5+6 통합 검증)**

Run: `pnpm lint` → 오류 없음
Run: `pnpm test` → PASS (순수 함수 회귀 확인)

- [ ] **Step 3: Commit (Task 5+6 함께)**

```bash
git add src/store/notification.ts src/lib/intervalScheduler.ts
git commit -m "feat(M1): 알림 리컨실러 — 모드 배타·세대 식별자·부분 실패 커서 커밋·single-flight

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: navigationRef + 알림 탭 라우팅 (콜드/웜)

**Files:**
- Modify: `src/navigation/RootNavigator.tsx`
- Create: `src/lib/notificationRouting.ts`

**Interfaces:**
- Consumes: 기존 `RootStackParamList`, `getQuote(id)` (src/db), expo-notifications response API
- Produces:
  - `navigationRef` (RootNavigator export, `createNavigationContainerRef<RootStackParamList>()`)
  - `initNotificationRouting(): () => void` — 웜 리스너 등록 + 콜드 스타트 1회 처리, cleanup 함수 반환 (App.tsx에서 호출)

- [ ] **Step 1: RootNavigator에 ref 연결**

`src/navigation/RootNavigator.tsx` 수정 — import에 `createNavigationContainerRef` 추가하고 모듈 레벨에 export, 컨테이너에 연결:

```ts
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
  createNavigationContainerRef,
  type Theme,
} from '@react-navigation/native';
// … 기존 import 유지

export const navigationRef = createNavigationContainerRef<RootStackParamList>();
```

`<NavigationContainer theme={theme}>` → `<NavigationContainer ref={navigationRef} theme={theme}>`

- [ ] **Step 2: 라우팅 모듈 생성 — `src/lib/notificationRouting.ts`**

```ts
/**
 * 알림 탭 → 문장 상세 딥링크 — spec §1.3 (v3.1)
 * 콜드 스타트: getLastNotificationResponseAsync 1회 + 처리 식별자 기록으로 중복 방지
 * (식별자에 세대가 포함되므로 재사용 충돌 없음)
 */
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigationRef } from '../navigation/RootNavigator';
import { getQuote } from '../db';

const HANDLED_KEY = 'moeum-last-handled-response';

async function navigateWhenReady(quoteId: number): Promise<void> {
  for (let i = 0; i < 50 && !navigationRef.isReady(); i++) {
    await new Promise((r) => setTimeout(r, 100)); // 컨테이너 준비 대기 (최대 5초)
  }
  if (!navigationRef.isReady()) return;
  const quote = await getQuote(quoteId);
  if (quote) {
    navigationRef.navigate('Detail', { id: quoteId });
  } else {
    navigationRef.navigate('List'); // 삭제된 문장 폴백 (spec §1.3)
  }
}

async function handleResponse(response: Notifications.NotificationResponse): Promise<void> {
  const identifier = response.notification.request.identifier;
  const quoteId = (response.notification.request.content.data as { quoteId?: number } | null)
    ?.quoteId;
  if (typeof quoteId !== 'number') return; // daily·재충전 안내는 라우팅 없음
  const handled = await AsyncStorage.getItem(HANDLED_KEY);
  if (handled === identifier) return;
  await AsyncStorage.setItem(HANDLED_KEY, identifier);
  await navigateWhenReady(quoteId);
}

export function initNotificationRouting(): () => void {
  void Notifications.getLastNotificationResponseAsync().then((res) => {
    if (res) void handleResponse(res);
  });
  const sub = Notifications.addNotificationResponseReceivedListener((res) => {
    void handleResponse(res);
  });
  return () => sub.remove();
}
```

- [ ] **Step 3: 타입 체크**

Run: `pnpm lint` → 오류 없음

- [ ] **Step 4: Commit**

```bash
git add src/navigation/RootNavigator.tsx src/lib/notificationRouting.ts
git commit -m "feat(M1): 알림 탭 딥링크 — navigationRef·콜드 스타트·중복 방지·삭제 폴백

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: 앱 트리거 연결 (App.tsx + quotes store)

**Files:**
- Modify: `App.tsx`
- Modify: `src/store/quotes.ts`
- Modify: `src/screens/SettingsScreen.tsx:96-117` (`onImport` — 가져오기 후 보충)

**Interfaces:**
- Consumes: `syncNotificationSchedule` / `debouncedSync` (Task 6), `initNotificationRouting` (Task 7)
- Produces: 없음 (배선만)

- [ ] **Step 1: App.tsx — 시작·포그라운드·라우팅**

import 추가:

```ts
import { AppState } from 'react-native';
import { syncNotificationSchedule } from './src/lib/intervalScheduler';
import { initNotificationRouting } from './src/lib/notificationRouting';
```

기존 `useEffect`(DB 초기화) 내부의 `void syncWidget();` 아래에 한 줄 추가:

```ts
void syncNotificationSchedule('topup');
```

그 useEffect 아래에 새 useEffect 두 개 추가:

```ts
useEffect(() => {
  const sub = AppState.addEventListener('change', (state) => {
    if (state === 'active') void syncNotificationSchedule('topup');
  });
  return () => sub.remove();
}, []);

useEffect(() => initNotificationRouting(), []);
```

- [ ] **Step 2: quotes store — 추가/삭제 트리거**

`src/store/quotes.ts` — import 추가:

```ts
import { debouncedSync } from '../lib/intervalScheduler';
```

`add`의 `void syncWidget();` 아래: `debouncedSync('topup');`
`remove`의 `void syncWidget();` 아래: `debouncedSync('integrity');`

- [ ] **Step 3: SettingsScreen onImport — 대량 추가 후 보충**

`onImport` 성공 경로의 `void countQuotes('all').then(setCount);` 아래에 추가:

```ts
debouncedSync('topup');
```

파일 상단 import에 `import { debouncedSync } from '../lib/intervalScheduler';` 추가.

- [ ] **Step 4: 타입 체크 + Commit**

Run: `pnpm lint` → 오류 없음

```bash
git add App.tsx src/store/quotes.ts src/screens/SettingsScreen.tsx
git commit -m "feat(M1): 스케줄 트리거 배선 — 시작·포그라운드 보충, 삭제 정합성, 가져오기 보충

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: 설정 화면 UI — 모드·간격·활성 시간대

**Files:**
- Modify: `src/screens/SettingsScreen.tsx:177-237` ("매일 알림" 섹션 교체)

**Interfaces:**
- Consumes: Task 5 store 전체 필드/액션
- Produces: 없음 (UI)

- [ ] **Step 1: 상태·헬퍼 추가**

컴포넌트 상단 store 구독을 교체:

```ts
const {
  enabled, mode, hour, minute, intervalHours,
  activeStartHour, activeEndHour,
  setEnabled, setMode, setTime, setIntervalHours, setActiveWindow,
} = useNotificationStore();
```

`formatTime` 아래에 헬퍼 추가:

```ts
function formatHour(h: number): string {
  const period = h < 12 ? '오전' : '오후';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${period} ${h12}시`;
}
```

시간대 피커용 로컬 상태 추가 (`showTimePicker` 옆):

```ts
const [showWindowPicker, setShowWindowPicker] = useState<'start' | 'end' | null>(null);
```

- [ ] **Step 2: "매일 알림" 섹션(177–237행)을 "알림" 섹션으로 교체**

섹션 헤더 텍스트 `매일 알림` → `알림`. 스위치 행은 유지하되 라벨을 `알림`·힌트를 `저장한 문장을 다시 만나는 시간`으로. 스위치 행 아래에 모드 선택 두 행을 추가하고, 기존 "알림 시간" 행과 피커는 `mode === 'daily'`일 때만, 아래 신규 간격·시간대 UI는 `mode === 'interval'`일 때만 렌더:

```tsx
{/* 모드 선택 */}
{(['daily', 'interval'] as const).map((m) => (
  <Pressable
    key={m}
    onPress={() => void setMode(m)}
    disabled={!enabled}
    className="flex-row items-center border-t border-gray-100 px-4 py-4 dark:border-neutral-700"
    style={({ pressed }) => ({ opacity: pressed ? 0.7 : enabled ? 1 : 0.4 })}
  >
    <View className="flex-1">
      <Text className="text-base text-ink-900 dark:text-white">
        {m === 'daily' ? '하루 1번' : '시간 간격'}
      </Text>
      <Text className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
        {m === 'daily' ? '정해진 시간에 한 번' : '활성 시간대 안에서 랜덤 문장 반복'}
      </Text>
    </View>
    {mode === m && (
      <Text className="text-base text-accent-500" accessibilityLabel="선택됨">✓</Text>
    )}
  </Pressable>
))}

{/* 간격 모드 UI */}
{mode === 'interval' && enabled && (
  <>
    <View className="border-t border-gray-100 px-4 py-4 dark:border-neutral-700">
      <Text className="mb-3 text-base text-ink-900 dark:text-white">알림 간격</Text>
      <View className="flex-row gap-2">
        {([1, 2, 3, 4] as const).map((h) => (
          <Pressable
            key={h}
            onPress={() => void setIntervalHours(h)}
            className={`flex-1 items-center rounded-xl py-2 ${
              intervalHours === h ? 'bg-accent-500' : 'bg-gray-100 dark:bg-neutral-700'
            }`}
          >
            <Text className={intervalHours === h ? 'text-white' : 'text-ink-900 dark:text-white'}>
              {h}시간
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
    {(['start', 'end'] as const).map((which) => (
      <Pressable
        key={which}
        onPress={() => setShowWindowPicker((v) => (v === which ? null : which))}
        className="flex-row items-center border-t border-gray-100 px-4 py-4 dark:border-neutral-700"
      >
        <Text className="flex-1 text-base text-ink-900 dark:text-white">
          {which === 'start' ? '시작 시간' : '종료 시간'}
        </Text>
        <Text className="text-base text-gray-500 dark:text-gray-400">
          {formatHour(which === 'start' ? activeStartHour : activeEndHour)}
        </Text>
      </Pressable>
    ))}
    {showWindowPicker && (
      <View className="border-t border-gray-100 dark:border-neutral-700">
        <DateTimePicker
          value={(() => {
            const d = new Date();
            d.setHours(showWindowPicker === 'start' ? activeStartHour : activeEndHour, 0, 0, 0);
            return d;
          })()}
          mode="time"
          display="spinner"
          minuteInterval={30}
          onChange={(event: DateTimePickerEvent, date?: Date) => {
            if (event.type !== 'set' || !date) return;
            const h = date.getHours();
            const next =
              showWindowPicker === 'start'
                ? { start: h, end: activeEndHour }
                : { start: activeStartHour, end: h };
            if (next.start >= next.end) {
              Alert.alert('시간대 오류', '시작 시간은 종료 시간보다 빨라야 해요.');
              return;
            }
            void setActiveWindow(next.start, next.end);
          }}
          locale="ko-KR"
        />
      </View>
    )}
    {count === 0 && (
      <View className="border-t border-gray-100 px-4 py-3 dark:border-neutral-700">
        <Text className="text-xs text-gray-500 dark:text-gray-400">
          문장을 먼저 모아보세요 — 저장된 문장이 있어야 알림이 예약됩니다.
        </Text>
      </View>
    )}
  </>
)}
```

기존 "알림 시간" Pressable과 iOS/Android 시간 피커 블록은 각각 조건을 `enabled` → `enabled && mode === 'daily'`로 변경. `permStatus === 'denied'` 안내 블록은 그대로 유지.

- [ ] **Step 3: 타입 체크 + 시뮬레이터 확인**

Run: `pnpm lint` → 오류 없음
Run: `pnpm ios` (또는 실행 중인 dev client 리로드) — 설정 화면에서: 스위치 on → 모드 전환 → 간격 칩 → 시간대 변경(시작 ≥ 종료 시 Alert) → 문장 0개 캡션(전체 삭제 후) 눈으로 확인.

- [ ] **Step 4: Commit**

```bash
git add src/screens/SettingsScreen.tsx
git commit -m "feat(M1): 설정 UI — 알림 모드 라디오·간격 칩·활성 시간대 피커·0개 안내

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 10: 통합 검증 + 문서 갱신

**Files:**
- Modify: `docs/CONTEXT.md` (M1 체크)

**Interfaces:**
- Consumes: 전체
- Produces: M1 완료 상태

- [ ] **Step 1: 자동 검증 일괄 실행**

Run: `pnpm test && pnpm lint`
Expected: 전부 PASS

- [ ] **Step 2: 시뮬레이터/실기기 수동 검증 (축소 설정)**

1. 문장 3개 이상 저장 → 설정: 알림 on, 시간 간격 모드, 간격 1시간, 시간대를 현재 시각을 포함하도록 설정
2. 앱을 백그라운드로 → 다음 정각에 랜덤 문장 알림 수신 확인 (시뮬레이터는 `xcrun simctl push` 불필요 — 로컬 예약이므로 대기만)
3. 알림 탭 → 해당 문장 Detail 화면으로 이동 확인 (앱 종료 상태에서 탭 → 콜드 스타트 라우팅 확인)
4. 해당 문장 삭제 후 이전 알림 다시 탭(알림 센터에 남은 것) → 목록 폴백 확인
5. 모드를 "하루 1번"으로 전환 → iOS 설정 앱 없이 확인하려면 앱 내에서 다시 "시간 간격" 전환 후 문장 전체 삭제 → 0개 캡션 + (다음 정각에 알림 없음) 확인
6. 문장 다시 추가 → 5초 내 재예약(보충) 동작 — 다음 정각 알림 확인

- [ ] **Step 3: CONTEXT.md 갱신**

`docs/CONTEXT.md`의 `- [ ] M1 …` → `- [x] M1 …`, "다음 단계"를 M2로 갱신.

- [ ] **Step 4: 최종 Commit + push**

```bash
git add docs/CONTEXT.md
git commit -m "docs(M1): 간격 알림 완료 — CONTEXT 마일스톤 체크

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push
```

---

## Self-Review 결과 (작성자 체크)

- **Spec §1 커버리지**: §1.1(모드·시간대·0개 캡션)=T5/T9, §1.2(세대 식별자·64 한도·셔플 큐·직렬화·트리거 이원화·부분 실패 커서·전용 쿼리·재충전 안내)=T2/T3/T4/T6, §1.3(콜드 스타트·중복 방지·삭제 폴백·navigationRef)=T7, §1.4 변경 지점 전부 매핑, §5(순수 함수 유닛 테스트)=T1–T3. DST 보정은 §1.2 정의상 "다음 재충전에서 자동" — 별도 코드 불필요(의도).
- **Placeholder 스캔**: TBD/TODO/"적절히" 없음. 모든 코드 스텝에 실제 코드 포함.
- **타입 일관성**: `syncNotificationSchedule`/`debouncedSync`/`QueueState`/`IntervalSettings`/`waitForNotificationHydration` 명칭이 Task 간 일치. Task 5의 동적 import 대상 함수명(`syncNotificationSchedule`)이 Task 6 export와 일치.

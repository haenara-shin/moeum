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

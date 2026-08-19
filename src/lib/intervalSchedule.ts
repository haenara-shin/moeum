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

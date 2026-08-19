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

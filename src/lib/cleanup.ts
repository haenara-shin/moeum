/**
 * OCR 빠른 정리 도구 — PRD §5.1 FR-002, R11 완화
 */

/** 페이지 번호로 보이는 라인 제거 (1, 12, p.34, P 102 등) */
export function removePageNumbers(text: string): string {
  return text
    .split('\n')
    .filter((line) => !/^\s*[pP]?\.?\s*\d+\s*$/.test(line))
    .join('\n');
}

/** 빈 라인 모두 제거 */
export function removeBlankLines(text: string): string {
  return text
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .join('\n');
}

/**
 * 단어/문장 중간에서 끊긴 줄바꿈을 합친다.
 * 한글: 줄 끝이 종결어미(다/요/까/네/지/네요/...)나 문장부호가 아니면 다음 줄과 합침.
 * 영어: 줄 끝이 hyphen이면 hyphen 제거하고 합침. 그 외 공백으로 연결.
 */
export function tidyLineBreaks(text: string): string {
  const lines = text.split('\n');
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const next = lines[i + 1];
    if (!next) {
      out.push(line);
      continue;
    }
    const endsWith = line.trimEnd().slice(-1);
    const isEndingPunct = /[.!?。!?…」』")\]\}]/.test(endsWith);
    const isEndingHangulFinal = /[다요까네지오죠음함임함]\s*$/.test(line);
    if (line.endsWith('-')) {
      // 영어 단어 hyphen 줄바꿈
      lines[i + 1] = line.slice(0, -1) + next.trimStart();
      continue;
    }
    if (!isEndingPunct && !isEndingHangulFinal && line.trim() !== '' && next.trim() !== '') {
      lines[i + 1] = line.trimEnd() + ' ' + next.trimStart();
      continue;
    }
    out.push(line);
  }
  return out.join('\n');
}

/** 모두 비우기 */
export function clearAll(): string {
  return '';
}

/**
 * 앱 ↔ 위젯 동기화 게이트웨이 — PRD §5.1 FR-004 / R1 (위젯 데이터 동기화)
 *
 * Quote CRUD 발생 시 호출:
 *   getRandomQuotes(20) → JSON snapshot → App Group UserDefaults → reloadAllTimelines
 *
 * 실패는 swallow (앱 흐름에 영향 없음, dev에서만 warn).
 */
import { getRandomQuotes } from '../db';
import { pushSnapshot } from '../../modules/moeum-widget-sync';

const WIDGET_QUEUE_SIZE = 20;

let lastSyncAt = 0;
const SYNC_THROTTLE_MS = 800;

export async function syncWidget(): Promise<void> {
  const now = Date.now();
  if (now - lastSyncAt < SYNC_THROTTLE_MS) return;
  lastSyncAt = now;
  try {
    const items = await getRandomQuotes(WIDGET_QUEUE_SIZE, 'all');
    await pushSnapshot(items);
  } catch (e) {
    if (__DEV__) console.warn('syncWidget failed', e);
  }
}

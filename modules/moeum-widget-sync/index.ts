import { requireNativeModule, requireOptionalNativeModule } from 'expo';

type WidgetSyncNative = {
  readonly appGroup: string;
  readonly snapshotKey: string;
  setSnapshot(jsonString: string): Promise<boolean>;
  reloadWidgets(kind?: string | null): Promise<void>;
  getSnapshot(): Promise<string | null>;
};

const Native = requireOptionalNativeModule<WidgetSyncNative>('MoeumWidgetSyncModule');

export type WidgetSnapshot = {
  version: 1;
  generated_at: number;
  items: Array<{ id: number; body: string }>;
};

const SNAPSHOT_VERSION = 1 as const;
const MAX_ITEMS = 20;

/**
 * 메인 앱에서 quote CRUD 발생 시 호출.
 * App Group UserDefaults에 JSON 스냅샷을 push하고 위젯 timeline 리로드.
 */
export async function pushSnapshot(
  quotes: Array<{ id?: number; body: string }>,
): Promise<void> {
  if (!Native) return; // 시뮬레이터/Expo Go에서 모듈 미존재 시 no-op
  const items = quotes
    .filter((q) => q.id != null && q.body.trim().length > 0)
    .slice(0, MAX_ITEMS)
    .map((q) => ({ id: q.id as number, body: q.body }));

  const snapshot: WidgetSnapshot = {
    version: SNAPSHOT_VERSION,
    generated_at: Date.now(),
    items,
  };

  try {
    const json = JSON.stringify(snapshot);
    await Native.setSnapshot(json);
    await Native.reloadWidgets(null);
  } catch (e) {
    // sync 실패는 앱 흐름에 영향 없도록 swallow
    if (__DEV__) console.warn('moeum-widget-sync push failed', e);
  }
}

/**
 * 디버그/검증용 — 현재 위젯이 보고 있는 스냅샷 읽기.
 */
export async function readSnapshot(): Promise<WidgetSnapshot | null> {
  if (!Native) return null;
  try {
    const raw = await Native.getSnapshot();
    if (!raw) return null;
    return JSON.parse(raw) as WidgetSnapshot;
  } catch {
    return null;
  }
}

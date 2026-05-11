# 모음 (Moeum)

> 모두의 + 음 · "좋은 문장을 모으다"

문장/명언 수집 iOS 앱. 직접 입력 또는 스크린샷 OCR로 좋은 문장을 모으고, 잠금/홈 위젯과 매일 알림으로 다시 만난다.

**시리즈**: 모임 / 모가 / 모여 / **모음** (4번째)

## 상태

- 단계: Phase 1 MVP — W1 완료 (환경 구성), W2 진행 중
- 출시 목표: 8주 + 4주 버퍼
- PRD: [`docs/PRD.md`](./docs/PRD.md) (v1.2)
- 입력 방식: 100% 사용자 입력 (직접 메모 / 카메라 / 사진첩 OCR)

## 문서

| 위치 | 내용 |
|---|---|
| `docs/PRD.md` | 제품 요구사항 정의서 (v1.2, Adversarial 검증 반영, 시드 제거) |
| `.debate/20260511_173143_stack/SYNTHESIS.md` | 4-AI 기술 스택 합의안 (Opus·Sonnet·Gemini·Codex) |
| `.debate/.../adversarial_*.md` | PRD 적대적 리뷰 원문 |

## 기술 스택 (PRD §8)

- React Native + **Expo SDK 55** (Managed + Dev Client + Prebuild)
- 패키지 매니저: pnpm
- OCR: 자체 Expo Module — iOS Apple Vision (Swift), Android ML Kit (Kotlin) Phase 1.5
- 위젯: Swift WidgetKit + App Group + JSON 스냅샷 (SQLite 공유 금지)
- TTS: Phase 2 (expo-speech)
- 폰트: Pretendard Variable (위젯은 서브셋팅)
- 저장: expo-sqlite (앱 전용) + UserDefaults(suiteName) (위젯)

## 개발

```bash
pnpm install
pnpm start        # Dev Client (Expo Go 아님)
pnpm ios          # iOS 시뮬레이터
pnpm prebuild     # ios/, android/ 네이티브 디렉토리 생성
```

## 다음 작업 (W1~W8)

PRD §6 참고. W1 초기화 → W2 입력/목록 → W3~4 OCR → W5 알림 → W6 위젯 → W7 백업 → W8 베타.

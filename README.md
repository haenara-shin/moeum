# 모두의 마음가짐 (Moeum)

> 모두의 + 음 · "좋은 문장을 모으다"

책·신문·SNS·기사에서 만난 좋은 문장을 **사진 한 장(OCR)** 또는 직접 입력으로 모으고,
**매일 알림**·**한국어 TTS**·**폴더 정리**로 다시 만나는 한국어 iOS 앱.
모든 데이터는 기기 안에서만 처리되며 외부로 전송되지 않습니다.

**시리즈**: 모두의 임장 / 모두의 가계부 / 모두의 여행 / **모두의 마음가짐** (4번째)

## 기능 (Phase 1)

- 📷 사진에서 자동 글자 추출 (iOS Apple Vision OCR) + 빠른 정리(페이지 번호·공백·줄바꿈)
- 🔔 매일 알림 — 저장한 문장을 다시 만나는 시간
- ▶︎ 한국어 TTS — 단건 읽기 + 폴더 전체 연속 재생(하단 플레이어 바)
- 📁 폴더로 정리 + 폴더별 필터·이동
- ↗︎ 한 문장 공유(카톡·메일·AirDrop) + 컬렉션 JSON 내보내기/가져오기(중복 자동 건너뜀)
- 🌗 라이트·다크·시스템 테마 + Pretendard 폰트

## 상태

- 단계: **Phase 1 코어 완료** — UI 폴리싱 + 출시 준비 중 (PRD v1.3)
- PRD: [`docs/PRD.md`](./docs/PRD.md)
- 입력 방식: 100% 사용자 입력 (직접 메모 / 카메라 / 사진첩 OCR)
- 위젯(iOS WidgetKit): Phase 1.5로 보류 (`_phase1_5_targets/`에 코드 보존)

## 기술 스택

- React Native 0.81 + **Expo SDK 54** (Managed + Dev Client + Prebuild), 패키지 매니저 pnpm
- OCR: 자체 Expo Module — iOS Apple Vision (Swift)
- 저장: expo-sqlite / 상태: zustand / 스타일: NativeWind(Tailwind)
- TTS: expo-speech · 알림: expo-notifications · 폰트: Pretendard

## 개발

```bash
pnpm install
pnpm start        # Dev Client (Expo Go 아님)
pnpm ios          # iOS 시뮬레이터
pnpm prebuild     # ios/, android/ 네이티브 디렉토리 생성
pnpm lint         # tsc --noEmit
```

## 문의

- 이메일: haenara.shin@gmail.com
- 버그·제안: [GitHub Issues](https://github.com/haenara-shin/moeum/issues)
- 개인정보 처리방침: [`privacy.html`](./privacy.html)

# Round 3 — Claude Opus 4.7 Final Recommendation

## 최종 결정 1: 프레임워크 & 워크플로우
**Expo Managed + Dev Client + Config Plugin + EAS Build**. Bare로 떨어지지 말 것 (관리 부담↑).
핵심 패키지:
- `expo` (SDK 51+), `expo-dev-client`
- `expo-sqlite` (저장), `expo-notifications` (알림), `expo-speech` (TTS)
- `expo-image-picker` (이미지 선택), `react-native-vision-camera` (카메라 캡처)
- OCR: 위젯과 함께 직접 작성한 **커스텀 Config Plugin** (Vision/ML Kit 호출)
- `react-native-mmkv` (위젯과 공유할 빠른 KV — App Group 호환)
- `nativewind` 또는 `tamagui` (스타일링, 선택)

## 최종 결정 2: OCR 구현
iOS: **Apple Vision** (VNRecognizeTextRequest, 한국어 `recognitionLanguages = ["ko-KR", "en-US"]`)
Android: **ML Kit Text Recognition v2 Korean** (`com.google.mlkit:text-recognition-korean`)
RN 노출: 자체 Expo Module 작성 (양 플랫폼 동일 인터페이스 `extractText(uri): Promise<{lines: string[]}>`). 기존 RN OCR 라이브러리(`react-native-text-recognition` 등)는 유지보수 불안정 → 직접 작성 권장.

**보정 UI 원칙**: OCR 결과를 1줄 단위로 분할 → 사용자가 (a) 줄 합치기 (b) 줄 삭제 (c) 인라인 편집 가능. 결과는 "수집된 문장 1개"로 저장. 5초 이내 보정 완료가 목표.

## 최종 결정 3: 위젯 구현
**iOS Phase 1**: SwiftUI WidgetKit Extension 1개 (small + medium). 코드 분량 ~150~250 LOC Swift.
- App Group 활성화 → 메인 앱과 공유 `mmkv` 또는 SQLite 파일 경로 공유
- 메인 앱이 매번 "오늘의 큐 N=20" 미리 계산해서 mmkv에 JSON으로 저장
- WidgetKit Timeline Provider가 30분~1시간 단위로 큐에서 다음 문장 표시
- 사용자 "지금 새로고침" 버튼은 `WidgetCenter.shared.reloadAllTimelines()` 트리거 (메인 앱에서)

**Android Phase 1.5**: Glance Composable + WorkManager로 동일 패턴.

## 최종 결정 4: MVP 기능 최종 리스트
**Phase 1 (iOS only)** — 5개:
1. 직접 입력 (제목/본문/저자/출처)
2. **태그 1개 필수 + LIKE 검색** (이견 A 결정: 포함. 데이터 100개 넘으면 필수)
3. OCR + 보정 UI (Vision)
4. 잠금/홈 위젯 (오늘의 문장)
5. 매일 알림 (시간 1개 설정, 랜덤 1개 발송)

**Phase 1 제외 → Phase 2**:
- TTS, 전체 컬렉션 재생, GPT-4o 폴백, OpenAI TTS, 클라우드 동기화, 안드로이드, 풀텍스트 검색, 커스텀 폰트 선택, 위젯 다중 디자인

## 최종 결정 5: 일정 권고
**iOS Phase 1: 8주** (이견 B 결정: 8주 채택 — Codex/Gemini 6주 vs 나의 8~10주 중간값)
- W1: Expo 세팅 + 입력/저장/태그 CRUD + 시드 데이터 100개
- W2: OCR Expo Module + 보정 UI
- W3: 알림 + 검색 + UI 다듬기
- W4-5: 위젯 Config Plugin + Swift WidgetKit + App Group 동기화
- W6: 한글 폰트(Pretendard) + 다크모드 + 백업 export(JSON)
- W7: 베타 테스트(TestFlight) + 버그픽스
- W8: App Store 심사 제출 + 거절 대응 버퍼

**Android Phase 1.5: 추가 +3주** (Glance 위젯 + ML Kit)
**Phase 2 (TTS·AI·동기화): 추가 +4~6주**

## 핵심 리스크 완화 계획
1. **위젯 데이터 동기화** → App Group + react-native-mmkv (앱·위젯 공유 키-값 저장소). 위젯이 직접 DB 안 읽고 미리 계산된 큐만 읽음.
2. **한글 폰트** → Pretendard Variable (오픈 라이선스, 자간/장평 우수)를 앱+위젯에 임베드. 시스템 폰트 fallback.
3. **백업/복원** → 설정에서 "JSON으로 내보내기"(공유 시트) + "JSON 가져오기" 둘 다. iCloud Drive 저장은 사용자가 알아서.
4. **앱스토어 심사** → 시드 데이터 100~300개 (한국 시·고전·무저작권 명언) 사전 동봉으로 콘텐츠 부족 거절 회피. Privacy Manifest 작성, OCR은 "온디바이스 처리, 외부 송신 없음" 명시.

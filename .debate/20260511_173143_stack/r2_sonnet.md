# Round 2 — Sonnet 4.6 Rebuttal

### 1. 본인이 강하게 다른 점
"4개 기능 축소"가 옳다고 봅니다. Opus의 "8~10주 정직"은 학습 곡선을 과소평가합니다. React/TS 학습 중인 1인 개발자가 Expo Bare + EAS Build + WidgetKit 브릿지 + Vision/ML Kit 네이티브 모듈을 동시에 처음 다루면 6주는커녕 10주도 빠듯합니다. Codex의 "TTS 후순위" 판단에는 동의하나, OCR+위젯+알림+입력을 1차에 다 넣자는 입장인데, 위젯 하나만으로도 RN 초심자에겐 2~3주를 잡아먹는 함정입니다. **MVP 범위: 수집(텍스트 입력) + 위젯 + 알림 3개로 더 줄이고, OCR은 v1.1로 미루는 것**도 진지하게 검토해야 합니다.

### 2. 보강할 점
- **Codex의 "순수 Expo 환상 버려라"**: 제 R1은 "RN+Expo 최선"이라 했지만 위젯 시점에 어차피 Dev Client/Prebuild가 필요. Opus의 **Bare + EAS Build 권고가 더 정직**.
- **Opus의 "태그/검색"**: 100개만 쌓여도 검색 없으면 죽은 데이터. 단, **태그 1개 + LIKE 검색**으로 타협.

### 3. 모두가 놓친 리스크
- **위젯 데이터 동기화**: App Group + UserDefaults(또는 shared SQLite) 설계 필수. RN ↔ Swift 위젯 직렬화 포맷, Timeline Provider 갱신 타이밍이 복병.
- **한글 폰트 라이선스**: Pretendard/SUIT OK, 본명조/나눔스퀘어는 상업 배포 조건 확인.
- **iOS 심사**: 백그라운드 모드 권한, 알림 거부 시 폴백 UX 심사관이 봄. 명언 저작권(타인 책 인용) 리젝 사유.
- **백업/복구**: iCloud Drive export(JSON) 최소 기능 필수.
- **다크모드 위젯**: 한글+다크모드 대비 테스트 필수.

### 4. 최소 공통분모 (4명 교집합)
1. RN + Expo (Bare/Prebuild 수용)
2. Apple Vision (iOS) + ML Kit (Android) 분리
3. GPT-4o 폴백 제외, 수동 보정 UI로 대체
4. TTS는 expo-speech 단일, 후순위
5. iOS 먼저 → Android 포팅
6. 위젯/알림은 1차 필수

논쟁은 "기능 개수(3 vs 4 vs 5)"와 "일정(6주 vs 8~10주)"으로 좁혀짐.

# Round 3 — Sonnet 4.6 Final Recommendation

### 최종 결정 1: 프레임워크 & 워크플로우
**Expo Managed + Dev Client + Prebuild**. `npx expo prebuild`로 ios/android 디렉토리를 커밋해 Xcode 위젯 타깃을 직접 추가하되, JS 측은 Expo SDK의 OTA/빌드 파이프라인을 그대로 활용.

**핵심 패키지 6개**:
1. `expo` + `expo-dev-client`
2. `expo-sqlite` (단일 SoT)
3. `expo-notifications`
4. `expo-speech` (Phase 2)
5. `react-navigation`
6. `react-hook-form` + `zod`

상태관리: Zustand 1개. Redux 금지.

### 최종 결정 2: OCR 구현 방식
플랫폼별 네이티브 분리, RN 통합 OCR 라이브러리 금지.
- iOS: Swift `VNRecognizeTextRequest` 래퍼 → Expo Modules API 노출
- Android: Kotlin ML Kit Text Recognition v2 Korean → 동일 인터페이스
- JS: `recognizeText(uri) → Promise<{blocks: TextBlock[]}>`

**보정 UI**: OCR 결과를 1개 TextArea에 줄바꿈 보존 → 자유 편집 → 저장. 신뢰도 표시 안 함.

### 최종 결정 3: 위젯 구현 방식
**Swift WidgetKit 단일 위젯(Small + Medium 2 사이즈)**. Android 위젯은 Phase 2.
- Swift 코드 분량: 200~300줄
- App Group: `UserDefaults(suiteName:)` + Shared Container
- **큐잉 전략**: SQLite는 App Group에 두지 않음(락 충돌). "오늘의 후보 7개"를 JSON으로 직렬화 → App Group UserDefaults push. 위젯은 JSON만 읽음.
- 갱신: 앱 저장/수정시 `WidgetCenter.reloadAllTimelines()` + TimelineProvider 4시간 단위 자동 갱신.

### 최종 결정 4: MVP 기능 + Phase 2
**MVP (iOS only, 5개 화면 이내)**:
1. 직접 입력 (제목/본문/출처)
2. OCR 입력 + 수동 보정
3. 목록 화면 (최신순 무한 스크롤, **검색/태그 없음**)
4. iOS 홈 위젯 (Small/Medium)
5. 매일 1회 로컬 알림

**Phase 2**: 태그 + LIKE 검색, TTS, iCloud 백업, Android.
**Phase 3**: Android 위젯, OCR 블록 편집, 폴더.

R2 타협안(태그+LIKE)은 MVP에서 뺀다. 검색은 데이터 100건 이하에서 가치 낮음.

### 최종 결정 5: 일정 권고
**총 12주, 4단계**:
- W1~2: Expo + Prebuild + Dev Client + SQLite 스키마 + 입력/목록
- W3~5: OCR 네이티브 모듈 + 보정 UI
- W6~8: WidgetKit + App Group 동기화 + 알림
- W9~10: TestFlight 베타, 한글 폰트/다크모드/접근성
- W11~12: 앱스토어 심사 대응 버퍼

React/TS 학습은 W1~2에 30% 시간 할당.

### 핵심 리스크 완화 계획
1. **위젯 동기화**: SQLite는 앱 전용, 위젯은 JSON 스냅샷 전용. 저장 트랜잭션 마지막에 스냅샷 재생성 + `reloadAllTimelines()`.
2. **한글 폰트**: Apple SD Gothic Neo 기본, Pretendard 1종 번들. 위젯도 동일, line-height 1.4 고정.
3. **백업/복원**: MVP에 JSON export/import(공유 시트). iCloud Drive는 Phase 2.
4. **앱스토어 심사**: (a) "본인 입력 데이터만 저장" 명시, (b) OCR 카메라 권한 한/영 동시, (c) 알림 거부 케이스 통과.

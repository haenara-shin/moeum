# 4-AI Debate 최종 합의안 — 문장/명언 수집 앱 기술 스택

**참가자**: Claude Opus 4.7, Sonnet 4.6, Gemini 0.38.1, Codex 0.125.0 (GPT-5.4)
**라운드**: 3 (오프닝 → 반론 → 최종 권고)
**평가 가중치**: 균형 (구현 용이성·확장성·UX 1:1:1)
**날짜**: 2026-05-11

---

## 📐 결정 사항 (4/4 만장일치 또는 다수 합의 후 중재)

### 1. 프레임워크 & 워크플로우 ✅ 만장일치
**Expo Managed + Dev Client + Prebuild + EAS Build**
- 순수 Bare Workflow는 관리 부담 ↑, 순수 Managed는 위젯·OCR 네이티브 모듈 불가 → 중간 지대
- `npx expo prebuild`로 ios/android 디렉토리 생성·커밋 → Xcode에서 위젯 타깃 직접 추가
- JS 측은 Expo SDK의 OTA/EAS Build 파이프라인 유지

**확정 패키지 (7개)**:
```
expo, expo-dev-client          # 개발 빌드
expo-sqlite                    # 단일 SoT 로컬 DB
expo-notifications             # 매일 알림
expo-speech                    # TTS (Phase 1 또는 2)
expo-image-picker              # 갤러리 이미지 선택
react-native-vision-camera     # 카메라 캡처 + Frame Processor
@react-navigation/native       # 라우팅
```
**스타일링**: `nativewind` 1종, 상태관리: `zustand` 1종 (Redux 금지)
**폼**: `react-hook-form` + `zod`

---

### 2. OCR 구현 방식 ✅ 만장일치
**자체 Expo Module로 플랫폼별 네이티브 분리. 통합 RN OCR 라이브러리 사용 금지** (`react-native-text-recognition` 등은 유지보수 불안정)

- **iOS**: Swift로 `VNRecognizeTextRequest` 래퍼
  - `recognitionLanguages = ["ko-KR", "en-US"]`, `recognitionLevel = .accurate`
- **Android**: Kotlin으로 ML Kit Text Recognition v2 Korean
  - `com.google.mlkit:text-recognition-korean`
- **JS 노출 인터페이스**:
  ```ts
  recognizeText(uri: string): Promise<{ blocks: TextBlock[], rawText: string }>
  ```

**보정 UI 원칙**: OCR 결과를 1개 TextArea에 줄바꿈 보존해 띄움 → 사용자 자유 편집 → 저장. **신뢰도 점수 표시 안 함**(혼란만 가중). 5초 안에 보정 완료가 UX 목표.

**GPT-4o vision 폴백**: 만장일치 Phase 2 이후로 보류.

---

### 3. 위젯 구현 방식 ✅ 만장일치
**iOS Phase 1: Swift WidgetKit, Small + Medium 2 사이즈 단일 위젯**

- **예상 분량**: Swift 200~400 LOC (1주 작업량)
- **데이터 공유**: App Group `group.com.{도메인}.quotes` 활성화
- **저장 매체**: `UserDefaults(suiteName:)` + JSON 스냅샷 (SQLite는 App Group에 두지 말 것 — 락 충돌 위험)
- **큐잉 전략**:
  1. 메인 앱이 "오늘의 후보 7~20개"를 JSON 직렬화해 App Group UserDefaults에 push
  2. 위젯은 SQLite를 직접 읽지 않고 JSON만 읽음
  3. 갱신: (a) 앱 저장/수정 시 `WidgetCenter.shared.reloadAllTimelines()`, (b) `TimelineProvider`가 4시간 단위 자동 회전

**Android 위젯**: Phase 1.5로 분리 (Glance + WorkManager 동일 패턴)

---

### 4. TTS ✅ 만장일치
**Phase 1**: `expo-speech`만 (단건 재생, AVSpeechSynthesizer / Android TTS)
**Phase 2**: OpenAI gpt-4o-mini-tts 프리미엄 옵션, 전체 컬렉션 연속 재생, 백그라운드 오디오 세션

이유: 시스템 한국어 TTS(유나/지민)는 단문 명언에 충분 자연스럽고, 백그라운드 오디오·잠금화면 컨트롤·인터럽션 처리는 함정.

---

### 5. MVP 기능 최종 리스트 🟡 다수 합의 후 중재

**Phase 1 (iOS only) — 5개 핵심**:
1. ✅ 직접 입력 (제목/본문/출처/저자)
2. ✅ OCR 입력 + 수동 보정 UI
3. ✅ 목록 화면 (최신순 무한 스크롤) + **간단 LIKE 검색** (제목/본문)
4. ✅ iOS 홈/잠금 위젯 (Small/Medium)
5. ✅ 매일 1회 로컬 알림 (시간 1개 설정)

**중재 사유** (이견 A: 태그/검색):
- Opus·Gemini: 둘 다 MVP / Codex: 검색만 / Sonnet: 둘 다 Phase 2
- 합의: **검색은 LIKE 단순형으로 MVP 포함, 태그는 Phase 2** (2:1:1 중 검색에 다수)
- 100건 넘으면 검색 없으면 죽은 데이터라는 다수 의견 반영

**Phase 2 (TTS·고도화)**:
- 태그 1개 + 고급 검색/필터
- TTS 단건 → 전체 재생, OpenAI 프리미엄 음성
- iCloud Drive 자동 백업
- Android 빌드 + Glance 위젯
- OCR 블록 단위 편집

**Phase 3 (장기)**:
- 공유 (이미지 카드 생성), Apple Watch, AI 추천(GPT-4o)

---

### 6. 일정 권고 🟡 다수 합의 후 중재

**iOS Phase 1 = 8주 목표 / 12주 안전 마진**

| 주차 | 작업 |
|---|---|
| W1 | Expo 환경 + Prebuild + Dev Client + SQLite 스키마 + 시드 컨텐츠 |
| W2 | 입력·목록·상세 UI + LIKE 검색 + React/TS 학습 30% |
| W3-4 | OCR 네이티브 모듈 (Swift VNRecognizeTextRequest) + 보정 UI |
| W5 | 매일 알림 + 한글 폰트(Pretendard) + 다크모드 |
| W6-7 | WidgetKit Swift + App Group + JSON 큐잉 + Timeline |
| W8 | 백업 JSON export/import + 폴리싱 + TestFlight 배포 |
| W9-10 (버퍼) | 베타 피드백 수정 + 앱스토어 자산 + 첫 심사 제출 |
| W11-12 (버퍼) | 심사 거절 대응 |

**중재 사유**: Codex/Gemini/Opus 8주 vs Sonnet 12주 → **8주 적극 목표, 4주 버퍼 명시**가 정직한 절충.

**Android 확장**: Phase 1.5로 +3주.

---

## ⚠️ 핵심 리스크 완화 계획 (4명 모두 식별)

### R1. 위젯 데이터 동기화
- App Group 활성화 + `react-native-mmkv` 또는 `UserDefaults(suiteName:)`
- SQLite는 앱 전용, 위젯은 JSON 스냅샷만 읽음 (읽기 경로 이원화)
- 저장 트랜잭션 마지막에 무조건 스냅샷 재생성 + `reloadAllTimelines()` 호출
- WidgetKit Timeline refresh는 OS 통제(주 ~40~70회 제한) → 미리 7~20개 큐로 만들어둘 것

### R2. 한글 폰트 / 타이포그래피
- **시스템**: Apple SD Gothic Neo (기본 fallback)
- **번들**: Pretendard Variable 1종 (오픈 라이선스, 자간/장평 우수)
- 위젯도 동일 폰트 강제, line-height 1.4 고정
- 다크모드 대비 테스트 필수

### R3. 백업/복원
- **MVP 필수**: 설정 → JSON export/import (공유 시트 경유)
- iCloud Drive 자동 동기화는 Phase 2
- "데이터 손실 0건" 첫 출시부터 목표

### R4. 앱스토어 심사
- **콘텐츠 부족 회피 (Guideline 4.2)**: 한국 시·고전(저작권 만료 1923년 이전) 명언 50~100개 시드 동봉 + "사용자 입력 콘텐츠 앱" 포지셔닝 명시
- **OCR 권한 문구**: 카메라 사용 목적 한/영 동시 등록, "온디바이스 처리, 외부 송신 없음" 명시
- **Privacy Manifest** (iOS 17+): UserDefaults·File Access 등 API reason code 작성
- **알림 권한 거부 케이스**: 거부해도 앱 정상 사용 가능해야 심사 통과

---

## 📊 합의 강도 요약

| 결정 영역 | 합의 강도 | 비고 |
|---|---|---|
| 프레임워크 (Expo + Dev Client) | 4/4 ✅ | 만장일치 |
| OCR (네이티브 분리) | 4/4 ✅ | 만장일치 |
| 위젯 (Swift + App Group) | 4/4 ✅ | 큐잉 전략 합의 |
| TTS (expo-speech 단일) | 4/4 ✅ | 만장일치 |
| GPT-4o 폴백 제외 | 4/4 ✅ | 만장일치 |
| MVP 기능 (5개) | 3/4 🟡 | 검색 포함 다수결 |
| 일정 8주 | 3/4 🟡 | Sonnet만 12주 |
| 리스크 4종 식별 | 4/4 ✅ | 만장일치 |

**전체 합의도: 매우 높음**. 핵심 기술 결정은 만장일치, 범위·일정만 미세 조정.

---

## 🎯 다음 행동 항목 (1인 개발자 즉시 가능)

1. Apple Developer Program 가입 ($99/년)
2. EAS CLI 설치, Expo 계정 생성
3. 도메인 결정 (Bundle ID용, 예: `com.haenara.quotelens`)
4. Pretendard Variable 폰트 다운로드 + 라이선스 확인
5. 한국 무저작권 시·명언 50~100개 시드 데이터 수집 (별도 JSON)
6. PRD 작성 → `/octo:prd` 활용 권장

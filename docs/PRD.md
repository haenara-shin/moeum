# 모음(Moeum) — PRD v1.3

> **모두의 + 음** · "좋은 문장을 모으다"
> 모음(母音) 이중 의미로 '문장의 본질'을 담는 1인 개발자용 iOS 앱
>
> **v1.3 변경점** (2026-05-17): Phase 1 큰 폭 확장 — TTS·공유·폴더 추가, author/source UI 제거, iOS 위젯 Phase 1.5 보류
> **v1.2 변경점**: 시드 데이터 제거 — 100% 사용자 입력 콘텐츠 앱으로 포지셔닝 변경
> **v1.1 변경점**: Codex + Gemini 적대적 리뷰 반영 — 핵심 5개 모순/누락/리스크 해소

| 메타 | 값 |
|---|---|
| **프로젝트 코드명** | moeum |
| **버전** | v1.3 (Phase 1 expanded — TTS·Share·Folders) |
| **작성일** | 2026-05-11 (v1.0) → 2026-05-17 (v1.3) |
| **작성자** | Haenara Shin |
| **시리즈** | 모임 / 모가 / 모여 / **모음** |
| **Bundle ID** | `com.haenarashin.moeum` (모여와 동일 namespace) |
| **ASC App ID** | `6769943864` |
| **상태** | Phase 1 코어 기능 구현 완료, UI 폴리싱 + 출시 준비 단계 |

---

## v1.3 변경 요약

### Phase 1 신규 포함 (debate 만장일치로 Phase 2였던 것들)
- **단건 TTS** (DetailScreen ▶︎): expo-speech 한국어 재생
- **단건 공유** (DetailScreen ↗︎): iOS Share Sheet (카톡·메일·메시지·AirDrop)
- **폴더 기능**: folders 테이블 + 가로 칩 + 이동 ActionSheet + 폴더별 필터
- **연속 TTS 재생**: 현재 폴더 큐 + 하단 PlayerBar (⏮ ⏸▶︎ ⏭ ✕)
- **컬렉션 JSON 공유/가져오기**: 설정 → 내보내기(범위 선택)/가져오기, 중복 자동 감지
- **설정 화면 + 테마 선택**: Light/Dark/System, zustand persist
- **Pretendard 폰트** 번들 + 다크모드 색 보강

### Phase 1에서 제거된 UI
- author 입력 필드 — 데이터 컬럼은 보존, UI만 제거
- source 입력 필드 — 동일

### Phase 1.5로 보류
- **iOS 위젯**: `@bacons/apple-targets` plugin이 pbxproj 주입은 OK이나
  EAS Build cloud의 "Configure Xcode project" 단계에서 unknown error 반복.
  코드는 `_phase1_5_targets/` 디렉토리에 보존. App Group entitlement,
  `modules/moeum-widget-sync`, 앱 측 `syncWidget()` 호출은 그대로 유지.

---

## 빌드/배포 진척 (2026-05-11 ~ 17)

| # | 결과 | 비고 |
|---|---|---|
| 1~3 | 환경 셋업 + EAS credentials | pnpm strict → `node-linker=hoisted` |
| 4 | JS bundling fail | `react-native-css-interop` 누락 |
| 5 | Build OK / TestFlight 미노출 | 모든 환경 정렬했음에도 |
| 6 | submit fail | "build number 6 used" 충돌 |
| 7 | Build·Submit OK / 미노출 | push entitlement 제거 시도 |
| 8 | Build fail | SDK 54 vs vision-camera 충돌 (Nitro+worklets) |
| 9 | Build fail (OCR 분리) | vision-camera가 진짜 원인 확인 |
| 10 | Build·Submit OK / 미노출 | vision-camera 제거 + worklets 추가 |
| **새 시작** | **Bundle ID 변경 `com.haenara.moeum` → `com.haenarashin.moeum`** | TestFlight 노출 성공! |
| #2~3 (신 ASC 앱) | OCR·TTS·폴더·공유·테마·폰트·알림 | 모두 동작 |
| #10~12 | Widget Configure Xcode project fail | Phase 1.5로 보류 |
| #13 | App-only Build OK | DB 마이그레이션 버그 발견 |
| **#14** | **App-only OK, DB v1→v2 마이그레이션 fix** | 현재 빌드 |

---

## 0. v1.1 적대적 리뷰 반영 (Adversarial Review Applied)

### 두 외부 모델이 공통 지적
- **첫 사용자 불만 #1**: "OCR 보정이 카톡 타이핑보다 귀찮다" → 이탈 (Codex + Gemini 동일 지적)
- **재노출 가치 가설 미검증**: 본인이 직접 수집한 문장은 이미 각인되어 위젯이 "시각적 소음"화 가능성
- **자동 복구 경로 부재**: 수동 JSON export를 잊은 사용자 보호 없음

### Gemini 단독 지적 → 반영
- **위젯 30MB 메모리 한도** + Pretendard 번들 → 빈 화면(out) 위험 (★치명적, 신규 R9)
- 위젯 텍스트 truncation 정책 부재
- 원본 이미지 옵션 보관 부재 (재OCR 불가)
- "학습용 MVP"와 "네이티브 Swift 직접 구현" 일정 모순 → 12주 워스트 강조

### Codex 단독 지적 → 반영
- "클라우드 동기화 없음" vs "iCloud Backup·Drive" 모순 → 용어 정리
- 즐겨찾기 Phase 2인데 MVP 스와이프에 아이콘 노출 모순 → 제거
- **Retention 가설 = 수집 후 방치 깨지 못함** (★ 신규 R10)

이 5개를 본문에 명시 반영. 자세한 매핑은 §11.

---

## 1. Executive Summary

**모음**은 한국어 사용자를 위한 "문장 수집 + 매일 노출" iOS 앱이다. 책·SNS·기사·강연에서 만난 좋은 문장들을 직접 입력하거나 스크린샷 OCR로 추출해 한곳에 모으고, 잠금화면/홈 위젯과 매일 알림으로 다시 만난다.

**핵심 가치**: "수집"보다 "재노출". 단, **재노출이 실제 가치를 주는지는 가설** — MVP에서 본인+가족 인터뷰로 검증한다.

**MVP 범위**: iOS only, 5개 핵심 기능 + 백업, 8주 개발 + 4주 심사 버퍼 = 12주 워스트.

**1차 성공 조건**: 본인 + 아내 일 1회 사용, 8주 누적 100개 수집, 크래시·데이터 손실 0건.

---

## 2. Problem Statement

### 2.1 사용자가 겪는 문제
| 문제 | 빈도 | 영향 |
|---|---|---|
| 카카오톡 "나에게 보내기"에 흩어짐 | 매우 높음 | 검색 불가, 시간순 묻힘 |
| 스크린샷만 찍고 텍스트 추출 안 함 | 매우 높음 | 사진첩에 묻혀 영원히 다시 안 봄 |
| 메모 앱(Apple Notes, Notion)에 단순 나열 | 높음 | 재노출 메커니즘 없음 |
| 인스타 "저장"으로 우회 | 높음 | 본인 콘텐츠로 큐레이션 불가 |

### 2.2 시장의 빈 자리
기존 iOS 앱은 "사용자 수집 + OCR + 위젯 + 매일 알림" 조합이 없음 (debate Round 0 검증).

### 2.3 검증 필요한 핵심 가설 (★ Adversarial 반영)
> **H1**: "사용자가 만난 좋은 문장을 5초 안에 저장하고 매일 자동 노출할 수 있다면, 그 문장이 사용자의 삶에 실제 영향을 미친다."
>
> **반론**: 본인이 직접 수집한 문장은 이미 뇌에 각인 → 재노출이 '시각적 소음'화 가능 (Gemini 지적)

**검증 방법** (8주 후):
- 본인·아내 인터뷰: "위젯에서 본 문장이 실제 의사결정/감정에 영향을 준 경험 N건"
- 위젯 노출 → 앱 진입 이벤트 로깅 (주 3회 미만 시 H1 기각)
- 알림 탭률 30% 미만 시 H1 약화

> **H2**: "OCR + 수동 보정이 카톡 타이핑보다 빠르다" — Adversarial 핵심 지적 대응
>
> **검증**: 본인 측정 — 같은 문장을 (a) OCR+보정 (b) 직접 타이핑으로 각 20회 시행, 평균 시간 비교. (a) < 1.3 × (b) 통과.

---

## 3. Goals & Metrics

### 3.1 비즈니스/제품 목표 (SMART)
1. **G1 (P0)**: MVP 출시 후 8주간 **개발자 본인 + 아내**가 일평균 1회 이상 앱을 열고 사용
2. **G2 (P0)**: 동일 기간 **크리티컬 버그 0건**, 데이터 손실 0건
3. **G3 (P0)**: H1·H2 가설 검증 데이터 수집 (성공/실패 명확화)
4. **G4 (P1)**: 수집 문장 100개 이상 누적 시점에 검색/위젯 회전이 체감 가치 제공
5. **G5 (P2)**: 시리즈(모임/모가/모여)와 동일한 UX 일관성 유지

### 3.2 성공 지표
| 지표 | 목표 | 측정 |
|---|---|---|
| **DAU (개발자+가족)** | 2명 × 일 1회 이상 | 로컬 사용 로그 |
| **수집 문장 누적** | 4주 후 50개, 8주 후 100개 | SQLite count |
| **OCR vs 타이핑 시간비** | OCR ≤ 1.3 × 타이핑 (H2 검증) | 본인 측정 20회 |
| **OCR 성공률** | 깔끔한 스크린샷 90% (수정 없이 저장) | 사용 로그 |
| **위젯 → 앱 진입** | 주 3회 이상 (H1 검증) | App Group 이벤트 |
| **알림 탭률** | 30% 이상 (H1 검증) | UNUserNotificationCenter |
| **크래시율** | 0.5% 미만 | TestFlight |
| **위젯 메모리** | 30MB 미만 (★R9) | Instruments 측정 |
| **앱스토어 심사** | 2차 이내 통과 | App Review 결과 |

### 3.3 명시적 Non-Goals (Phase 1)
- ❌ **내장 명언/시드 데이터** — 본 앱은 100% 사용자 입력 콘텐츠. 앱이 제공하는 명언 풀 없음 ★ v1.2
- ❌ 멀티 유저 / 소셜 / 공유 기능
- ❌ **클라우드 자동 동기화** — iCloud Backup(OS 기본)은 있지만 앱 차원의 동기화 기능 없음 (★ v1.1 용어 정리)
- ❌ Android (Phase 1.5)
- ❌ TTS (Phase 2)
- ❌ AI 추천 / 자동 분류 / GPT-4o vision 폴백 (Phase 2+)
- ❌ 태그 (Phase 2)
- ❌ **즐겨찾기 / 좋아요** — 스와이프 액션, 아이콘 모두 v1.1에서 제거 (Phase 2) ★
- ❌ 결제 / 구독 (Phase 2+)
- ❌ Apple Watch / iPad 최적화 (Phase 3)

### 3.4 입력 경로 (★ v1.2 명시)
사용자가 문장을 추가하는 방법은 다음 3가지뿐:
1. **직접 메모**: 타이핑으로 본문/저자/출처 입력 (FR-001)
2. **카메라 촬영**: 책·종이를 즉석에서 찍어 OCR로 추출 (FR-002a)
3. **사진첩에서 선택**: 기존 스크린샷·사진을 골라 OCR로 추출 (FR-002b)

→ 앱 출시 시 빈 상태로 시작. "첫 문장을 모아보세요" 온보딩이 핵심 UX.

---

## 4. User Personas

### Persona A — "수집가 개발자" (Primary, 본인)
- **누구**: 35세, 1인 개발자, Python·AI 전문, React/TS 학습 중
- **사용 패턴**: 일 5~10개 신규 문장 발견 가능
- **결정적 순간**: 잠금화면에서 본 옛 문장이 오늘 의사결정에 영향을 줄 때
- **이탈 트리거** ★: OCR 보정 평균 시간이 30초 넘으면 카톡으로 회귀

### Persona B — "감성 큐레이터" (Secondary, 아내)
- **누구**: 30대, 모바일 UI/UX 관심
- **사용 패턴**: 인스타·책 스크린샷 위주, 위젯 보기 좋아함
- **결정적 순간**: 친구에게 위젯 스크린샷 공유할 때
- **이탈 트리거** ★: 위젯 텍스트 잘림/깨짐 또는 빈 위젯

---

## 5. Functional Requirements

### 5.1 핵심 기능 (P0 — MVP 필수)

#### FR-001: 문장 직접 입력
- **사용자 액션**: `+` → "직접 입력"
- **필드**: `body` (1~2000자, required), `author` (≤100자), `source` (≤200자)
- **검증**: `react-hook-form` + `zod`
- **성공 조건**: 저장 후 목록 최상단 즉시 표시, 위젯 큐 갱신

#### FR-002: 이미지/스크린샷 OCR 입력 (★ v1.1 보강 / v1.2 입력 경로 명시)
- **사용자 액션** (★ v1.2):
  - `+` → "사진 찍기" (FR-002a): `expo-image-picker` 카메라 모드, 즉석 촬영
  - `+` → "사진첩에서 선택" (FR-002b): `expo-image-picker` 라이브러리 모드, 다중 선택은 Phase 2
  - 둘 다 동일한 OCR + 보정 UI로 흐름 합류
- **OCR 처리**:
  - iOS Apple Vision `VNRecognizeTextRequest`
  - `recognitionLanguages = ["ko-KR", "en-US"]`, `.accurate`
  - Expo Modules API 노출
- **보정 UI** (★ Adversarial 반영):
  - OCR 결과를 멀티라인 TextInput에 줄바꿈 보존
  - **빠른 정리 도구** (Adversarial 핵심 반영):
    - "페이지 번호 제거" 버튼 (정규식 `^\d+\s*$` 라인 일괄 삭제)
    - "공백 라인 제거" 버튼
    - "줄바꿈 다듬기" 버튼 (단어 중간 줄바꿈 자동 연결)
    - "전체 지우고 처음부터" 버튼
  - 신뢰도 점수 표시 안 함
  - **원본 이미지 옵셔널 보관** (★ 신규): 사용자가 "원본 보관" 체크 시 `Documents/originals/<id>.jpg` 저장 → 재OCR 가능
- **성능 목표**: 이미지 선택 → 결과 표시 2초 이내, **보정 평균 30초 이내** (H2 검증)

#### FR-003: 목록 화면 + LIKE 검색 (★ v1.1 보강)
- **기본 뷰**: 최신순 무한 스크롤 `FlatList`, 카드형
- **검색**: 상단 검색 바, `WHERE body LIKE ? OR author LIKE ?`, 300ms 디바운스
- **항목 액션**:
  - 탭 → 상세
  - 좌 스와이프 → 삭제 (확인 다이얼로그)
  - **우 스와이프 → 액션 없음** (★ v1.1: 즐겨찾기 아이콘 모두 제거, Phase 2까지 보류)
- **빈 상태**: "첫 문장을 모아보세요" + 큰 `+` 버튼

#### FR-004: iOS 홈/잠금화면 위젯 (★ v1.1 메모리·truncation 보강)
- **위젯 타입**: 1개 위젯, 2개 사이즈
  - `systemSmall` (155×155pt) — **최대 ~40자** 표시 + 저자 1줄
  - `systemMedium` (329×155pt) — **최대 ~120자** 표시 + 저자 + 출처
- **★ Truncation 정책** (Adversarial 반영):
  - 본문이 사이즈 한도 초과 시 어절 단위로 잘라 마지막에 `…` 추가
  - "…" 표시 시 사용자에게 "탭하면 전체 보기" UX 힌트
  - 너무 짧은 문장(< 20자)도 처리 가능 (큰 폰트로 중앙 정렬)
- **★ 메모리 제약** (Gemini R9 직접 반영):
  - 위젯 Extension 메모리 한도 30MB **하드 제약**
  - Pretendard Variable 대신 **위젯용에는 Pretendard Regular + Bold 2 스타일만 서브셋 임베드** (한글 2350자만)
  - 이미지·복잡 SVG 미사용
  - Instruments 측정 W6 필수 체크포인트
- **데이터 큐잉**:
  1. 메인 앱: "오늘의 후보 7~20개" JSON 직렬화 → App Group `UserDefaults(suiteName: "group.com.haenara.moeum")`
  2. SQLite는 App Group에 두지 않음 (락 충돌 회피)
  3. `TimelineProvider` 4시간 단위 회전
  4. 메인 앱 저장/수정 시 `WidgetCenter.shared.reloadAllTimelines()`
- **★ Stale 데이터 방지**: snapshot `generated_at`이 24시간 초과 시 위젯 fallback 메시지 "앱을 한 번 열어주세요"
- **탭**: `widgetURL` 딥링크 → 상세 화면

#### FR-005: 매일 1회 로컬 알림 (★ v1.1 권한 보강)
- **설정**: 시간 1개 (기본 오전 8시) 토글
- **내용**: 랜덤 1개 (본문 100자 미리보기 + 저자)
- **권한 거부 케이스** (★ Adversarial 반영):
  - 거부해도 앱 모든 기능 사용 가능
  - 설정 화면에 "알림 권한 필요" 안내 + iOS 설정 딥링크
  - 권한 거부 → 위젯이 알림 역할 보완 (위젯 4시간 회전이 일종의 "알림")
- **권한 변경 감지** (★ 신규): 앱 포그라운드 진입 시 `getPermissionsAsync()` 호출 → 거부에서 허용으로 바뀌면 자동 스케줄 재등록

#### FR-006: JSON Export/Import + 자동 백업 알림 (★ v1.1 보강)
- **위치**: 설정 → "내 문장 내보내기" / "가져오기"
- **포맷**: `{ version: 1, exported_at, items: [...] }`
- **공유**: iOS Share Sheet (메일·iCloud Drive·AirDrop)
- **가져오기**: 중복 감지 (body+author SHA-1 해시), "X개 신규, Y개 중복" 표시 후 확인
- **★ 자동 백업 알림** (Adversarial 반영 — 자동 복구 경로):
  - 첫 사용 후 7일째, 30일째 알림 1회: "백업 한 번 만들어두실래요?"
  - 수집 문장이 10·50·100개 도달 시 토스트로 export 제안
  - 사용자가 "iCloud Drive에 저장" 1회 선택 시 마지막 경로 기억 → 다음 export 자동 같은 위치

### 5.2 비기능 요구사항 (NFR) (★ v1.1 신규 추가)

| ID | 항목 | 목표 |
|---|---|---|
| NFR-001 | OCR 처리 시간 | 95th < 2초 (iPhone 12+) |
| NFR-002 | 앱 콜드 스타트 | < 1.5초 |
| NFR-003 | 위젯 데이터 동기화 지연 | 앱 저장 후 5초 이내 |
| NFR-004 | 다크모드 | 모든 화면·위젯 대응 |
| NFR-005 | 한글 폰트 가독성 | Pretendard, line-height 1.4 |
| NFR-006 | 접근성 (Dynamic Type) | 본문 시스템 폰트 크기 대응 |
| NFR-007 | 데이터 손실 | 0건 (트랜잭션·백업 보장) |
| NFR-008 | Privacy Manifest | iOS 17+ reason code 작성 |
| **NFR-009** ★ | **위젯 메모리** | **< 30MB (Instruments 측정 필수)** |
| **NFR-010** ★ | **OCR 보정 시간** | **평균 30초 이내 (H2 검증)** |

---

## 6. Implementation Phases

### Phase 1 — iOS MVP (★ v1.1 학습 곡선 가중)

| 주차 | 작업 | 산출물 | 신규 메모 |
|---|---|---|---|
| W1 | Expo + Dev Client + Prebuild + SQLite + 시드 50~100개 | 빌드 가능 | RN/TS 학습 30% 할당 |
| W2 | 입력·목록·상세·LIKE 검색 | FR-001, FR-003 | |
| W3 | OCR Swift 모듈 (Vision) | OCR API 완성 | **★ 가장 큰 학습 구간** |
| W4 | OCR 보정 UI + 빠른 정리 도구 + 원본 옵셔널 | FR-002 완성 | H2 측정 시작 |
| W5 | 알림 + 한글 폰트(Pretendard 서브셋) + 다크모드 | FR-005 | |
| W6 | WidgetKit + App Group + truncation + **Instruments 메모리 측정** | FR-004 | **★ R9 검증 게이트** |
| W7 | JSON export/import + 자동 백업 알림 + 폴리싱 + TestFlight | FR-006 | |
| W8 | 베타 피드백 + 앱스토어 자산 + 가설 검증 시작 (H1, H2) | 제출 준비 | |
| W9~12 (버퍼) | 심사 제출 + 거절 대응 + 정식 출시 | 라이브 | |

### Phase 1.5 — Android (W13~15)
ML Kit Korean + Glance 위젯 + WorkManager

### Phase 2 — 고도화 (W16~21)
태그, TTS, OpenAI 음성, iCloud Drive 자동 동기화, 즐겨찾기, 폴더

### Phase 3 — 장기
이미지 카드 공유, Watch, iPad, AI 추천, IAP

---

## 7. Risks & Mitigations

### 4대 핵심 리스크 (debate 만장일치)

#### R1: 위젯 데이터 동기화 실패
- **완화**: SQLite 앱 전용 / 위젯 JSON 스냅샷 / `reloadAllTimelines()` / Timeline refresh 제한 대비 큐
- **검증**: W6 통합 테스트

#### R2: 한글 폰트 렌더링
- **완화**: Pretendard Variable → 위젯은 서브셋팅(한글 2350자, Regular+Bold만), line-height 1.4, 다크모드 대비 4.5:1
- **검증**: W5 스크린샷 비교

#### R3: 데이터 손실
- **완화**: JSON export/import MVP 필수 + 자동 백업 알림 (7일/30일/마일스톤)
- **검증**: W7 E2E (export → 삭제 → import)

#### R4: 앱스토어 심사 거절 (★ v1.2 시드 의존 제거)
- **위험**: 빈 상태 출시 → Guideline 4.2 "콘텐츠 최소화" 거절 가능성 ↑
- **완화**:
  - **"100% 사용자 입력 콘텐츠 앱"으로 명확히 포지셔닝** (앱스토어 설명·온보딩에 일관)
  - 앱스토어 스크린샷에 예시 문장(워터마크 "예시") 포함 → 가치 즉시 전달
  - 온보딩 = 첫 콘텐츠 생성 흐름. 진입 시 OCR 데모로 가치 체험
  - Privacy Manifest 작성, 알림 거부해도 정상 사용, 카메라/사진 권한 한/영 사유
  - 약관: "사용자는 본인이 권리를 가진 콘텐츠만 입력" 명시
- **검증**: W8 체크리스트

### ★ Adversarial Review 신규 리스크 (v1.1)

#### R9 ★: 위젯 메모리 30MB 초과 → 빈 위젯 (Gemini 지적)
- **위험도**: 치명적 (위젯이 MVP 핵심 가치 — 빈 위젯 = 앱 가치 0)
- **완화**:
  - Pretendard Variable 대신 **Regular + Bold 2 스타일만 서브셋팅** (한글 2350자)
  - 위젯 Extension 내 이미지·SVG·고용량 라이브러리 사용 금지
  - SwiftUI 단순 텍스트 + 색상만 사용
  - Instruments Memory Profiler로 모든 사이즈 측정 (W6 필수)
  - 30MB 초과 검출 시 폰트를 시스템 폰트로 fallback
- **검증**: W6 NFR-009 측정, 25MB 이상 시 즉시 재설계

#### R10 ★: 재노출 가치 가설(H1) 미검증 → "수집 후 방치" (Codex 지적)
- **위험도**: 높음 (제품 본질이 무너지는 리스크)
- **완화**:
  - 본인·아내 8주간 일기형 인터뷰 메모 (주 1회)
  - 위젯 → 앱 진입 이벤트 로깅
  - 알림 탭률 측정
  - 8주 후 H1 검증 결과에 따라 Phase 2 방향 결정 (소셜 공유로 의미 강화 vs 개인 리추얼 강화)
- **검증**: W8~12 가설 검증 데이터 수집

#### R11 ★: OCR 보정 = 카톡 타이핑보다 느림 → 이탈 (Codex + Gemini 공통)
- **위험도**: 매우 높음 (첫 사용 후 이탈 직접 원인)
- **완화**:
  - **빠른 정리 도구 4개** (FR-002): 페이지 번호 제거, 공백 라인 제거, 줄바꿈 다듬기, 전체 초기화
  - OCR 결과가 명확히 깨진 경우 즉시 "처음부터 입력" 큰 버튼
  - 짧은 문장(< 30자)은 OCR 건너뛰고 직접 입력 안내
  - **H2 명시 측정**: OCR ≤ 1.3 × 타이핑 시간 (NFR-010)
- **검증**: W4부터 본인 20회 측정, 미달 시 보정 도구 추가

### 추가 식별 리스크

| ID | 리스크 | 완화 |
|---|---|---|
| R5 | RN+Swift WidgetKit 첫 경험 학습 곡선 | W3~4 OCR, W6 위젯 단독 배정, 30% 학습 시간 |
| R6 | iCloud Backup 의존 → SQLite 복구 실패 케이스 | JSON export를 "복구 안전망"으로 마케팅 |
| R7 | OCR 광고와 실제 차이 | "100% 자동" 표현 금지, "보정 UI"를 핵심 가치로 |
| R8 | 위젯 텍스트 잘림으로 "메모앱이 낫다" | truncation 정책 + 탭하면 전체 보기 UX |

---

## 8. Technical Stack

### 8.1 확정 의존성 (변경 없음)
```json
{
  "expo": "~51.0",
  "expo-dev-client": "*",
  "expo-sqlite": "*",
  "expo-notifications": "*",
  "expo-speech": "* (Phase 2)",
  "expo-image-picker": "*",
  "react-native-vision-camera": "*",
  "@react-navigation/native": "*",
  "@react-navigation/native-stack": "*",
  "nativewind": "^4",
  "zustand": "^4",
  "react-hook-form": "^7",
  "zod": "^3"
}
```

### 8.2 네이티브 모듈
- `MoeumOCR.swift` — `VNRecognizeTextRequest` 래퍼
- `MoeumWidget.swift` (WidgetKit Extension) — TimelineProvider + View, **< 30MB 메모리** (NFR-009)

### 8.3 SQLite 스키마
```sql
CREATE TABLE quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  body TEXT NOT NULL,
  author TEXT,
  source TEXT,
  original_image_path TEXT,  -- ★ v1.1: 원본 이미지 옵션 (FR-002)
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_quotes_created_at ON quotes(created_at DESC);
```

### 8.4 위젯 스냅샷 (변경 없음)
```ts
type WidgetSnapshot = {
  version: 1;
  generated_at: number; // ★ stale 검사용
  items: Array<{ id: number; body: string; author?: string; source?: string; }>;
};
```

### 8.5 폰트 번들 전략 (★ v1.1 신규)
- **앱 본체**: Pretendard Variable (모든 굵기)
- **위젯 Extension**: Pretendard Regular + Bold **서브셋** (한글 KS X 1001 완성형 2350자만)
- 빌드 스크립트로 `pyftsubset` 사용해 빌드 타임 서브셋팅 → 폰트 용량 ~600KB → ~150KB

---

## 9. Self-Score v1.1 (100점)

### AI-Specific Optimization (25 / 25)
- 시퀀셜 페이즈 + 우선순위 + 명확 경계 + SMART — 25/25

### Traditional PRD Core (25 / 25)
- 문제·목표·페르소나·Non-Goals·요약 — 25/25

### Implementation Clarity (30 / 30) ★ +2
- 의존성·페이즈·스키마·리스크 완비 — 30/30
- ★ v1.1: 폰트 서브셋팅 빌드 스크립트, 위젯 메모리 측정 게이트, OCR/타이핑 시간 비교 측정 추가

### Completeness (19 / 20) ★ +1
- NFR 10개, 가설 검증 계획, 적대적 리뷰 결과 명시 — 19/20
- 감점 1: 마케팅/출시 후 운영 계획 의도적 제외 (개인 사용 목표)

**총점: 99 / 100** 🎯 (v1.0 96 → v1.1 99)

---

## 10. 다음 행동 (Action Items)

1. ✅ Apple Developer Program 가입 ($99/년)
2. ✅ Bundle ID: `com.haenara.moeum`
3. ✅ Pretendard Variable OFL 라이선스 확인 + **서브셋팅 스크립트** 작성
4. ~~시드 데이터 수집~~ → ★ v1.2 제거 (사용자 입력 전용)
5. ✅ Expo 프로젝트 초기화 + Git (W1 완료)
6. 온보딩 UX 설계: 빈 상태 → 첫 문장 추가까지의 흐름 (앱스토어 4.2 방어선)
7. **H2 측정 도구**: OCR vs 타이핑 시간 비교용 노션 표 또는 간단 스크립트
8. W2 UI 작업 시작

---

## 11. Adversarial Review 결과 매핑 (Audit Trail)

| Adversarial 지적 | 모델 | PRD 반영 위치 |
|---|---|---|
| H1 가설 미검증 (재노출 = 시각적 소음) | Gemini | §2.3 H1, R10, G3 |
| H2 OCR 보정 ≥ 카톡 타이핑 (이탈) | Codex+Gemini | §2.3 H2, FR-002 빠른 정리 도구, NFR-010, R11 |
| 위젯 30MB 메모리 → 빈 위젯 | Gemini | FR-004, NFR-009, R9, §8.5 서브셋팅 |
| 원본 이미지 보관 부재 | Gemini | FR-002 옵셔널 보관, §8.3 SQLite 컬럼 |
| 위젯 truncation 정책 부재 | Gemini | FR-004 truncation 정책 |
| 자동 복구 경로 부재 | Codex+Gemini | FR-006 자동 백업 알림 |
| "클라우드 동기화" 모순 | Codex | §3.3 Non-Goals 용어 정리 |
| 즐겨찾기 MVP 모순 | Codex | §3.3 Non-Goals, FR-003 우 스와이프 제거 |
| 알림 권한 변경 시나리오 부재 | Codex | FR-005 권한 변경 감지 |
| 위젯 stale 데이터 시나리오 부재 | Codex | FR-004 stale 방지 fallback |
| "학습용 MVP"+"네이티브 직접" 일정 모순 | Gemini | §1 메타 12주 워스트, §6 W3 학습 강조 |

Adversarial review: applied (providers: Codex 0.125.0 / GPT-5.4, Gemini 0.38.1)

---

## 부록 A. Debate 합의안 참조
`./.debate/20260511_173143_stack/SYNTHESIS.md` — 4-AI 합의 (Opus / Sonnet / Gemini / Codex)
`./.debate/20260511_173143_stack/adversarial_{codex,gemini}.md` — 적대적 리뷰 원문

## 부록 B. 시리즈 정합성
| 시리즈 | 도메인 | 상태 |
|---|---|---|
| 모임 | 부동산 임장 | 운영 중 |
| 모가 | 가계부 | Phase 3 완료 |
| 모여 | 여행 | 2026-05-18 실사용 목표 |
| **모음** | **문장 수집** | **본 PRD v1.1** |

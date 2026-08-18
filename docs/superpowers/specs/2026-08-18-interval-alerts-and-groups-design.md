# 설계 spec — 시간 간격 랜덤 알림 + 비공개 그룹(소셜)

| 메타 | 값 |
|---|---|
| 날짜 | 2026-08-18 |
| 상태 | 설계 승인됨 (대화로 3개 섹션 승인) — 구현 계획 수립 전 |
| 범위 | v0.1.0 출시 범위 확장: ① 시간 간격 랜덤 문장 알림, ② 초대제 비공개 그룹(공유·댓글·♥·푸시) |
| 제외 (v0.2+) | 전체 공개 피드, Universal Link 초대, 소유권 이전, 서버 발송 푸시, Android |
| 선행 문서 | `docs/PRD.md` v1.3, `docs/RELEASE_CHECKLIST.md` |

## 0. 배경과 출시 전략

- 빌드 #15(production, 2026-06-09)까지 완료되었으나 App Store 미제출 상태였음.
- 사용자 결정: **두 기능을 모두 완성한 뒤 v0.1.0으로 최초 출시** (심사 제출은 1회만).
- 공개 피드는 v0.2로 분리하되, 본 설계는 그 확장을 막지 않는 구조로 잡는다.
- 기존 빌드 #15는 폐기되고 최종 검증은 빌드 #16(가칭)으로 진행.

## 1. 기능 A — 시간 간격 랜덤 문장 알림

### 1.1 요구사항
- 수집한 문장을 **1시간 간격(선택: 1·2·3·4시간)** 으로 잠금화면 알림으로 랜덤 노출하는 옵션.
- 기존 "하루 1번" 알림과 **배타적 모드**로 공존 (라디오 선택): `daily` | `interval`.
- **활성 시간대** 설정 (기본 08:00–22:00) — 야간 알림 방지.
- 알림 내용 = 랜덤 문장 본문 (길면 어절 단위 말줄임). 탭하면 해당 문장 상세 화면으로 이동.

### 1.2 iOS 제약과 해법
로컬 알림은 발송 시점에 내용을 계산할 수 없고, 앱당 예약 상한이 64개다. 따라서:

- **배치 사전 예약**: 각 알림 = 절대 시각 DATE 트리거 1건 (내용 개별 지정).
- 하루 발송 횟수 `firesPerDay = floor(활성시간 / 간격) + 1` (예: 08–22시·1시간 = 15회).
- 예약 지평선 `days = min(7, floor(63 / firesPerDay))` (1시간 간격이면 약 4일치 = 60건).
- 마지막 슬롯 +1건은 **재충전 안내** 알림: "앱을 열면 알림이 이어져요" (총 사용 ≤ 64).
- **셔플 큐**: 전체 문장을 섞어 순서대로 소진, 소진 시 재셔플 — 최근 반복 노출 방지. 큐 상태(순서·커서)는 AsyncStorage에 persist.
- **재충전 트리거**: 앱 시작 시 + AppState `active` 복귀 시 + 알림 설정 변경 시. 남은 예약이 하루치 미만이면 전체 취소 후 재예약.
- 식별자 규칙: `moeum-interval-<n>` / 기존 `moeum-daily` — 모드 전환 시 상대 모드 예약 전체 취소.

### 1.3 엣지 케이스
- 문장 0개: 예약하지 않음. 설정 화면에 "문장을 먼저 모아보세요" 캡션.
- 알림 탭 시 해당 문장이 삭제된 경우: 목록 화면으로 폴백.
- 딥링크: 알림 `data.quoteId` → notification response 리스너 → Detail 내비게이션 (navigation ref 사용).

### 1.4 변경 지점
- `src/lib/notifications.ts` — 배치 예약·취소·재충전 로직 추가
- `src/store/notification.ts` — `mode`, `intervalHours`, `activeStartHour`, `activeEndHour` 상태 추가 (기존 persist 유지)
- `src/screens/SettingsScreen.tsx` — 모드 라디오, 간격 선택, 시간대 피커 UI
- `App.tsx` — AppState 리스너(재충전) + 알림 응답 핸들러
- DB·백엔드 변경 없음. **소셜과 독립 — 마일스톤 1로 먼저 구현·검증.**

## 2. 기능 B — 초대제 비공개 그룹 (소셜)

### 2.1 원칙
- **로컬 우선**: 내 컬렉션(SQLite)은 기기에만. 사용자가 **"그룹에 올리기"를 선택한 문장의 복사본만** 서버로 전송. 로컬 스키마 변경 없음(원본-게시물 링크 없음, 중복 올리기 허용).
- **지연 로그인**: 로그인은 "모임" 탭 최초 진입 시에만 요구. 로컬 기능은 비로그인으로 전부 동작.
- **서버리스 운영**: Cloud Functions·자체 서버 없이 클라이언트 + Firestore 보안 규칙만으로 동작 (무료 Spark 플랜, 카드 등록 불필요).

### 2.2 기술 선택과 근거
- **Firebase JS SDK** (`firebase` 패키지, 네이티브 모듈 아님): 이 프로젝트는 네이티브 의존성 추가 시마다 EAS 빌드가 깨진 이력(vision-camera, 위젯)이 있어 네이티브 변경 0인 경로를 택함. Firestore 실시간 리스너(onSnapshot)로 댓글 즉시 반영. 오프라인은 세션 내 메모리 캐시로 충분(피드는 온라인 기능).
  - Firebase 설정은 `src/lib/firebase.ts`의 config 객체(공개 가능 값, 보안은 규칙이 담당) — plist 불필요, 멀티 맥 동기화 단순.
- **인증**: `expo-apple-authentication` (유일한 네이티브 추가, Expo 공식 1st-party — 저위험) → identityToken을 Firebase `OAuthProvider('apple.com')` credential로 교환. `app.json`에 `ios.usesAppleSignIn: true`. Auth persist는 AsyncStorage.
- **푸시**: Expo Push 서비스 (기존 `expo-notifications` 그대로). 새 글·댓글 **작성자의 앱이 그룹 멤버들의 Expo push token으로 직접 HTTPS 발송** (Expo Push API). 초대제 소그룹 전제의 의도적 트레이드오프 — v0.2 공개 피드 도입 시 서버 발송으로 승격.
  - 설정 변경: `withRemoveApsEntitlement` 플러그인 제거(aps-environment 복구) + `eas credentials`로 APNs 키 등록 + `getExpoPushTokenAsync(projectId)`.
- 내비게이션: `@react-navigation/bottom-tabs` 추가 (JS 전용).

### 2.3 Firestore 데이터 모델
```
users/{uid}:                { nickname, createdAt, blockedUids: string[] }
groups/{groupId}:           { name, ownerUid, inviteCode, createdAt }
groups/{g}/members/{uid}:   { nickname, role: 'owner'|'member', joinedAt, expoPushToken? }
groups/{g}/posts/{postId}:  { body, authorUid, authorNickname, createdAt }
groups/{g}/posts/{p}/comments/{cid}: { body, authorUid, authorNickname, createdAt }
groups/{g}/posts/{p}/likes/{uid}:    { createdAt }
inviteCodes/{code}:         { groupId, createdAt }        // 코드 = 대문자·숫자 6자리
reports/{reportId}:         { targetPath, reporterUid, reason, createdAt }
```
- **카운트는 비정규화하지 않음**: ♥·댓글 수는 `getCountFromServer()` 집계 쿼리 사용 (소그룹 규모에서 읽기 쿼터 여유 충분, 규칙 단순화). 병목 시 카운터 도입은 추후.
- 푸시 토큰은 `users`가 아니라 **본인이 속한 각 `members` 문서에 복사** (그룹 멤버끼리만 읽히도록) — 가입 시·토큰 갱신 시 갱신.
- 닉네임 변경 시: `users` + 내가 속한 모든 `members` 문서 갱신 (기존 글의 `authorNickname` 스냅샷은 갱신하지 않음 — 의도된 단순화).

### 2.4 보안 규칙 원칙 (에뮬레이터 테스트 대상)
- 그룹 문서·하위 컬렉션 read/write는 **해당 그룹 members에 본인 문서가 존재할 때만**.
- posts/comments create는 `authorUid == request.auth.uid`. delete는 본인 것 + 그룹 owner.
- **초대 참여**: 가입 시 클라이언트가 member 문서에 `inviteCode` 필드를 담아 create → 규칙이 `uid == request.auth.uid && get(/inviteCodes/$(request.resource.data.inviteCode)).data.groupId == groupId`로 검증 (Functions 없이 규칙 내 문서 참조). `inviteCodes`는 인증 사용자 read 허용.
- 계정 삭제용 collectionGroup 쿼리(comments/likes)는 `authorUid == request.auth.uid` 조건의 read/delete를 collectionGroup 규칙으로 별도 허용 + 색인 등록.
- `users/{uid}`는 본인만 read/write. `reports`는 인증 사용자 create만(수정·조회 불가).
- likes/{uid}는 본인 문서만 create/delete.

### 2.5 화면 구조
- **하단 3탭 재편**: `[내 문장 | 모임 | 설정]` — 기존 스택은 "내 문장" 탭 내부 스택으로 이동, 설정은 헤더 버튼에서 탭으로 승격.
- 모임 탭 신규 화면:
  - `GroupListScreen` — 내 그룹 목록 + [그룹 만들기] [초대 코드로 참여]
  - `GroupCreateScreen` — 이름 입력 → inviteCode 생성
  - `GroupJoinScreen` — 6자리 코드 입력
  - `GroupFeedScreen` — 문장 카드(닉네임·시간·♥·💬), 실시간 갱신, [초대하기]=공유 시트로 "코드+App Store 링크" 텍스트 발송
  - `PostDetailScreen` — 문장 전문 + ♥ + 댓글 목록/입력
  - `ProfileSetupScreen` — 최초 로그인 시 닉네임 설정 + 커뮤니티 규칙 동의
- 기존 `DetailScreen`에 **"그룹에 올리기"** 버튼 → 내 그룹 선택 시트 → 복사 게시.

### 2.6 계정 수명주기
- 로그아웃: 설정 탭. 그룹 데이터는 유지.
- 그룹 나가기: member 삭제. **owner는 나가기 대신 그룹 삭제만 가능** (멤버 존재 시 경고, 소유권 이전은 v0.2). 그룹 삭제 = 클라이언트 배치로 posts(하위 comments/likes 포함)·members·inviteCode 문서까지 정리 후 group 문서 삭제 (Functions가 없으므로 하위 컬렉션 고아 방지를 클라이언트가 책임).
- **계정 삭제** (심사 필수): 재인증(SIWA) → ① 내 posts(하위 comments/likes 문서까지 배치 삭제) ② collectionGroup 쿼리로 타인 글의 내 comments/likes 삭제(색인 필요) ③ 내 members 문서 삭제 ④ users 문서 삭제 ⑤ Auth 계정 삭제.

## 3. 심사·컴플라이언스

- **UGC 안전장치** (Guideline 1.2): 글·댓글 신고(→`reports` + 문의 이메일 후속 안내), 사용자 차단(`blockedUids` — 차단 유저 콘텐츠 클라이언트 필터), owner의 멤버 내보내기·글 삭제, 그룹 나가기, 최초 로그인 시 규칙 동의 1회("본인이 권리를 가진 콘텐츠만, 불쾌 콘텐츠 금지").
- **계정 삭제** in-app (Guideline 5.1.1(v)) — §2.6.
- **privacy.html 개정**: "모든 데이터 기기 내 처리" → 이원화 서술: 내 컬렉션=기기 내 / 그룹에 올린 문장·댓글·닉네임·푸시 토큰=Firebase 서버 저장. 수집 항목·목적·보관·삭제 방법 명시.
- **ASC App Privacy 답변 변경**: "수집 없음" → User Content(문장·댓글), Identifiers(User ID), Contact Info(이메일—인증용) 수집 신고.
- `docs/STORE.md` 설명·키워드 문구 동기화. 심사 노트에 초대제 비공개 그룹 설명 + **심사관용 데모 그룹 초대 코드** 첨부.

## 4. 구현 마일스톤 (각각 독립 검증 가능, 멀티 맥 이어받기 단위)

| M | 내용 | 비고 |
|---|---|---|
| M1 | 간격 알림 (기능 A 전체) | 로컬 전용, dev client 재빌드 불필요 |
| M2 | 3탭 재편 + Firebase 프로젝트/SDK 셋업 + SIWA 로그인 + 닉네임 | `expo-apple-authentication` 추가 → **dev client 재빌드 1회** |
| M3 | 그룹 만들기·초대 코드 참여 + 보안 규칙 v1 + 에뮬레이터 규칙 테스트 | |
| M4 | 피드: 올리기·목록·댓글·♥ (실시간) | |
| M5 | 푸시: entitlement 복구 + APNs 키 + 토큰 저장 + 클라이언트 발송 | **dev client 재빌드** |
| M6 | 안전장치: 신고·차단·계정 삭제·규칙 동의 | |
| M7 | privacy.html·STORE.md 개정 + production 빌드 #16 → TestFlight 2인 실사용 | 그룹 생성→초대→올리기→댓글→푸시 전체 루프 |
| M8 | ASC 메타데이터(STEP 4~7 재활용) + 심사 제출 | |

## 5. 테스트 전략

- 상시: `pnpm lint` (`tsc --noEmit`).
- **Firestore 보안 규칙만 자동 테스트** (Firebase 에뮬레이터 + `@firebase/rules-unit-testing`): 비멤버 읽기 차단, 코드 없는 가입 차단, 타인 글 삭제 차단 등 핵심 케이스. 규칙 구멍 = 데이터 유출이므로 여기만 엄격.
- 기능 검증: TestFlight 2인(본인+아내) 실사용 시나리오.
- 알림: 짧은 간격·좁은 시간대로 축소 설정해 실기기 확인 + 64개 상한 계산 단위 테스트는 순수 함수로 분리해 로직만 검증.

## 6. 리스크와 완화

| 리스크 | 완화 |
|---|---|
| 클라이언트 발송 푸시 남용 가능성 | 초대제 소그룹 전제 명시, v0.2에서 서버 발송 승격. 토큰은 그룹 멤버에게만 노출 |
| 규칙의 `get()` 기반 초대 검증 실수 | M3 에뮬레이터 테스트 필수 게이트 |
| Firestore JS SDK 디스크 오프라인 미지원 | 피드는 온라인 전제. 내 컬렉션은 로컬 SQLite로 이미 오프라인 |
| SIWA/entitlement 변경으로 빌드 이슈 재발 | 네이티브 추가를 M2(SIWA)·M5(push) 두 지점에 격리, 각 지점에서 dev 빌드로 즉시 검증 |
| 심사: UGC 요건 지적 | §3 장치 일괄 구현 + 심사 노트에 데모 초대 코드 |
| 무료 쿼터 초과 (Firestore 일 5만 읽기) | 소그룹 규모에서 여유 큼. 집계 쿼리 남용 지점(피드)만 페이지네이션 |

## 7. 멀티 맥 워크플로

- **repo가 single source of truth**: 진행 상태는 `docs/CONTEXT.md`에 유지(마일스톤 체크), 커밋·push를 작업 단위마다.
- 새 맥 셋업: `git clone` → `pnpm install` → `pnpm exec eas login`. 시뮬레이터 필요 시 Xcode + `pnpm ios`. Firebase는 코드 내 config라 추가 파일 불필요.
- Claude 메모리는 머신 로컬이므로, 새 맥의 첫 세션에는 "docs/CONTEXT.md 읽고 이어서"로 시작.

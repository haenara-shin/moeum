# 설계 spec — 시간 간격 랜덤 알림 + 비공개 그룹(소셜)

| 메타 | 값 |
|---|---|
| 날짜 | 2026-08-18 (v1) → 2026-08-19 (**v2 — Codex 적대적 리뷰 반영**) |
| 상태 | v2 개정 — 사용자 리뷰 대기 |
| 범위 | v0.1.0 출시 범위 확장: ① 시간 간격 랜덤 문장 알림, ② 초대제 비공개 그룹(공유·댓글·♥) |
| 제외 (v0.2+) | **소셜 푸시 알림(서버 발송)**, 전체 공개 피드, Universal Link 초대, 소유권 이전, Android |
| 선행 문서 | `docs/PRD.md` v1.3, `docs/RELEASE_CHECKLIST.md` |

## v2 변경 요약 (Codex GPT-5.4 리뷰 → 사용자 결정 반영)

사용자 결정: **Firebase Spark(무료) 플랜 유지, Cloud Functions 미도입** → 서버 코드 없이 해결 불가능한 항목은 범위 조정으로 해소.

| Codex 지적 | 해소 방식 |
|---|---|
| C1 초대 코드 열거 가능 | `get`만 허용·`list` 금지 + 코드 8자리로 확대 + 트랜잭션 생성/로테이션 (§2.4) |
| C2 그룹/멤버십 관리 규칙 부재 | 전체 규칙 매트릭스 명세 (§2.4a) + `role` 필드 제거, 권한 원천 = `groups.ownerUid` 단일화 |
| C3 삭제 절차 모순 | **톰스톤 삭제**로 전환(캐스케이드 불필요), 탈퇴 후에도 본인 콘텐츠 톰스톤 가능한 규칙 (§2.6) |
| C4 소유자 탈퇴 시 고아 그룹 | 계정 삭제 전 소유 그룹 삭제 강제 (UI+절차, §2.6) |
| C5 푸시 토큰 노출 | **소셜 푸시 v0.2 연기** — 토큰 저장 자체가 없어짐. 새 글은 갱신+배지로 확인 (§2.7) |
| I1 그룹 생성 보안 | 원자적 배치 + `existsAfter`/`getAfter` 규칙 (§2.4a) |
| I2 무제한 클라 삭제 | 톰스톤화로 삭제량 최소화 + bounded/idempotent 정리 절차 (§2.6) |
| I3 크로스 그룹 쿼리/색인 누락 | collectionGroup 쿼리·필드·색인·규칙 일람 (§2.4b) |
| I4 카운트 실시간 모순 | 정합화: 피드 카운트=로드 시점 스냅샷, 상세=완전 실시간 (§2.5) |
| I5 콜드 스타트 딥링크 | `useLastNotificationResponse` + navigationRef + 준비 대기 + 중복 제거 (§1.3) |
| I6 스케줄러 견고성 | 직렬화 스케줄러 + hydration 대기 + 큐 재조정 + 전용 무제한 쿼리 (§1.2) |
| I7 SIWA nonce | nonce(SHA-256) + `initializeAuth(AsyncStorage persistence)` 명시 (§2.2) |
| I8 단일 디바이스 토큰 | 푸시 연기로 소멸. SIWA 멀티 디바이스는 자연 지원 |
| I9 서버측 필드 검증 부재 | 규칙 매트릭스에 필드 화이트리스트·길이·serverTimestamp·불변 필드 명시. `authorNickname` 비정규화 제거 (§2.3) |
| I10 운영 미비 | rulesVersion/acceptedAt, 신고 스냅샷, 대응 루틴 명시 (§3) |
| I11 체크리스트 위험 | RELEASE_CHECKLIST.md 개정을 M6 산출물로 포함 (§4) |
| I12 실기기 빌드 경로 | eas.json에 preview(실기기 internal) 프로필 추가 — M2 (§4) |
| M1~M3 (minor) | 활성 시간대 의미·안내 알림 시점·로그아웃 캐시 정리 명세 (§1.2, §2.6) |

## 0. 배경과 출시 전략

- 빌드 #15(production, 2026-06-09)까지 완료되었으나 App Store 미제출 상태였음.
- 사용자 결정: **두 기능을 모두 완성한 뒤 v0.1.0으로 최초 출시** (심사 제출은 1회만). 기존 빌드 #15는 폐기, 최종 검증은 빌드 #16.
- 공개 피드·소셜 푸시는 v0.2 — 그 시점에 서버(Functions/Blaze) 도입을 재검토한다.

## 1. 기능 A — 시간 간격 랜덤 문장 알림

### 1.1 요구사항
- 수집한 문장을 **1시간 간격(선택: 1·2·3·4시간)** 으로 잠금화면 알림으로 랜덤 노출하는 옵션.
- 기존 "하루 1번" 알림과 **배타적 모드** (라디오): `daily` | `interval`.
- **활성 시간대** (기본 08:00–22:00): 발송 시각은 `start ≤ t ≤ end`의 정각. UI가 `start < end`를 강제(야간 넘김 창은 v0.1 미지원, 동일 값 불가).
- 알림 내용 = 랜덤 문장 본문(어절 단위 말줄임). 탭하면 해당 문장 상세 화면.

### 1.2 스케줄링 설계
로컬 알림은 발송 시점에 내용 계산이 불가하고 앱당 예약 상한이 64개다.

- **배치 사전 예약**: 알림 1건 = 절대 시각 DATE 트리거. 식별자 `moeum-interval-<n>` / 기존 `moeum-daily`. 모드 전환 시 상대 모드 예약 전체 취소.
- `firesPerDay = floor((end-start)/간격) + 1` (08–22시·1h = 15회). 예약 지평선 `days = min(7, floor(63/firesPerDay))`. 마지막 슬롯 다음 **interval 슬롯(활성 시간대 내)** 에 재충전 안내 1건("앱을 열면 알림이 이어져요") — 총 ≤ 64.
- **셔플 큐**: 전체 문장 셔플 → 순서 소진 → 재셔플. 큐(ID 배열+커서)는 AsyncStorage persist.
  - **재조정 규칙**: 재충전 시 삭제된 ID 제거, 신규 ID는 미소진 구간에 셔플 삽입.
- **직렬화 스케줄러** (단일 모듈 `src/lib/intervalScheduler.ts`): 동시 진입 시 single-flight로 병합. 실행 전제 = ① zustand persist hydration 완료(`onFinishHydration` 대기) ② DB ready. 예약 도중 실패 시 잔여 중단(다음 재충전이 복구 — 절차는 멱등).
- **트리거**: 앱 시작 / AppState `active` 복귀 / 알림 설정 변경 / 문장 추가·삭제(5초 디바운스). 남은 예약 < 하루치일 때만 전체 재예약.
- **전용 쿼리**: 스케줄러는 `SELECT id, body FROM quotes` **무제한 쿼리** 사용 (기존 목록 쿼리의 200건 제한과 별개).
- 시간대/DST 변경: 절대 시각은 예약 당시 로컬 기준. 다음 재충전(앱 실행) 때 자동 보정 — 허용 오차로 명시.

### 1.3 딥링크 (콜드 스타트 포함)
- `RootNavigator`가 `createNavigationContainerRef` 기반 **navigationRef + isReady 플래그를 export**하도록 변경.
- 라우팅 서비스: 웜 = response 리스너 / **콜드 = `useLastNotificationResponse`**. `response.notification.request.identifier`로 중복 처리 방지. 내비게이션·DB 준비 완료까지 대기 후 이동.
- `data.quoteId`의 문장이 삭제된 경우 목록 화면 폴백.

### 1.4 변경 지점
`src/lib/notifications.ts`(예약·취소), `src/lib/intervalScheduler.ts`(신규 — 큐·재충전·직렬화, 순수 함수 분리), `src/store/notification.ts`(mode·intervalHours·activeStart/End), `src/screens/SettingsScreen.tsx`(UI), `src/navigation/RootNavigator.tsx`(navigationRef export), `App.tsx`(트리거 연결), `src/db/index.ts`(무제한 스케줄러 쿼리). 백엔드 무관 — **M1로 선행 구현·검증.**

## 2. 기능 B — 초대제 비공개 그룹 (소셜, 서버리스)

### 2.1 원칙
- **로컬 우선**: 내 컬렉션(SQLite)은 기기에만. "그룹에 올리기"를 선택한 문장의 복사본만 서버로. 로컬 스키마 변경 없음.
- **지연 로그인**: 소셜 기능 첫 사용 시(모임 탭 진입 **또는** "그룹에 올리기" 탭)에만 SIWA 요구 — 미로그인 상태에서 올리기를 누르면 로그인 화면으로 안내.
- **서버리스**: Cloud Functions·자체 서버 없음 (Spark 플랜, 카드 미등록 — 사용자 결정). 이 제약이 강제하는 트레이드오프는 본 문서에 명시하고 privacy 문서에도 반영.

### 2.2 기술 선택
- **Firebase JS SDK** (`firebase` — 네이티브 아님): 네이티브 의존성 최소화 원칙(과거 빌드 실패 이력). 설정은 `src/lib/firebase.ts`의 config 객체(공개 가능 값).
- **Auth**: `expo-apple-authentication` + `expo-crypto` (둘 다 Expo SDK 1st-party, M2 재빌드에 격리).
  - **nonce 필수**: 요청마다 `expo-crypto` 난수 nonce 생성 → SHA-256 해시를 Apple 요청에, 원본 nonce를 `OAuthProvider('apple.com')` credential에 전달 (재인증 포함 매번 새 nonce).
  - `initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })` 명시.
  - `app.json` `ios.usesAppleSignIn: true`.
- **소셜 푸시 없음(v0.1)**: `withRemoveApsEntitlement` 플러그인 유지(로컬 알림 전용 그대로). 새 글 인지는 §2.7.
- 내비게이션: `@react-navigation/bottom-tabs` (JS 전용).

### 2.3 Firestore 데이터 모델
```
users/{uid}:              { nickname, createdAt, blockedUids: string[], rulesVersion, rulesAcceptedAt }
groups/{groupId}:         { name, ownerUid, inviteCode, createdAt }
groups/{g}/members/{uid}: { uid, nickname, inviteCode, joinedAt, lastSeenAt }   // uid 필드 = collectionGroup 쿼리용
groups/{g}/posts/{p}:     { body, authorUid, deleted: bool, createdAt }
groups/{g}/posts/{p}/comments/{c}: { body, authorUid, createdAt }
groups/{g}/posts/{p}/likes/{uid}:  { uid, createdAt }
inviteCodes/{code}:       { groupId, createdAt }          // 코드 = 대문자·숫자 8자리
reports/{r}:              { targetPath, contentSnapshot, reporterUid, reason, createdAt }
```
- **닉네임 비정규화 제거**: posts/comments에 `authorNickname` 없음(스푸핑·전파 문제 원천 제거). UI는 구독 중인 members 맵에서 해석, 탈퇴 멤버는 "(나간 멤버)" 표시. 닉네임 변경 = `users` + 내 member 문서들 갱신(§2.4b 쿼리).
- `role` 필드 없음 — **권한의 유일한 원천은 `groups.ownerUid`**.
- **카운트 필드 없음**: §2.5 정책 참조.
- 콘텐츠 한도(규칙+UI 이중 강제): group name 1–30자, nickname 1–20자, post body 1–2000자(로컬 zod와 동일), comment 1–500자, report reason ≤200자, contentSnapshot ≤2000자. 사용자당 그룹 ≤20·그룹당 멤버 ≤50은 **규칙로 강제 불가(집계 불가) → UI·운영 제한**으로 명시.

### 2.4 보안 규칙
#### 2.4a 규칙 매트릭스 (M3에서 이 표 그대로 에뮬레이터 테스트)
공통: 모든 create의 `createdAt`(및 joinedAt)은 `request.time`(serverTimestamp)과 일치. 명시된 필드 외 추가 필드 금지(exact keys). `isMember(g)` = `exists(/groups/$(g)/members/$(auth.uid))`.

| 경로 | 작업 | 허용 조건 |
|---|---|---|
| users/{uid} | get/create/update | `uid == auth.uid` (list·delete 불가, 필드: §2.3 화이트리스트) |
| groups/{g} | get | `isMember(g)` |
| groups/{g} | create | `ownerUid == auth.uid` + 필드 검증 + **동일 배치에** `existsAfter(members/$(auth.uid))` ∧ `getAfter(inviteCodes/$(code)).groupId == g` |
| groups/{g} | update | owner만, 변경 가능 필드 = `name` 또는 `inviteCode`(로테이션 배치 한정: `getAfter(새 code)==g`). `ownerUid`·`createdAt` 불변 |
| groups/{g} | delete | owner만, **멤버가 본인뿐일 때만**(§2.6 절차의 마지막 단계) |
| members/{uid} | get/list | `isMember(g)` 또는 `uid == auth.uid` |
| members/{uid} | create | `uid == auth.uid == 문서ID` ∧ `get(/inviteCodes/$(request.resource.data.inviteCode)).groupId == g` ∧ 필드 검증. (그룹 생성 배치의 owner 자신 생성은 위 group.create 조건으로 허용) |
| members/{uid} | update | `uid == auth.uid`, 변경 가능 필드 = `nickname`, `lastSeenAt`만 |
| members/{uid} | delete | 본인(나가기 — 단 `uid != ownerUid`) 또는 owner(내보내기). owner 자신은 group 삭제 배치에서만(`!existsAfter(groups/$(g))`) |
| posts/{p} | get/list | `isMember(g)` |
| posts/{p} | create | `isMember(g)` ∧ `authorUid == auth.uid` ∧ `deleted == false` ∧ 필드 검증 |
| posts/{p} | update | **톰스톤 전이만**: `deleted false→true` ∧ `body → ''` (그 외 필드 불변). 허용자 = **author(멤버 여부 무관)** 또는 owner |
| posts/{p} | delete | 불가 (톰스톤으로 대체 — 하위 캐스케이드 문제 원천 제거) |
| comments/{c} | get/list | `isMember(g)` |
| comments/{c} | create | `isMember(g)` ∧ `authorUid == auth.uid` ∧ 필드 검증 |
| comments/{c} | update | 불가 |
| comments/{c} | delete | **author(멤버 여부 무관)** 또는 owner |
| likes/{uid} | get/list | `isMember(g)` |
| likes/{uid} | create/delete | `uid == auth.uid == 문서ID` (create 시 `uid` 필드 = 문서ID) |
| inviteCodes/{code} | **get** | 인증 사용자 (**list 금지** — 열거 차단. 코드 공간 36^8로 무차별 대입 비실용) |
| inviteCodes/{code} | create | `!exists()` ∧ `getAfter(groups/$(groupId)).ownerUid == auth.uid` (그룹 생성/로테이션 배치 내) |
| inviteCodes/{code} | delete | 해당 그룹 owner (로테이션·그룹 삭제 배치) |
| reports/{r} | create | 인증 사용자 ∧ `reporterUid == auth.uid` ∧ 필드 검증 (read/update/delete 전면 불가 — write-only 신고함) |

- "멤버는 그룹 하위에 쓸 수 있다" 같은 **광역 `allow write` 금지** — 위 행 단위 규칙만 존재.
- 그룹 생성 = `{group, members/자신, inviteCodes/코드}` **원자적 배치**. 코드 충돌 시 배치 실패 → 클라가 코드 재생성 후 재시도.
- 코드 로테이션(owner) = `{inviteCodes/구 삭제, group.inviteCode 갱신, inviteCodes/신 생성}` 배치. 유출 시 대응 경로.

#### 2.4b collectionGroup 쿼리·색인 계획
| 용도 | 쿼리 | 필요한 규칙(경로 패턴) | 색인 |
|---|---|---|---|
| 내 그룹 목록 | CG `members` where `uid == me` | `/{path=**}/members/{m}`: read if `resource.data.uid == auth.uid` | members.uid |
| 닉네임 전파 | 위와 동일 → 각 문서 update | 위 read + members.update 규칙 | 〃 |
| 계정 삭제: 내 글 톰스톤 | CG `posts` where `authorUid == me` | `/{path=**}/posts/{p}`: read if `resource.data.authorUid == auth.uid` (update는 톰스톤 규칙) | posts.authorUid |
| 계정 삭제: 내 댓글 삭제 | CG `comments` where `authorUid == me` | 동일 패턴 read/delete if author | comments.authorUid |
| 계정 삭제: 내 ♥ 삭제 | CG `likes` where `uid == me` | 동일 패턴 read/delete if `uid == auth.uid` | likes.uid |

### 2.5 카운트·실시간 정책 (정합화)
- **실시간 보장 범위**: 그룹 피드의 글 목록(onSnapshot), PostDetail의 댓글·♥(onSnapshot).
- **피드 카드의 ♥/💬 숫자는 로드 시점 스냅샷** (`getCountFromServer()` — 글당 2회, 페이지 20건). 당겨서 새로고침으로 갱신. "피드 카운트까지 실시간"은 비목표로 명시.
- 페이지네이션: 피드 20건 단위 커서.

### 2.6 수명주기 (톰스톤 원칙)
- **글 삭제** = 톰스톤(`deleted:true, body:''`) — author(탈퇴 후에도 가능) 또는 owner. UI는 "삭제된 문장"으로 표시하고 댓글 스레드 숨김. 하위 문서 캐스케이드 불필요.
- **댓글 삭제** = 단건 삭제 (author/owner).
- **그룹 나가기**(비소유자): 내 member 문서 삭제. 확인 다이얼로그에 "작성한 글·댓글은 남습니다(글은 내 계정에서 언제든 삭제 처리 가능)" 고지.
- **그룹 삭제**(owner): ① UI가 다른 멤버 존재 시 차단("모든 멤버가 나간 뒤 삭제 가능") ② 내 posts 톰스톤·내 comments/likes 삭제(아래 bounded 절차) ③ `{inviteCode 문서, 내 member 문서, group 문서}` 배치 삭제.
  - **의도적 트레이드오프(서버리스)**: 이미 나간 멤버들의 댓글 등 잔여 하위 문서는 고아로 남되 규칙상 누구도 접근 불가. privacy 문서에 "접근 차단 후 보존, 주기 수동 정리" 명시 + 운영 루틴(월 1회 콘솔 정리, §3).
- **계정 삭제** (심사 필수, Guideline 5.1.1(v)): 진행 UI + 멱등·재개 가능 절차(각 단계는 쿼리 기반이라 재실행 = 잔여분부터):
  1. 소유 그룹 존재 시 그룹 삭제 먼저 강제 (고아 그룹 방지)
  2. CG 쿼리로 내 posts 톰스톤 (배치 ≤500)
  3. CG 쿼리로 내 comments·likes 삭제 (배치 ≤500)
  4. 내 member 문서들 삭제 → users 문서 삭제
  5. **SIWA 재인증(새 nonce)** → Auth `deleteUser`
- **로그아웃**: 모든 리스너 해제 + 소셜 zustand 상태 리셋 + Firestore `terminate()` 후 재초기화(메모리 캐시 폐기 — 기기 내 계정 전환 시 데이터 잔존 방지). 서버 데이터는 유지.

### 2.7 새 글 인지 (푸시 대체, v0.1)
- 모임 탭 진입·포그라운드 복귀 시 그룹별 최신 글 시각과 내 `lastSeenAt`(member 문서, 본인만 갱신) 비교 → 그룹 목록에 "새 글" 배지.
- v0.2에서 서버 발송 푸시 도입 시 이 배지 로직은 유지(푸시는 추가 레이어).

### 2.8 화면 구조
- **하단 3탭**: `[내 문장 | 모임 | 설정]`. 기존 스택은 "내 문장" 탭 내부로, 설정은 탭으로 승격.
- 모임 탭: `GroupListScreen`(내 그룹+배지, 만들기/코드 참여) / `GroupCreateScreen` / `GroupJoinScreen`(8자리 코드) / `GroupFeedScreen`(카드: 닉네임·시간·♥·💬, [초대하기]=공유 시트로 코드+App Store 링크) / `PostDetailScreen`(전문+♥+댓글) / `ProfileSetupScreen`(최초 로그인: 닉네임+커뮤니티 규칙 동의 → `rulesVersion` 기록).
- `DetailScreen`(내 문장)에 "그룹에 올리기" → 그룹 선택 시트 (미로그인 시 로그인 안내).
- 신고(글·댓글 롱프레스)·차단(작성자 메뉴)·차단 해제(설정): 차단 유저 콘텐츠는 클라이언트 필터.

## 3. 심사·컴플라이언스·운영

- **UGC 안전장치**: 신고(신고 시점 `contentSnapshot` 포함 — 원본이 톰스톤돼도 증거 보존), 차단, owner의 멤버 내보내기·글 톰스톤, 나가기, 규칙 동의(`rulesVersion`/`rulesAcceptedAt`).
- **운영 루틴(개발자 1인)**: reports 콘솔 주 1회 확인·**48시간 내 대응 목표**, 긴급 제거 = 콘솔에서 직접 톰스톤 처리, 월 1회 고아 문서 정리. → `docs/CONTEXT.md` 운영 섹션에 체크리스트로 상시 유지.
- **privacy.html 개정**: 이원화(내 컬렉션=기기 내 / 그룹 공유분=Firebase 서버) + 수집 항목(문장·댓글·닉네임·식별자·인증 이메일)·목적·보관("접근 차단 후 잔여 데이터 주기 정리" 포함)·삭제 방법.
- **ASC App Privacy**: User Content(문장·댓글), Identifiers(User ID), Contact Info(이메일—인증용).
- **RELEASE_CHECKLIST.md 개정(M6 산출물)**: 빌드 #16으로 교체, App Privacy 답변 변경, "Sign-in required" 항목 재작성(SIWA라 데모 계정 불가 → 심사 노트에 초대제 설명+**심사관용 데모 그룹 초대 코드**), 연령 등급 재확인, STORE.md 문구 동기화.

## 4. 구현 마일스톤

| M | 내용 | 비고 |
|---|---|---|
| M1 | 간격 알림 전체 (§1) + 슬롯 계산·큐 재조정 **순수 함수 유닛 테스트** | 재빌드 불필요 |
| M2 | 3탭 재편 + Firebase 셋업 + SIWA(nonce)+닉네임 + `expo-apple-authentication`·`expo-crypto` + **eas.json preview(실기기 internal) 프로필 추가** | dev client 재빌드 1회 |
| M3 | 그룹 생성(배치)·코드 참여·로테이션 + **§2.4 규칙 매트릭스 전체 구현 + 에뮬레이터 테스트**(비멤버 접근·코드 열거(list)·권한 상승·필드 위조·톰스톤 전이 위반·oversize 케이스) | 규칙 통과가 M3 완료 게이트 |
| M4 | 피드·올리기·댓글·♥ (카운트 정책 §2.5) + 새 글 배지 (§2.7) | |
| M5 | 신고·차단·톰스톤 삭제·그룹 삭제·계정 삭제(§2.6) + 로그아웃 정리 | |
| M6 | privacy.html·STORE.md·**RELEASE_CHECKLIST.md** 개정 + production **빌드 #16** + TestFlight 2인 실사용(생성→초대→올리기→댓글→차단/신고→계정삭제 리허설) | |
| M7 | ASC 메타데이터 + 심사 제출 | |

v0.2 백로그: 서버 발송 푸시(+Blaze/Functions 재검토), 공개 피드, 소유권 이전, Universal Link, 초대 코드 만료.

## 5. 테스트 전략

- 상시 `pnpm lint`(tsc). M1: 순수 함수(슬롯 날짜·식별자·큐 재조정·64 한도) 유닛 테스트.
- **M3 게이트**: `@firebase/rules-unit-testing` + 에뮬레이터로 §2.4a 매트릭스의 행별 허용/거부 + §2.4b 쿼리 케이스 자동화.
- 콜드 스타트 딥링크: 실기기에서 앱 종료 상태 알림 탭 시나리오 수동 검증(M1·M6).
- TestFlight 2인 실사용(M6). 알림은 짧은 간격·좁은 시간대로 축소 설정해 검증.

## 6. 리스크와 완화

| 리스크 | 완화 |
|---|---|
| 소셜 푸시 부재로 대화 체감 저하 | 새 글 배지(§2.7) + v0.2 푸시 로드맵 명시. 초대제 소그룹(가족·친구)이라 세션 빈도 높음 |
| 규칙 매트릭스 구현 실수 | M3 에뮬레이터 테스트를 완료 게이트로 강제 |
| 고아 하위 문서 잔존(서버리스 삭제 한계) | 규칙상 접근 불가 + privacy 고지 + 월 1회 수동 정리 루틴 |
| 코드 로테이션 미인지(유출 방치) | 그룹 설정에 "초대 코드 재발급" 노출 + 도움말 |
| Firestore JS SDK 디스크 오프라인 미지원 | 피드는 온라인 전제. 내 컬렉션은 로컬 SQLite |
| SIWA/네이티브 추가로 빌드 이슈 재발 | 네이티브 변경을 M2 한 지점에 격리, preview 실기기 빌드로 즉시 검증 |
| 무료 쿼터(일 읽기 5만) | 소그룹 규모 여유 + 피드 페이지네이션 + 카운트 쿼리 상한(20건/페이지) |

## 7. 멀티 맥 워크플로

- repo가 single source of truth: 진행 상태 `docs/CONTEXT.md`, 마일스톤 단위 커밋·push.
- 새 맥 셋업: `git clone` → `pnpm install` → `pnpm exec eas login` (+시뮬레이터는 Xcode). Firebase는 코드 내 config라 추가 파일 불필요.
- 새 맥 첫 세션: "docs/CONTEXT.md 읽고 이어서"로 시작.

---
Adversarial review: applied — Codex GPT-5.4 (2026-08-19, session 01a01386-6213-73b2-b850-18b66ed33257). Critical 5/5, Important 12/12, Minor 3/3 반영 (I8은 푸시 연기로 소멸).

# 설계 spec — 시간 간격 랜덤 알림 + 비공개 그룹(소셜)

| 메타 | 값 |
|---|---|
| 날짜 | 2026-08-18 (v1) → 2026-08-19 (**v3.1 — 최종**) |
| 상태 | 확정 — Codex 3차 리뷰 잔여 1건 반영 완료, 구현 단계 진입 |
| 범위 | v0.1.0 출시 범위 확장: ① 시간 간격 랜덤 문장 알림, ② 초대제 비공개 그룹(공유·댓글·♥) |
| 제외 (v0.2+) | 소셜 푸시(서버 발송), 전체 공개 피드, Universal Link 초대, 소유권 이전, Android |
| 선행 문서 | `docs/PRD.md` v1.3, `docs/RELEASE_CHECKLIST.md` |

## 개정 이력

- **v2** (Codex 1차 리뷰 반영): 서버리스 유지 결정(Spark, Functions 없음 — 사용자 결정) → 소셜 푸시 v0.2 연기, 톰스톤 삭제, 규칙 매트릭스·CG 색인 계획, 초대 코드 get-only·8자리, SIWA nonce, 콜드 스타트 딥링크, 카운트 정책 정합화 등 17건.
- **v3** (Codex 2차 리뷰 반영 — Blocker 3·Major 7·Minor 3 전면 반영):

| 2차 지적 | 해소 방식 |
|---|---|
| B1 그룹 생성 배치가 규칙 통과 불가 | members.create에 **owner 부트스트랩 분기**(`getAfter`) 별도 정의 (§2.4a) |
| B2 users 삭제 자기모순 | users.delete 본인 허용으로 매트릭스 수정 (§2.4a) |
| B3 "멤버가 본인뿐" 규칙 강제 불가 | **완화된 불변식**: 규칙은 owner만 검사, 잔여 멤버 접근은 `isActiveMember`(그룹 문서 존재) 게이트로 즉시 차단 (§2.4a·§2.6) |
| M1 톰스톤 하위 콘텐츠 노출 | comments/likes의 read·create에 부모 post `!deleted` 게이트 (§2.4a) |
| M2 고아 데이터 접근 서술 모순 | "작성자 본인 예외" 명시로 정정 — privacy 문구 포함 (§2.6·§3) |
| M3 정리 절차 비멱등 | 계정 삭제 쿼리에 `deleted == false` 필터 + 복합 색인 + limit 500 루프 페이지네이션 (§2.4b·§2.6) |
| M4 재충전 임계값이 필수 무효화 억제 | **정합성 트리거 vs 보충 트리거** 이원화, 0개 전환 시 전체 취소 (§1.2) |
| M5 알림 ID 재사용 vs 중복 제거 충돌 | 식별자에 **세대(generation)** 포함 + scheduledIds 추적 취소 (§1.2·§1.3) |
| M6 UI 한도 우회(쿼터 남용) | **명시적 수용 리스크**로 등재 + 콘솔 차단·사용량 알림·운영 루틴 완화 (§6) |
| M7 파괴적 정리 후 재인증 | 재인증을 **절차 선두**로 이동 + 만료 시 재인증 재시도, 전 단계 멱등 (§2.6) |
| m1 배지 전이 미정의 | `lastSeenAt` 초기화·갱신 시점 정의 (§2.7) |
| m2 문장 0개 동작 누락 | v1 동작 복원 + 정합성 트리거 연결 (§1.2) |
| m3 preview 프로필 중복 지시 | 기존 `eas.json` preview(실기기 internal) 프로필 사용으로 정정 (§4) |

- **v3.1** (Codex 3차 최종 판정의 잔여 Major 1건 반영): members `get/list`를 `isActiveMember`로 강화 — 그룹 삭제 후 고스트 멤버가 타 멤버 문서(닉네임·lastSeenAt 등)를 조회할 수 없도록 차단. 이로써 3차 리뷰 기준 잔여 이슈 0건.

## 0. 배경과 출시 전략

- 빌드 #15(production, 2026-06-09)까지 완료되었으나 App Store 미제출 상태였음.
- 사용자 결정: **두 기능을 모두 완성한 뒤 v0.1.0으로 최초 출시** (심사 제출 1회). 기존 빌드 #15 폐기, 최종 검증은 빌드 #16.
- 공개 피드·소셜 푸시는 v0.2 — 그 시점에 서버(Functions/Blaze) 도입 재검토.

## 1. 기능 A — 시간 간격 랜덤 문장 알림

### 1.1 요구사항
- 수집한 문장을 **1시간 간격(선택: 1·2·3·4시간)** 으로 잠금화면 알림으로 랜덤 노출하는 옵션.
- 기존 "하루 1번" 알림과 **배타적 모드** (라디오): `daily` | `interval`.
- **활성 시간대** (기본 08:00–22:00): 발송 시각은 `start ≤ t ≤ end`(양끝 포함)의 정각. UI가 `start < end` 강제(야간 넘김·동일 값 불가, v0.1).
- 알림 내용 = 랜덤 문장 본문(어절 단위 말줄임). 탭하면 해당 문장 상세 화면.
- **문장 0개면 interval 예약을 전부 취소하고 신규 예약 없음**. 설정 화면에 "문장을 먼저 모아보세요" 캡션.

### 1.2 스케줄링 설계
로컬 알림은 발송 시점에 내용 계산이 불가하고 앱당 예약 상한이 64개다.

- **배치 사전 예약**: 알림 1건 = 절대 시각 DATE 트리거.
- **식별자에 세대 포함**: `moeum-interval-g<gen>-<n>` (`gen` = AsyncStorage에 persist되는 단조 증가 카운터, 전체 재예약마다 +1). 예약한 식별자 목록(`scheduledIds`)도 persist → 취소는 이 목록 기반 개별 취소(`moeum-daily` 등 타 알림 불간섭).
- `firesPerDay = floor((end-start)/간격) + 1` (08–22시·1h = 15회). 지평선 `days = min(7, floor(63/firesPerDay))`. 마지막 문장 알림 다음 interval 슬롯(활성 시간대 내)에 재충전 안내 1건("앱을 열면 알림이 이어져요") — 총 ≤ 64.
- **셔플 큐**: 전체 문장 셔플 → 순서 소진 → 재셔플. 큐(ID 배열+커서)는 AsyncStorage persist. 재조정: 삭제된 ID 제거, 신규 ID는 미소진 구간에 셔플 삽입. **커서는 예약 성공분만큼만 전진**(부분 실패 시 성공 지점까지 커밋 — 다음 재충전이 잔여분부터 이어감).
- **직렬화 스케줄러** (`src/lib/intervalScheduler.ts`): single-flight(동시 진입 병합). 실행 전제 = zustand persist hydration(`onFinishHydration`) + DB ready.
- **트리거 이원화**:
  - **정합성 트리거 — 무조건 전체 취소+재예약(세대 +1)**: 모드 전환, 간격·활성 시간대 변경, 문장 삭제·**수정**(5초 디바운스 — 수정은 예약된 알림 본문의 스테일 방지, M1 최종 리뷰 반영), 문장 0개 전환(취소만).
  - **보충 트리거 — 남은 예약 < 하루치일 때만**: 앱 시작, AppState `active` 복귀, 문장 추가(5초 디바운스).
- **전용 쿼리**: `SELECT id, body FROM quotes` **무제한**(기존 목록 쿼리 200건 제한과 별개).
- 시간대/DST 변경: 절대 시각은 예약 당시 로컬 기준, 다음 재충전에서 자동 보정(허용 오차로 명시).

### 1.3 딥링크 (콜드 스타트 포함)
- `RootNavigator`가 `createNavigationContainerRef` 기반 **navigationRef + isReady** export.
- 라우팅: 웜 = response 리스너 / 콜드 = `useLastNotificationResponse`. **중복 처리 방지 = 처리한 response의 식별자 기록** — 식별자에 세대가 포함되므로(§1.2) 재사용 충돌 없음.
- `data.quoteId` 문장이 삭제된 경우 목록 화면 폴백.

### 1.4 변경 지점
`src/lib/notifications.ts`(예약·취소), `src/lib/intervalScheduler.ts`(신규 — 세대·큐·트리거·직렬화, 순수 함수 분리), `src/store/notification.ts`(mode·intervalHours·activeStart/End), `src/screens/SettingsScreen.tsx`(UI), `src/navigation/RootNavigator.tsx`(navigationRef), `App.tsx`(트리거 연결), `src/db/index.ts`(무제한 쿼리). 백엔드 무관 — **M1 선행 구현·검증.**

## 2. 기능 B — 초대제 비공개 그룹 (소셜, 서버리스)

### 2.1 원칙
- **로컬 우선**: 내 컬렉션(SQLite)은 기기에만. "그룹에 올리기" 선택분의 복사본만 서버로. 로컬 스키마 변경 없음.
- **지연 로그인**: 소셜 기능 첫 사용 시(모임 탭 진입 또는 "그룹에 올리기" 탭)에만 SIWA. 미로그인 올리기는 로그인 화면 안내.
- **서버리스**: Functions·자체 서버 없음(Spark, 카드 미등록 — 사용자 결정). 제약이 강제하는 트레이드오프는 본 문서와 privacy 문서에 명시.

### 2.2 기술 선택
- **Firebase JS SDK** (`firebase`): 네이티브 의존성 최소화 원칙. 설정은 `src/lib/firebase.ts` config 객체.
- **Auth**: `expo-apple-authentication` + `expo-crypto` (Expo 1st-party, M2 재빌드에 격리). **매 로그인·재인증마다 새 nonce**(원본→credential, SHA-256 해시→Apple 요청). `initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })`. `app.json` `ios.usesAppleSignIn: true`.
- **소셜 푸시 없음(v0.1)**: `withRemoveApsEntitlement` 유지. 새 글 인지는 §2.7.
- 내비게이션: `@react-navigation/bottom-tabs` (JS 전용).

### 2.3 Firestore 데이터 모델
```
users/{uid}:              { nickname, createdAt, blockedUids: string[], rulesVersion, rulesAcceptedAt }
groups/{groupId}:         { name, ownerUid, inviteCode, createdAt }
groups/{g}/members/{uid}: { uid, nickname, inviteCode, joinedAt, lastSeenAt }
groups/{g}/posts/{p}:     { body, authorUid, deleted: bool, createdAt }
groups/{g}/posts/{p}/comments/{c}: { body, authorUid, createdAt }
groups/{g}/posts/{p}/likes/{uid}:  { uid, createdAt }
inviteCodes/{code}:       { groupId, createdAt }          // 대문자·숫자 8자리
reports/{r}:              { targetPath, contentSnapshot, reporterUid, reason, createdAt }
```
- 닉네임 비정규화 없음(UI가 members 맵에서 해석, 탈퇴자는 "(나간 멤버)"). `role` 없음 — 권한 원천은 `groups.ownerUid`. 카운트 필드 없음(§2.5).
- 한도(규칙+UI): group name 1–30, nickname 1–20, post body 1–2000, comment 1–500, reason ≤200, contentSnapshot ≤2000. **사용자당 그룹 ≤20·그룹당 멤버 ≤50은 UI 한도** — 규칙 강제 불가함을 §6에서 수용 리스크로 등재.

### 2.4 보안 규칙
#### 2.4a 규칙 매트릭스 (M3에서 이 표 그대로 에뮬레이터 테스트)
공통 정의·원칙:
- `isMember(g)` = `exists(/groups/$(g)/members/$(auth.uid))`
- `isActiveMember(g)` = `exists(/groups/$(g))` **∧** `isMember(g)` — 그룹 문서가 삭제되면 모든 콘텐츠 접근이 즉시 차단됨
- `isOwner(g)` = `get(/groups/$(g)).data.ownerUid == auth.uid`
- 모든 create의 `createdAt`(joinedAt 포함)은 `request.time`. 명시 필드 외 금지(exact keys). 광역 `allow write` 금지.
- 배치 내 선행 상태 검증은 `getAfter`/`existsAfter` 사용(같은 배치에서 만들어지는 문서는 `get`으로 검증 불가).

| 경로 | 작업 | 허용 조건 |
|---|---|---|
| users/{uid} | get | `uid == auth.uid` (list 불가) |
| users/{uid} | create | `uid == auth.uid` + 필드 검증 |
| users/{uid} | update | `uid == auth.uid`, 변경 가능 = `nickname`·`blockedUids`·`rulesVersion`·`rulesAcceptedAt` (`createdAt` 불변) |
| users/{uid} | delete | `uid == auth.uid` (계정 삭제 절차 4단계) |
| groups/{g} | get | `isMember(g)` |
| groups/{g} | create | `ownerUid == auth.uid` + 필드 검증 ∧ `existsAfter(members/$(auth.uid))` ∧ `getAfter(/inviteCodes/$(code)).data.groupId == g` |
| groups/{g} | update | owner만. 변경 가능 = `name`, 또는 `inviteCode`(로테이션 배치: `getAfter(신코드).groupId == g`). `ownerUid`·`createdAt` 불변 |
| groups/{g} | delete | `isOwner(g)` — **"멤버가 본인뿐" 확인은 UI 권고(완화된 불변식)**. 삭제 즉시 잔여 멤버 접근은 `isActiveMember` 게이트로 차단 |
| members/{uid} | get/list | `isActiveMember(g)` 또는 `resource.data.uid == auth.uid` — 그룹 삭제 후 고스트 멤버는 본인 문서만 조회 가능 |
| members/{uid} | create | `uid == auth.uid == 문서ID` + 필드 검증 ∧ 다음 중 하나: ① **초대 참여**: `get(/inviteCodes/$(request.resource.data.inviteCode)).data.groupId == g` (기존 그룹 — 코드 문서 선존재) ② **owner 부트스트랩**: `!exists(/groups/$(g))` ∧ `getAfter(/groups/$(g)).data.ownerUid == auth.uid` (그룹 생성 배치) |
| members/{uid} | update | `uid == auth.uid`, 변경 가능 = `nickname`·`lastSeenAt` |
| members/{uid} | delete | ① 본인: `uid == auth.uid` ∧ (`!exists(/groups/$(g))`〈고스트 정리〉 ∨ `!isOwner(g)`〈나가기〉 ∨ `!existsAfter(/groups/$(g))`〈그룹 삭제 배치〉) ② 내보내기: `isOwner(g)` |
| posts/{p} | get/list | `isActiveMember(g)` |
| posts/{p} | create | `isActiveMember(g)` ∧ `authorUid == auth.uid` ∧ `deleted == false` + 필드 검증 |
| posts/{p} | update | **톰스톤 전이만**(`deleted false→true` ∧ `body→''`, 그 외 불변): author(멤버·그룹 존속 여부 무관) 또는 owner |
| posts/{p} | delete | 불가 |
| comments/{c} | get/list | `isActiveMember(g)` ∧ **부모 post `deleted == false`** |
| comments/{c} | create | `isActiveMember(g)` ∧ `authorUid == auth.uid` ∧ **부모 post `deleted == false`** + 필드 검증 |
| comments/{c} | update | 불가 |
| comments/{c} | delete | author(멤버·그룹 존속 여부 무관) 또는 owner |
| likes/{uid} | get/list | `isActiveMember(g)` ∧ 부모 post `deleted == false` |
| likes/{uid} | create/delete | `uid == auth.uid == 문서ID` ∧ (create 시) 부모 post `deleted == false` |
| inviteCodes/{code} | get | 인증 사용자 (**list 금지** — 열거 차단, 코드 공간 36^8) |
| inviteCodes/{code} | create | `!exists()` ∧ `getAfter(/groups/$(groupId)).data.ownerUid == auth.uid` (생성·로테이션 배치 공통) |
| inviteCodes/{code} | delete | 해당 그룹 owner (로테이션·그룹 삭제 배치) |
| reports/{r} | create | 인증 사용자 ∧ `reporterUid == auth.uid` + 필드 검증 (read/update/delete 전면 불가) |

- **collectionGroup 작성자 규칙(§2.4b)은 부모 post 상태·그룹 존속과 무관하게 본인 콘텐츠의 read/tombstone/delete를 허용** — 본인 콘텐츠 정리권 보장(의도된 예외, §2.6·§3의 잔여 데이터 서술과 일치).
- 그룹 생성 = `{group, members/자신, inviteCodes/코드}` 원자적 배치(코드 충돌 시 배치 실패 → 재생성 재시도). 로테이션 = `{구 코드 삭제, group.inviteCode 갱신, 신 코드 생성}` 배치.

#### 2.4b collectionGroup 쿼리·규칙·색인
| 용도 | 쿼리 | 규칙(경로 패턴) | 색인 |
|---|---|---|---|
| 내 그룹 목록·닉네임 전파·고스트 정리 | CG `members` where `uid == me` | `/{path=**}/members/{m}`: read if `resource.data.uid == auth.uid` | members.uid |
| 계정 삭제: 내 글 톰스톤 | CG `posts` where `authorUid == me` **∧ `deleted == false`**, limit 500 루프 | `/{path=**}/posts/{p}`: read if author; update = 톰스톤 전이(author) | **posts (authorUid, deleted) 복합** |
| 계정 삭제: 내 댓글 삭제 | CG `comments` where `authorUid == me`, limit 500 루프 | read/delete if author | comments.authorUid |
| 계정 삭제: 내 ♥ 삭제 | CG `likes` where `uid == me`, limit 500 루프 | read/delete if `uid == auth.uid` | likes.uid |

모든 정리 루프는 "쿼리 → ≤500 배치 처리 → 재쿼리"를 빈 결과까지 반복 — 처리된 문서는 필터에서 빠지므로 **재실행 = 잔여분부터(멱등)**.

### 2.5 카운트·실시간 정책
- 실시간: 피드의 글 목록(onSnapshot), PostDetail의 댓글·♥(onSnapshot).
- **피드 카드의 ♥/💬 숫자는 로드 시점 스냅샷**(`getCountFromServer()`, 페이지 20건·당겨서 새로고침). 그룹 목록의 배지용 최신 글 1건 조회(그룹당 limit 1).
- 피드 페이지네이션 20건 커서.

### 2.6 수명주기
- **글 삭제** = 톰스톤(author — 탈퇴·그룹 삭제 후에도 가능 / owner). 톰스톤된 글의 댓글·♥는 규칙 차원에서 읽기·생성 차단(§2.4a) — UI 숨김이 아닌 접근 차단.
- **댓글 삭제** = 단건 삭제(author/owner).
- **그룹 나가기**(비소유자): member 문서 삭제. 확인 다이얼로그에 "작성한 글·댓글은 남습니다(글·댓글은 이후에도 계정에서 삭제 처리 가능)" 고지.
- **그룹 삭제**(owner): UI가 다른 멤버 존재 시 경고·차단(권고) — 규칙은 owner만 검사(완화된 불변식). 절차: ① 내 posts 톰스톤·comments/likes 삭제(§2.4b 루프) ② `{inviteCode, 내 member, group}` 배치 삭제. 그룹 문서가 사라지는 순간 잔여 멤버·콘텐츠 접근은 `isActiveMember` 게이트로 전면 차단. 잔여 멤버의 고스트 멤버십은 각자 클라가 CG 쿼리로 발견해 자체 삭제(고스트 정리 규칙).
  - **잔여 하위 문서(타인 콘텐츠)**: 고아로 서버에 남되 **작성자 본인 외에는 접근 불가** — 작성자는 CG 규칙으로 본인 것을 계속 삭제/톰스톤 가능. privacy 문서에 이 예외 포함 서술 + 월 1회 수동 정리.
- **계정 삭제** (Guideline 5.1.1(v)) — 전 단계 멱등, 진행 UI:
  0. **SIWA 재인증(새 nonce) 먼저** — 파괴적 작업 전 인증 확보
  1. 소유 그룹 존재 시 그룹 삭제 강제(위 절차)
  2. CG 루프: 내 posts(`deleted==false`) 톰스톤
  3. CG 루프: 내 comments·likes 삭제
  4. 내 member 문서들 삭제 → users 문서 삭제
  5. Auth `deleteUser` — recency 만료로 실패 시 **재인증 후 delete만 재시도**(데이터는 이미 정리됨)
- **로그아웃**: 리스너 해제 + 소셜 상태 리셋 + Firestore `terminate()` 후 재초기화(계정 전환 잔존 방지). 서버 데이터 유지.

### 2.7 새 글 인지 (푸시 대체, v0.1)
- `lastSeenAt` 전이: **member 생성 시 = joinedAt으로 초기화**, **GroupFeedScreen 진입·이탈 시 serverTimestamp로 갱신**.
- 배지 = 그룹 최신 글 `createdAt > lastSeenAt` (그룹 목록 로드·포그라운드 복귀 시 그룹당 최신 1건 조회). 피드 진입 즉시 배지 해제.
- v0.2 서버 푸시 도입 후에도 배지 로직 유지.

### 2.8 화면 구조
- **하단 3탭**: `[내 문장 | 모임 | 설정]`. 기존 스택은 "내 문장" 탭 내부로, 설정은 탭 승격.
- 모임 탭: `GroupListScreen`(내 그룹+배지+고스트 정리, 만들기/코드 참여) / `GroupCreateScreen` / `GroupJoinScreen`(8자리) / `GroupFeedScreen`(카드: 닉네임·시간·♥·💬, [초대하기]=공유 시트) / `PostDetailScreen`(전문+♥+댓글) / `ProfileSetupScreen`(닉네임+규칙 동의 → rulesVersion 기록).
- `DetailScreen`에 "그룹에 올리기" → 그룹 선택 시트(미로그인 시 로그인 안내).
- 신고(롱프레스)·차단(작성자 메뉴)·차단 해제(설정): 차단 유저 콘텐츠 클라 필터.

## 3. 심사·컴플라이언스·운영

- **UGC 안전장치**: 신고(`contentSnapshot` 포함 — 톰스톤 후에도 증거 보존), 차단, owner 내보내기·톰스톤, 나가기, 규칙 동의(rulesVersion/rulesAcceptedAt).
- **운영 루틴(1인)**: reports 주 1회·48시간 내 대응, 긴급 제거 = 콘솔 톰스톤, 월 1회 고아 문서 정리, **Firebase 사용량 알림 설정 + 이상 사용 uid는 콘솔에서 Auth 비활성화**. → `docs/CONTEXT.md` 상시 체크리스트.
- **privacy.html 개정**: 이원화(기기 내/서버) + 수집 항목·목적·보관·삭제. 잔여 데이터 서술: "그룹 삭제 후 잔여 콘텐츠는 **작성자 본인 외 접근 불가**하며 작성자는 계속 삭제할 수 있고, 주기적으로 수동 정리됩니다."
- **ASC App Privacy**: User Content(문장·댓글), Identifiers(User ID), Contact Info(이메일—인증용).
- **RELEASE_CHECKLIST.md 개정(M6 산출물)**: 빌드 #16 교체, App Privacy 답변, Sign-in 항목 재작성(심사 노트에 초대제 설명+데모 그룹 초대 코드), 연령 등급 재확인, STORE.md 동기화.

## 4. 구현 마일스톤

| M | 내용 | 비고 |
|---|---|---|
| M1 | 간격 알림 전체 (§1: 세대 식별자·트리거 이원화·0개 처리) + 슬롯·큐·세대 **순수 함수 유닛 테스트** | 재빌드 불필요 |
| M2 | 3탭 재편 + Firebase 셋업 + SIWA(nonce)+닉네임 + `expo-apple-authentication`·`expo-crypto` | dev client 재빌드(시뮬레이터, development 프로필). 실기기 확인은 **기존 preview 프로필**(release·internal) 활용 — 실기기 dev client가 필요해지면 그때 development 실기기 variant 추가 |
| M3 | 그룹 생성 배치·코드 참여·로테이션 + **§2.4 규칙 전체 + 에뮬레이터 테스트**(비멤버·코드 list 열거·owner 부트스트랩·권한 상승·필드 위조·톰스톤 전이·부모 deleted 게이트·oversize) | 규칙 테스트 통과 = M3 게이트 |
| M4 | 피드·올리기·댓글·♥ (§2.5) + 새 글 배지 (§2.7) | |
| M5 | 신고·차단·톰스톤·그룹 삭제·계정 삭제(§2.6, 재인증 선행) + 로그아웃 정리 + 고스트 정리 | |
| M6 | privacy.html·STORE.md·**RELEASE_CHECKLIST.md** 개정 + **빌드 #16** + TestFlight 2인 실사용(생성→초대→올리기→댓글→차단/신고→탈퇴/계정삭제 리허설) | |
| M7 | ASC 메타데이터 + 심사 제출 | |

v0.2 백로그: 서버 푸시(+Blaze/Functions 재검토), 공개 피드, 소유권 이전, Universal Link, 초대 코드 만료, 잔여 데이터 자동 정리.

## 5. 테스트 전략

- 상시 `pnpm lint`(tsc). M1: 순수 함수(슬롯 날짜·64 한도·큐 재조정·세대 전이·트리거 분기) 유닛 테스트.
- **M3 게이트**: `@firebase/rules-unit-testing` + 에뮬레이터로 §2.4a 행별 허용/거부 + §2.4b 쿼리(색인 포함) 자동화. 특히: 코드 `list` 시도 거부, owner 부트스트랩 성공/위조 실패, 톰스톤된 글 댓글 생성 거부, 그룹 문서 삭제 후 콘텐츠 접근 거부, **고스트 멤버의 타 멤버 문서 조회 거부(본인 것만 허용)**, 계정 삭제 루프 멱등성.
- 콜드 스타트 딥링크: 실기기 수동 검증(M1·M6). TestFlight 2인 실사용(M6). 알림은 축소 설정으로 검증.

## 6. 리스크와 완화

| 리스크 | 완화 |
|---|---|
| 소셜 푸시 부재로 대화 체감 저하 | 새 글 배지 + v0.2 푸시 로드맵. 초대제 소그룹이라 세션 빈도 높음 |
| 규칙 매트릭스 구현 실수 | M3 에뮬레이터 테스트 게이트 |
| **[수용된 리스크] 변조 클라이언트의 쿼터 남용** — 그룹/멤버 수 등 UI 한도는 규칙 강제 불가, 인증 사용자가 무제한 생성으로 Spark 쿼터 소진 가능 | 초대제 폐쇄 구조(악용 주체 = 지인 계정)로 노출 최소 + Firebase 사용량 알림 + 콘솔에서 해당 uid Auth 비활성화 + v0.2 서버 도입 시 원천 재설계. **명시적으로 수용하고 출시** |
| 고아 하위 문서 잔존(서버리스 삭제 한계) | 작성자 외 접근 불가(규칙) + privacy 고지(작성자 예외 포함) + 월 1회 수동 정리 |
| 코드 유출 | 로테이션 UI("초대 코드 재발급") + 도움말 |
| Firestore JS SDK 디스크 오프라인 미지원 | 피드는 온라인 전제, 내 컬렉션은 SQLite |
| SIWA/네이티브 추가 빌드 이슈 재발 | M2 한 지점 격리 + preview 실기기 빌드 검증 |
| 무료 쿼터(일 읽기 5만) | 소그룹 여유 + 페이지네이션 + 카운트 쿼리 상한 |

## 7. 멀티 맥 워크플로

- repo가 single source of truth: 진행 상태 `docs/CONTEXT.md`, 마일스톤 단위 커밋·push.
- 새 맥 셋업: `git clone` → `pnpm install` → `pnpm exec eas login` (+시뮬레이터는 Xcode). Firebase는 코드 내 config.
- 새 맥 첫 세션: "docs/CONTEXT.md 읽고 이어서".

---
Adversarial review: applied — Codex GPT-5.4, 3회 (session 01a01386-6213-73b2-b850-18b66ed33257). 1차 17건 → v2 / 2차 13건 → v3 / 3차 최종 판정 잔여 1건(members get/list) → v3.1 반영, 잔여 0건.

# CONTEXT — 세션 이어받기 문서

> 어느 맥에서든 새 Claude 세션은 이 문서부터 읽고 이어서 작업합니다.
> 작업 단위(마일스톤)마다 이 문서를 갱신하고 커밋·push합니다.

## 프로젝트 한 줄

**모두의 마음가짐 (moeum)** — 문장 수집 iOS 앱. RN 0.81 + Expo SDK 54(고정) + pnpm(hoisted) + Dev Client + EAS.

## 현재 위치 (2026-08-18)

- Phase 1 코어 완료, 빌드 #15(production) 성공했으나 **App Store 미제출 → 폐기 예정**.
- 사용자 결정: **v0.1.0 출시 전에 두 기능을 추가**한다 —
  1) 시간 간격 랜덤 문장 알림 (1·2·3·4h, 활성 시간대, 배치 예약)
  2) 초대제 비공개 그룹 (SIWA + Firestore, 공유·댓글·♥·푸시)
- 설계 spec: `docs/superpowers/specs/2026-08-18-interval-alerts-and-groups-design.md` — **v3 (2026-08-19, Codex GPT-5.4 적대적 리뷰 2회 반영)** ← 구현 전 필독
- 핵심 결정 (2026-08-19): **서버리스 유지**(Spark, Functions·카드 등록 없음) → 소셜 푸시는 v0.2 연기(새 글 배지로 대체), 삭제는 톰스톤+isActiveMember 게이트, 보안 규칙 매트릭스(spec §2.4a)가 M3 완료 게이트. 변조 클라이언트 쿼터 남용은 **명시적 수용 리스크**(spec §6).
- spec **v3.1 확정** (Codex 3차 리뷰 통과, 잔여 0건). 구현 계획: `docs/superpowers/plans/2026-08-19-m1-interval-notifications.md` (M1, Task 1~10) — M2~M5 plan은 각 마일스톤 진입 시 spec 기준으로 작성.
- 다음 단계: **M1 실기기 검증(위 체크리스트) → M2 plan 작성·실행** (3탭 + Firebase + SIWA).

## 마일스톤 체크리스트 (spec §4)

- [x] M1 간격 알림 전체 + 순수 함수 유닛 테스트 (재빌드 불필요) — **코드 완료·리뷰 통과 (2026-08-19, `cad2c51`..`e8e8487`)**; 실기기 수동 검증만 대기(아래)

### M1 실기기 수동 검증 (사용자 체크리스트 — plan Task 10 Step 2)

- [ ] 문장 3개+ 저장 → 설정: 알림 on, "시간 간격" 모드, 1시간, 현재 시각 포함 시간대 → 백그라운드 후 다음 정각 랜덤 문장 알림 수신
- [ ] 알림 탭 → 해당 문장 상세로 이동 (앱 완전 종료 상태에서도 = 콜드 스타트)
- [ ] 문장 삭제 후 알림 센터의 이전 알림 탭 → 목록 폴백
- [ ] 문장 전체 삭제 → 설정에 "문장을 먼저 모아보세요" 캡션 + 다음 정각 알림 없음
- [ ] 문장 재추가 → 다음 정각 알림 재개(보충 스케줄)
- [ ] "하루 1번" 모드 전환 → 간격 알림 중지, 매일 알림만
- [ ] M2 3탭 재편 + Firebase(JS SDK) + SIWA(nonce) + 닉네임 + eas preview 프로필 (dev client 재빌드)
- [ ] M3 그룹 생성/참여/로테이션 + 규칙 매트릭스 + 에뮬레이터 테스트 (통과 = 게이트)
- [ ] M4 피드·올리기·댓글·♥ + 새 글 배지
- [ ] M5 신고·차단·톰스톤 삭제·그룹 삭제·계정 삭제 + 로그아웃 정리
- [ ] M6 privacy.html·STORE.md·RELEASE_CHECKLIST.md 개정 + 빌드 #16 + TestFlight 2인 검증
- [ ] M7 ASC 메타데이터 + 심사 제출

## 운영 루틴 (출시 후 상시 — spec §3)

- [ ] 최초 1회: Firebase 콘솔에서 사용량 알림(quota alert) 설정
- [ ] 주 1회: Firebase 콘솔 `reports` 확인, 신고 48시간 내 대응 (긴급 = 콘솔에서 해당 글 톰스톤 처리)
- [ ] 월 1회: 삭제된 그룹의 고아 하위 문서 콘솔 정리
- [ ] 이상 사용량 감지 시: 해당 uid를 콘솔에서 Auth 비활성화 (spec §6 수용 리스크 대응)

## 새 맥 셋업

```bash
git clone git@github.com:haenara-shin/moeum.git && cd moeum
pnpm install
pnpm exec eas login        # Expo 계정
pnpm lint                  # tsc --noEmit
# 시뮬레이터로 돌릴 때만: Xcode 설치 후 pnpm ios
```

- Firebase 설정은 코드 내 config 객체(`src/lib/firebase.ts`, M2에서 생성) — 별도 비밀 파일 없음.
- EAS 빌드는 클라우드라 어느 맥에서든 트리거 가능. production 빌드는 대화형 세션에서 `pnpm exec eas build --platform ios --profile production`.

## 자주 쓰는 값

| 항목 | 값 |
|---|---|
| Bundle ID | `com.haenarashin.moeum` |
| ASC App ID | `6769943864` |
| Apple Team ID | `V5N8C99576` |
| EAS Project ID | `d2d30ae5-a921-4401-9fe0-cbcc08c9c324` |

## 히스토리 요지

- 2026-05-11 PRD·개발 시작 → 05-16 빌드 지옥(번들 ID 교체로 해결) → 05-17 TTS·공유·폴더 확장, 위젯 Phase 1.5 보류(`_phase1_5_targets/`) → 06-09 UI 폴리싱·출시 자산·빌드 #15 → 2개월 휴면 → 08-18 기능 확장 결정(본 문서).
- 환경 교훈: Expo SDK 54 고정(55는 ASC 이슈), pnpm hoisted 필수, 네이티브 의존성 추가는 빌드 리스크 — 최소화 원칙.

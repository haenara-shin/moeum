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
- 설계 승인 완료: `docs/superpowers/specs/2026-08-18-interval-alerts-and-groups-design.md` ← **구현 전 필독**
- 다음 단계: 구현 계획(writing-plans) 작성 → M1부터 구현.

## 마일스톤 체크리스트 (spec §4)

- [ ] M1 간격 알림 (로컬 전용)
- [ ] M2 3탭 재편 + Firebase 셋업 + SIWA + 닉네임 (dev client 재빌드)
- [ ] M3 그룹 CRUD + 초대 코드 + 보안 규칙 + 에뮬레이터 테스트
- [ ] M4 피드 (올리기·댓글·♥)
- [ ] M5 푸시 (entitlement 복구 + APNs 키 + 클라이언트 발송, dev client 재빌드)
- [ ] M6 신고·차단·계정 삭제·규칙 동의
- [ ] M7 privacy.html·STORE.md 개정 + 빌드 #16 + TestFlight 2인 검증
- [ ] M8 ASC 메타데이터 + 심사 제출 (`docs/RELEASE_CHECKLIST.md` STEP 4~7)

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

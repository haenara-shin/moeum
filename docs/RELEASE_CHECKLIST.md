# 모두의 마음가짐 v0.1.0 — 출시 체크리스트

> 순서대로 따라가면 됩니다. 각 항목 ☐ → ✅로 표시.

---

## STEP 0 — 정합성 감사 후속 (2026-06-09 audit 반영)

- [x] **연속 TTS 재생 진입점 복구** — 헤더 ▶︎ 제거로 죽었던 기능을 폴더 칩 줄 우측 ▶︎ 버튼으로 재연결 (`ListScreen.tsx` → `playList(items, 0)`). 사용자 결정: Phase 1 유지.
- [x] `.gitignore`에 `_phase1_5_targets/**` 산출물 규칙 추가 (기존 `targets/**`는 폴더명 불일치로 미적용이었음) — `git check-ignore` exit=0 확인
- [x] `STORE.md` 키워드 표기 정정 (100자 기준, 현재 44자 — 여유 있음)
- [x] `privacy.html` 생성 (repo 루트, 호스팅만 남음 → STEP 3)

## STEP 1 — 코드/에셋 최종 점검

- [ ] `assets/icon.png` 새 아이콘 (보라 배경 + "모") 확인 — `assets/_gen_icon.py` 출력
- [ ] `assets/splash-icon.png` 확인
- [ ] `assets/adaptive-icon.png` 확인
- [ ] `app.json` → `android.adaptiveIcon.backgroundColor` = `#5B4FE5`
- [ ] `app.json` → `version` (0.1.0 유지) 확인
- [ ] `npx tsc --noEmit` 통과 (이미 통과 확인)
- [ ] UI 폴리싱 변경 git status에 다 있는지 확인:
  - `src/screens/ListScreen.tsx` (헤더 단순화, 빈 상태 분기, 검색바, 키보드 dismiss, 다크 카드, **폴더 재생 ▶︎**)
  - `src/screens/NewScreen.tsx` (placeholder 동적)
  - `src/screens/EditScreen.tsx` (placeholder 동적)
  - `src/screens/DetailScreen.tsx` (아이콘 다크 색)
  - `src/screens/SettingsScreen.tsx` (클래스 순서 정리)
- [ ] 실기기에서 **연속 TTS** 동작 확인 (폴더 칩 줄 ▶︎ → 하단 PlayerBar 표시 → ⏮⏸▶︎⏭✕)

## STEP 2 — 빌드 #15 (EAS production)

```bash
# 1) 변경사항 커밋
git add -A
git commit -m "feat(release): v0.1.0 — UI 폴리싱 + 앱 아이콘"

# 2) production 빌드
pnpm exec eas build --platform ios --profile production
```

- [ ] 빌드 큐 성공 (빌드 #15)
- [ ] TestFlight에 자동 처리 확인 (`processing → ready` 5~15분)
- [ ] 실제 기기에서 새 아이콘 + 11개 기능 sanity check

## STEP 3 — 개인정보 처리방침 페이지 호스팅

- [x] `privacy.html` 작성 완료 (repo 루트, 다크모드 대응 + 문의 이메일 포함)
- [ ] GitHub 저장소 Settings → Pages → Source: `main / root`
- [ ] 배포 후 URL 200 확인: `https://haenara-shin.github.io/moeum/privacy.html`
- [ ] 모바일 브라우저에서 한국어 렌더 정상 확인

> ⚠️ **선행 조건**: 이 URL이 뜨려면 repo가 **public**이어야 함 (현재 PRIVATE → 외부 404). 아래 STEP 3.5 참고.
> GitHub Pages 대신 Notion 공개 페이지로도 가능 — URL이 https://면 됨.

## STEP 3.5 — 지원 URL / repo 공개 결정 (심사 Guideline 1.5)

현재 `github.com/haenara-shin/moeum`이 **PRIVATE** → 지원 URL·개인정보 URL 모두 외부 404. 셋 중 하나 선택:

- [ ] (a) repo를 **public 전환** → 지원 URL·privacy.html 모두 해결 (가장 간단). `gh repo edit --visibility public`
- [ ] (b) repo는 private 유지 + **별도 공개 페이지**(Notion 등)에 지원/개인정보 페이지 마련
- [ ] (c) 지원 URL을 다른 공개 URL로 교체
- [ ] 선택 후 `README.md` 갱신 — 현재 stale(PRD v1.2·TTS Phase 2 등 옛 정보). 사용법·문의 이메일·이슈 링크 추가 (STORE.md가 README에 있다고 명시한 내용)

## STEP 4 — App Store Connect 메타데이터 입력

ASC → 앱 → 1.0 Prepare for Submission

### 4-1. 앱 정보 (App Information)
- [ ] 부제 (Subtitle): `좋은 문장을 모으다`
- [ ] 카테고리: 생산성 (Primary) / 도서 (Secondary)
- [ ] 콘텐츠 권한 정보: 본인 콘텐츠 (None / 자체 제작)

### 4-2. 가격 및 사용 가능 여부 (Pricing and Availability)
- [ ] 가격: 무료 (KRW 0)
- [ ] 사용 가능 지역: 전 세계 또는 대한민국만 (1순위는 대한민국만 시작 권장 — 한국어 전용 UX)

### 4-3. 1.0 버전 정보
- [ ] **프로모션 텍스트** — `docs/STORE.md` §3 복붙
- [ ] **설명** — `docs/STORE.md` §4 복붙
- [ ] **키워드** — `docs/STORE.md` §5 복붙
- [ ] **지원 URL** — `https://github.com/haenara-shin/moeum`
- [ ] **마케팅 URL** — (비워두기)
- [ ] **이번 버전 새로운 기능** — `docs/STORE.md` §9 복붙
- [ ] **저작권** — `2026 Haenara Shin`

### 4-4. 스크린샷
- [ ] 6.9" iPhone 슬롯에 5장 업로드 (`docs/SCREENSHOTS.md` 참고)

### 4-5. 빌드 선택
- [ ] "Build" 섹션에서 빌드 #15 선택

### 4-6. App Privacy (개인정보 보호)
- [ ] "Data Types" → "No, we do not collect data from this app"
- [ ] Privacy Policy URL → STEP 3에서 만든 URL 입력
- [ ] 카메라/사진 라이브러리 권한 사유는 Info.plist에 이미 작성됨 (앱 동작 중 OS가 알아서 표시)

### 4-7. 연령 등급 (Age Rating)
- [ ] 4+ — 모든 항목 "None"

### 4-8. 앱 심사 정보 (App Review Information)
- [ ] 연락처 — 본인 이름 / 이메일 / 전화
- [ ] 데모 계정 — **불필요** ("Sign-in required" = No)
- [ ] 노트 — `docs/STORE.md` 부록 B 복붙 (선택사항이지만 권장)

## STEP 5 — 제출 (Submit for Review)

- [ ] 모든 노란 경고 ⚠️ 클리어 (필수 필드 빠짐 없음)
- [ ] "Add for Review" 버튼 클릭
- [ ] 마지막 화면에서 수출 규정 (Encryption) → 비표준 암호화 미사용 응답 (Info.plist `usesNonExemptEncryption: false`로 이미 설정됨)
- [ ] "Submit to App Review" 클릭

## STEP 6 — 심사 대기 / 응답 (1~3일 소요)

- [ ] 심사 결과 이메일 확인
- [ ] **Rejected** 시 흔한 사유 + 대응:
  - "Guideline 2.1 — Insufficient functionality" → 노트에 5단계 사용법 추가
  - "Guideline 5.1.1 — Privacy" → Info.plist 권한 사유 문구 보강
  - "Missing Privacy Policy" → URL 재확인
- [ ] **Approved** → "Release this version" 클릭 (자동 릴리스 설정 시 생략)

## STEP 7 — 출시 후

- [ ] App Store에서 검색 노출 확인 (보통 1~2시간 후)
- [ ] 본인 기기에서 정식 버전 다운로드 & 동작 확인
- [ ] README에 App Store 링크 추가
- [ ] (선택) Phase 1.5 위젯·AI 이미지 작업 시작

---

## 빠른 참조 — 자주 까먹는 것

| 값 | 내용 |
|---|---|
| Bundle ID | `com.haenarashin.moeum` |
| ASC App ID | `6769943864` |
| Apple Team ID | `V5N8C99576` |
| App Group | `group.com.haenarashin.moeum` (Phase 1.5 위젯용) |
| EAS Project ID | `d2d30ae5-a921-4401-9fe0-cbcc08c9c324` |
| Marketing version | `0.1.0` |
| Build number | EAS auto (remote source) |

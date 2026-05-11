# Round 1 — Claude Opus 4.7 Opening Position

## 쟁점 1. RN+Expo가 정말 최선인가?
**결론: 조건부 YES, 단 "Expo Bare Workflow + Custom Dev Client" 필수**
- 사용자가 React/TS 학습 중이라는 점에서 RN의 마찰이 가장 낮음. Flutter는 Dart라는 새 언어 학습이 추가됨.
- 그러나 잠금화면 위젯·OCR·TTS 네이티브 모듈을 다 다루려면 순수 Managed Expo로는 한계. Bare + EAS Build로 가야 함.
- Swift 단독은 위젯 품질 최고이지만 Android 재작성이 사실상 별도 프로젝트가 됨 → 1인 개발자 폭망 시나리오.

## 쟁점 2. ML Kit 한글 vs Apple Vision + ML Kit 분리
**결론: 분리 운영(iOS=Vision, Android=ML Kit)이 더 낫다**
- ML Kit 한글 모델은 존재하지만 iOS에서는 추가 의존성·번들 크기 증가가 있고, Apple Vision은 iOS 16+에서 한글을 무료로 OS 수준 품질로 제공.
- 한글 정확도: 깔끔한 스크린샷 기준 두 엔진 모두 95%+. 단 폰트가 특수한 경우 Vision이 약간 우세.
- RN에서는 `expo-image-text-extractor` 같은 추상 라이브러리가 플랫폼별로 자동 분기해주므로 분리해도 코드 부담 거의 없음.

## 쟁점 3. GPT-4o vision 폴백 필요성
**결론: MVP에서는 제거. Phase 2로 미룬다**
- 깨끗한 스크린샷·인쇄물은 온디바이스 OCR로 충분. 손글씨·심하게 회전된 이미지는 사용자가 직접 편집하게 두는 게 UX상 더 빠름.
- API 비용·키 관리·네트워크 의존성·프롬프트 인젝션 위험 모두 MVP 단계에서는 과한 복잡도.
- 실제 사용 데이터(어떤 이미지가 실패하는지)를 모은 뒤 Phase 2에서 추가가 정답.

## 쟁점 4. TTS 하이브리드 vs 단일
**결론: 단일(expo-speech)로 시작. OpenAI TTS는 명확한 사용자 요청이 있을 때만**
- AVSpeechSynthesizer는 iOS 17+ 한국어 음성이 충분히 자연스럽고 무료·오프라인·지연 0. 명상·낭독 앱이 아닌 이상 차이 미미.
- 하이브리드는 음성 일관성 문제(같은 문장이 다른 목소리로 들림), 캐싱 정책 복잡도, 비용 예측 어려움을 낳음.
- "AI 음성" 기능은 Phase 2의 유료 옵션으로. MVP는 무료 단순화.

## 쟁점 5. MVP 5개 기능 적정성
**결론: 5개 중 1개 축소(TTS를 단건만), 1개 추가(컬렉션 검색·태그)**
- 매일 알림·위젯·OCR 입력·직접 입력·TTS 단건은 OK.
- "전체 컬렉션 TTS 연속 재생"은 사용 빈도 낮고 백그라운드 오디오 세션 설정이 복잡. Phase 2.
- 대신 "태그/검색"은 수집이 늘면 즉시 필수. MVP에 포함해야 사용자 이탈 방지.

## 쟁점 6. 1인 개발자 4~6주 일정
**결론: 비현실적. 8~10주가 정직한 추정**
- RN 첫 프로젝트 + Expo Bare + WidgetKit Swift 작성 + EAS Build 설정 + App Store 심사 = 학습 곡선 누적.
- 학습 비포함 순수 코딩만 따져도 위젯 2 플랫폼 + OCR + TTS + 알림 + DB = 4주는 빠듯, 6주가 정직.
- iOS만 먼저 출시(Android 보류)하면 6주 가능. Android 동시는 8~10주.

## 종합 권고
1. RN + Expo Bare (Android는 Phase 1.5로 분리)
2. OCR 분리: Vision(iOS) + ML Kit(Android), GPT-4o 폴백 제거
3. TTS: expo-speech 단일
4. MVP: 위젯, 알림, OCR, 직접 입력, TTS 단건, **태그/검색**
5. 일정: iOS only 6주 → Android 추가 +3주

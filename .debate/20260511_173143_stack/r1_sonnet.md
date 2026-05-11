# Round 1 — Sonnet 4.6 Opening Position

### 쟁점 1. RN+Expo가 정말 최선인가?
[결론] 이 사용자 컨텍스트에서는 RN+Expo가 최선이다. 다만 위젯 비중이 핵심이라면 Swift 네이티브도 진지하게 재고할 만하다.
[근거] React/TS를 학습 중이라 신규 학습 비용이 가장 낮고, expo-notifications/sqlite/speech 등 필요한 모듈이 모두 안정 단계. Flutter는 Dart라는 새 언어 학습 부담이 크고, Swift 단독은 Android 확장 단계에서 전면 재작성 리스크가 있어 1인 MVP 전략과 충돌.

### 쟁점 2. ML Kit Korean vs Apple Vision 분리 운영
[결론] iOS 우선 출시이므로 Apple Vision을 1순위로 두고, Android 확장 시 ML Kit를 붙이는 분리 운영이 우수하다.
[근거] Apple Vision은 iOS 16+ 한글 인식 품질이 ML Kit보다 일관되게 우수하고 단어 분리/줄바꿈 처리가 깔끔. ML Kit는 한글 인쇄체에선 합격이지만 손글씨/저해상도 스크린샷에서 흔들림. 추상화 레이어 하나만 두면 유지비도 감당 가능.

### 쟁점 3. GPT-4o vision 폴백 필요성
[결론] MVP에는 불필요. v1.1 옵션으로 미루는 게 맞다.
[근거] 온디바이스 OCR이 한글 인쇄체 기준 90%+를 처리하고, 클라우드 폴백은 비용·지연·API 키 관리·개인정보 동의 등 1인 개발자에게 운영 부담이 크다. "수정 UI"를 잘 만드는 게 폴백보다 ROI 높음.

### 쟁점 4. TTS 하이브리드 vs 단일
[결론] MVP는 expo-speech 단일로 출시, OpenAI TTS는 유료 기능으로 v1.1에 도입.
[근거] iOS 시스템 한국어 TTS(유나/지민)는 단문 명언 낭독엔 충분히 자연스럽다. OpenAI TTS는 한국어 운율은 좋으나 비용·네트워크·캐시 전략 필요. 결제 모듈까지 묶이면 MVP가 무너진다.

### 쟁점 5. MVP 5개 기능 적정성
[결론] 5개 중 위젯+OCR+알림+수집 4개로 축소 권장. TTS는 후순위.
[근거] 위젯과 OCR이 차별화 핵심이고 알림은 리텐션 축. TTS는 "있으면 좋음" 영역이며 audio session/백그라운드 재생/잠금화면 컨트롤 등 숨은 작업이 많아 일정 잡아먹는 함정.

### 쟁점 6. 4~6주 일정 현실성
[결론] 5개 전부 4~6주는 비현실적. 4개로 축소 시 6주가 빠듯하게 가능.
[근거] WidgetKit + Expo config plugin은 첫 경험 시 1~2주 단독 소요(App Group, Shared SQLite, 타임라인 갱신 디버깅). OCR 후처리 UI와 한글 줄바꿈 보정도 과소평가됨. 심사 1주 버퍼 포함 시 6주는 "TTS 제외 + 알림 기본형" 전제에서만 성립.

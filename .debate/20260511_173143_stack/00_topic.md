# 토론 주제: 문장/명언 수집 앱 기술 스택 검증

## 앱 핵심 기능
- 문장 수집 (직접 입력 + 이미지/스크린샷 OCR)
- iOS 잠금/홈화면 위젯에 오늘의 문장
- 매일 알림으로 한 문장
- 단건/전체 TTS 재생
- iOS 먼저 → Android 확장
- 한국어 콘텐츠 위주

## 사용자 컨텍스트
- AI 개발자, Python 전문가, React/TS 학습 중
- 신규 학습 최소화
- 1인 개발자, 빠른 MVP

## 1차 계획안
- 프레임워크: React Native + Expo
- OCR: Google ML Kit v2 (한글) + GPT-4o vision 폴백
- TTS 기본: expo-speech / 프리미엄: OpenAI gpt-4o-mini-tts
- 위젯: SwiftUI WidgetKit + Android Glance (Expo config plugin)
- 저장: expo-sqlite, 추후 Supabase
- 알림: expo-notifications

## 6가지 쟁점
1. RN+Expo가 정말 최선인가? (vs Flutter, Swift)
2. ML Kit 한글 정확도, Apple Vision+ML Kit 분리가 낫지 않나?
3. GPT-4o vision 폴백 가치 vs 비용·복잡도
4. TTS 하이브리드 vs 단일 선택
5. MVP 5개 기능 적정성
6. 1인 개발자 4~6주 일정 현실성

## 평가 기준: 균형 (구현 용이성, 확장성, UX 품질 동등 가중)
## 라운드: 3

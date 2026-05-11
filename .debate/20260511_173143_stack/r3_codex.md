### 최종 결정 1: 프레임워크 & 워크플로우
Expo Managed + Dev Client + Config Plugin + EAS Build로 간다. Bare는 피한다.  
핵심 패키지: `expo`, `expo-dev-client`, `expo-notifications`, `expo-speech`, `expo-sqlite`, `expo-file-system`, `react-native-vision-camera`.

### 최종 결정 2: OCR 구현 방식
OCR은 네이티브 모듈 분리 구현. iOS는 Apple Vision, Android는 ML Kit를 Expo Config Plugin으로 연결한다. RN에서는 공통 인터페이스 `recognizeText(imageUri)`만 노출한다.  
OCR 결과는 원문 확정값으로 저장하지 않고, 항상 보정 UI를 거친다. 사용자는 줄 단위 병합/삭제/수정 후 저장한다.

### 최종 결정 3: 위젯 구현 방식
iOS WidgetKit은 Swift로 직접 작성한다. 예상 300~600줄. App Group으로 앱과 위젯이 JSON 스냅샷을 공유한다.  
앱은 SQLite를 원본 저장소로 두고, 위젯용 데이터는 `widget_quotes.json`에 별도 큐잉/동기화한다. 위젯은 DB를 직접 읽지 않는다.

### 최종 결정 4: MVP 기능 최종 리스트 + Phase 2
MVP는 4개만 포함한다: 직접 입력, OCR+보정 UI, iOS 위젯, 매일 알림.  
검색은 MVP에 포함한다. 단, 제목/본문 `LIKE` 기반 단순 검색만 구현한다.  
태그는 MVP에서 제외한다. Phase 2에서 태그, 고급 검색, 필터, OpenAI TTS, Android를 추가한다.

### 최종 결정 5: 일정 권고
일정은 iOS MVP 기준 8주로 잡는다.  
1주차: Expo/EAS/Dev Client 세팅, DB 스키마  
2~3주차: 입력, 목록, 상세, 검색  
4주차: OCR 네이티브 모듈 + 보정 UI  
5주차: 알림, TTS  
6주차: WidgetKit + App Group 동기화  
7주차: 백업/복원, 한글 폰트, QA  
8주차: 심사 대응, TestFlight, 앱스토어 제출

### 핵심 리스크 완화 계획
App Group은 SQLite 공유 금지, JSON 스냅샷만 공유한다.  
한글 폰트는 Noto Sans KR 또는 Pretendard를 앱/위젯에 모두 번들링한다.  
백업/복원은 MVP에 JSON export/import를 포함한다.  
저작권 리스크는 사용자 입력 콘텐츠 앱으로 명확히 포지셔닝하고, 기본 제공 명언 데이터는 넣지 않는다.

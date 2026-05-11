Round 3 토론 결과를 종합하여, 1인 개발자의 성공적인 런칭을 위한 **최종 권고안**을 제시합니다.

### 최종 결정 1: 프레임워크 & 워크플로우
**Expo Managed Workflow + Development Client** 방식을 채택합니다. 네이티브 기능(OCR, 위젯) 확장을 위해 `Config Plugins`와 `EAS Build`를 활용합니다.
- **핵심 패키지:** `react-native-vision-camera`, `expo-speech`, `expo-sqlite`, `expo-notifications`, `react-native-mmkv`(App Group 연동용), `expo-font`.

### 최종 결정 2: OCR 구현 방식
`react-native-vision-camera`의 Frame Processor를 사용합니다. 
- **구현:** iOS는 **Apple Vision Framework**, Android는 **ML Kit**를 각각 네이티브 모듈로 호출하여 성능을 최적화합니다. 
- **보정 UI:** OCR 인식 직후 텍스트 편집 모드로 진입하여 사용자가 즉시 오타를 수정할 수 있는 **'검수 후 저장'** 흐름을 강제합니다.

### 최종 결정 3: 위젯 구현 방식
`expo-config-plugin-ios-widgets` 또는 커스텀 Config Plugin을 통해 **Native Swift** 코드를 주입합니다.
- **데이터 공유:** `App Group` 설정을 통해 메인 앱과 위젯이 공유 저장소(`MMKV` 또는 `UserDefaults`)를 참조합니다.
- **전략:** 위젯은 복잡한 로직 없이 저장된 데이터 중 하나를 무작위로 보여주는 **읽기 전용(Display-only)** 형태로 최소화합니다.

### 최종 결정 4: MVP 기능 최종 리스트 + Phase 2
수집형 앱의 본질인 '관리'를 위해 **태그와 검색을 MVP에 포함**합니다.
1. **MVP:** 직접 입력, OCR 인식 및 보정, **단일 태그(Keywords) 및 검색**, iOS 위젯, 매일 알림, TTS(기본음성).
2. **Phase 2:** Android 대응, iCloud/Google Drive 백업, OpenAI TTS 고도화, 테마 커스터마이징.

### 최종 결정 5: 일정 권고
학습 곡선과 첫 앱스토어 심사 변수를 고려하여 **총 8주**를 권고합니다.
- **1-2주:** React Native/TS 기초 및 UI 프로토타이핑.
- **3-5주:** OCR 네이티브 연동 및 데이터베이스(SQLite) 구축.
- **6-7주:** 위젯(Swift), 알림 로직 및 태그/검색 구현.
- **8주:** 폴리싱, 스토어 자산 준비 및 첫 심사 제출.

### 핵심 리스크 완화 계획
1. **위젯 동기화:** `react-native-mmkv`의 App Group 지원 기능을 활용해 설정 복잡도를 낮춥니다.
2. **저작권 이슈:** 앱 내 '개인 소장용' 명시 및 공유 시 출처 표기를 유도하는 UI를 배치하여 심사 거절 리스크를 관리합니다.
3. **한글 폰트:** `expo-font`로 가독성 높은 오픈소스 폰트(Pretendard 등)를 임베딩하여 위젯과 앱의 시각적 완성도를 높입니다.
4. **데이터 보존:** 별도 서버 없이 로컬 DB를 사용하되, `expo-file-system`을 이용한 **JSON 내보내기/가져오기**로 수동 백업을 우선 지원합니다.

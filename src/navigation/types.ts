import type { NavigatorScreenParams } from '@react-navigation/native';

// 이름 유지: New/Detail/Edit 화면들이 이 이름으로 타입을 참조한다 (무수정 컴파일)
export type RootStackParamList = {
  List: undefined;
  New: { source?: 'camera' | 'library' } | undefined;
  Detail: { id: number };
  Edit: { id: number };
};

export type GroupsStackParamList = {
  GroupsGate: undefined;
};

export type RootTabParamList = {
  MyQuotesTab: NavigatorScreenParams<RootStackParamList>;
  GroupsTab: NavigatorScreenParams<GroupsStackParamList>;
  SettingsTab: undefined;
};

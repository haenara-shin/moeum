import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
  createNavigationContainerRef,
  type Theme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, useColorScheme } from 'react-native';
import type {
  GroupsStackParamList,
  RootStackParamList,
  RootTabParamList,
} from './types';
import { ListScreen } from '../screens/ListScreen';
import { NewScreen } from '../screens/NewScreen';
import { DetailScreen } from '../screens/DetailScreen';
import { EditScreen } from '../screens/EditScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { GroupsGateScreen } from '../screens/GroupsGateScreen';
import { useThemeStore, resolveScheme } from '../store/theme';

const Tab = createBottomTabNavigator<RootTabParamList>();
const QuotesStack = createNativeStackNavigator<RootStackParamList>();
const GroupsStack = createNativeStackNavigator<GroupsStackParamList>();

export const navigationRef = createNavigationContainerRef<RootTabParamList>();

const lightTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#FAFAF7',
    card: '#FAFAF7',
    text: '#111',
    border: '#E5E7EB',
    primary: '#5B4FE5',
  },
};

const darkTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0B0B0C',
    card: '#0B0B0C',
    text: '#F5F5F5',
    border: '#27272A',
    primary: '#7C71FF',
  },
};

function QuotesStackNavigator() {
  return (
    <QuotesStack.Navigator
      initialRouteName="List"
      screenOptions={{ headerTitleStyle: { fontWeight: '700' } }}
    >
      <QuotesStack.Screen name="List" component={ListScreen} options={{ title: '모두의 마음가짐' }} />
      <QuotesStack.Screen
        name="New"
        component={NewScreen}
        options={{ title: '새 문장', presentation: 'modal' }}
      />
      <QuotesStack.Screen name="Detail" component={DetailScreen} options={{ title: '' }} />
      <QuotesStack.Screen
        name="Edit"
        component={EditScreen}
        options={{ title: '편집', presentation: 'modal' }}
      />
    </QuotesStack.Navigator>
  );
}

function GroupsStackNavigator() {
  return (
    <GroupsStack.Navigator screenOptions={{ headerTitleStyle: { fontWeight: '700' } }}>
      <GroupsStack.Screen name="GroupsGate" component={GroupsGateScreen} options={{ title: '모임' }} />
    </GroupsStack.Navigator>
  );
}

function TabIcon({ glyph }: { glyph: string }) {
  return <Text style={{ fontSize: 18 }}>{glyph}</Text>;
}

export function RootNavigator() {
  const system = useColorScheme();
  const preference = useThemeStore((s) => s.preference);
  const scheme = resolveScheme(preference, system);
  const theme = scheme === 'dark' ? darkTheme : lightTheme;

  return (
    <NavigationContainer ref={navigationRef} theme={theme}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.colors.primary,
          tabBarLabelStyle: { fontFamily: 'Pretendard-Bold', fontSize: 11 },
        }}
      >
        <Tab.Screen
          name="MyQuotesTab"
          component={QuotesStackNavigator}
          options={{ tabBarLabel: '내 문장', tabBarIcon: () => <TabIcon glyph="✍️" /> }}
        />
        <Tab.Screen
          name="GroupsTab"
          component={GroupsStackNavigator}
          options={{ tabBarLabel: '모임', tabBarIcon: () => <TabIcon glyph="👥" /> }}
        />
        <Tab.Screen
          name="SettingsTab"
          component={SettingsScreen}
          options={{
            headerShown: true,
            title: '설정',
            headerTitleStyle: { fontWeight: '700' },
            tabBarLabel: '설정',
            tabBarIcon: () => <TabIcon glyph="⚙️" />,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

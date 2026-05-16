import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
  type Theme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useColorScheme } from 'react-native';
import type { RootStackParamList } from './types';
import { ListScreen } from '../screens/ListScreen';
import { NewScreen } from '../screens/NewScreen';
import { DetailScreen } from '../screens/DetailScreen';
import { EditScreen } from '../screens/EditScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { useThemeStore, resolveScheme } from '../store/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

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

export function RootNavigator() {
  const system = useColorScheme();
  const preference = useThemeStore((s) => s.preference);
  const scheme = resolveScheme(preference, system);
  const theme = scheme === 'dark' ? darkTheme : lightTheme;

  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator
        initialRouteName="List"
        screenOptions={{
          headerTitleStyle: { fontWeight: '700' },
        }}
      >
        <Stack.Screen name="List" component={ListScreen} options={{ title: '모음' }} />
        <Stack.Screen
          name="New"
          component={NewScreen}
          options={{ title: '새 문장', presentation: 'modal' }}
        />
        <Stack.Screen name="Detail" component={DetailScreen} options={{ title: '' }} />
        <Stack.Screen
          name="Edit"
          component={EditScreen}
          options={{ title: '편집', presentation: 'modal' }}
        />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: '설정' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

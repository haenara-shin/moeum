import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { ListScreen } from '../screens/ListScreen';
import { NewScreen } from '../screens/NewScreen';
import { DetailScreen } from '../screens/DetailScreen';
import { EditScreen } from '../screens/EditScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="List"
        screenOptions={{
          headerLargeTitle: false,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: '#FAFAF7' },
        }}
      >
        <Stack.Screen name="List" component={ListScreen} options={{ title: '모음' }} />
        <Stack.Screen name="New" component={NewScreen} options={{ title: '새 문장', presentation: 'modal' }} />
        <Stack.Screen name="Detail" component={DetailScreen} options={{ title: '' }} />
        <Stack.Screen name="Edit" component={EditScreen} options={{ title: '편집', presentation: 'modal' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

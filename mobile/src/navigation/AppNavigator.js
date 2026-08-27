import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  Calculator, History as HistoryIcon, Layers3, Settings2, Wrench,
} from 'lucide-react-native';
import HomeScreen from '../screens/HomeScreen';
import MillingScreen from '../screens/MillingScreen';
import TurningScreen from '../screens/TurningScreen';
import DrillingScreen from '../screens/DrillingScreen';
import ThreadingScreen from '../screens/ThreadingScreen';
import MaterialsScreen from '../screens/MaterialsScreen';
import MaterialDetailScreen from '../screens/MaterialDetailScreen';
import MaterialFormScreen from '../screens/MaterialFormScreen';
import ToolsScreen from '../screens/ToolsScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { colors, fonts } from '../theme';

const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();

const TAB_ICONS = {
  HesaplaTab: Calculator,
  MalzemeTab: Layers3,
  TakimlarTab: Wrench,
  GecmisTab: HistoryIcon,
  AyarlarTab: Settings2,
};

const TAB_LABELS = {
  HesaplaTab: 'Hesapla',
  MalzemeTab: 'Malzeme',
  TakimlarTab: 'Takımlar',
  GecmisTab: 'Geçmiş',
  AyarlarTab: 'Ayarlar',
};

/** Alt sekmeler: Hesapla / Malzeme / Takımlar / Geçmiş / Ayarlar */
function TabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontFamily: fonts.bodySemiBold, fontSize: 11 },
        tabBarIcon: ({ color }) => {
          const Icon = TAB_ICONS[route.name] || Calculator;
          return <Icon size={22} color={color} />;
        },
        tabBarButtonTestID: `tab-${route.name}`,
      })}
    >
      <Tab.Screen name="HesaplaTab" component={HomeScreen} options={{ title: TAB_LABELS.HesaplaTab }} />
      <Tab.Screen name="MalzemeTab" component={MaterialsScreen} options={{ title: TAB_LABELS.MalzemeTab }} />
      <Tab.Screen name="TakimlarTab" component={ToolsScreen} options={{ title: TAB_LABELS.TakimlarTab }} />
      <Tab.Screen name="GecmisTab" component={HistoryScreen} options={{ title: TAB_LABELS.GecmisTab }} />
      <Tab.Screen name="AyarlarTab" component={SettingsScreen} options={{ title: TAB_LABELS.AyarlarTab }} />
    </Tab.Navigator>
  );
}

/**
 * Kok yigin (stack) navigasyonu.
 * Alt sekmeler "Tabs" ekraninin icinde; hesaplama/detay ekranlari kok seviyede
 * kayitli oldugu icin herhangi bir sekmeden navigation.navigate('Freze') gibi
 * cagrilar React Navigation'in ust navigator'a "bubble" ozelligiyle calisir.
 */
export function AppNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <RootStack.Screen name="Tabs" component={TabsNavigator} />
      <RootStack.Screen name="Freze" component={MillingScreen} />
      <RootStack.Screen name="Torna" component={TurningScreen} />
      <RootStack.Screen name="Matkap" component={DrillingScreen} />
      <RootStack.Screen name="Dis" component={ThreadingScreen} />
      <RootStack.Screen name="MaterialDetail" component={MaterialDetailScreen} />
      <RootStack.Screen name="MaterialForm" component={MaterialFormScreen} />
    </RootStack.Navigator>
  );
}

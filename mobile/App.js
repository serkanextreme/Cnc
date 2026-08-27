import 'react-native-gesture-handler';
import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { AppProvider, useApp } from './src/context/AppContext';
import { ToastProvider } from './src/components/Toast';
import { AppNavigator } from './src/navigation/AppNavigator';
import { fontMap, colors } from './src/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.card,
    text: colors.foreground,
    border: colors.border,
    primary: colors.primary,
    notification: colors.primary,
  },
};

/** Fontlar + kalici veri (AsyncStorage) yuklenene kadar splash ekranini tutar. */
function Gate() {
  const { ready } = useApp();
  const [fontsLoaded] = useFonts(fontMap);
  const appReady = fontsLoaded && ready;

  const onReady = useCallback(async () => {
    if (appReady) {
      await SplashScreen.hideAsync().catch(() => {});
    }
  }, [appReady]);

  useEffect(() => { onReady(); }, [onReady]);

  if (!appReady) return <View style={styles.blank} />;

  return (
    <NavigationContainer theme={navTheme}>
      <AppNavigator />
      <StatusBar style="light" />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <ToastProvider>
          <Gate />
        </ToastProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: colors.background },
});

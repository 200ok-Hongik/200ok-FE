import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { WEB_FRAME_ID } from '@/components/ui/OverlayModal';

const isWeb = Platform.OS === 'web';

export default function RootLayout() {
  const stack = (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="setting" />
      <Stack.Screen name="oauth/callback" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="scan/camera" options={{ animation: 'fade' }} />
      <Stack.Screen name="scan/captured" />
      <Stack.Screen name="scan/result" />
    </Stack>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        {isWeb ? (
          <View style={styles.webBackdrop}>
            <View style={styles.webFrame} nativeID={WEB_FRAME_ID}>
              {stack}
            </View>
          </View>
        ) : (
          stack
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  webBackdrop: {
    flex: 1,
    minHeight: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F2937',
  },
  webFrame: {
    position: 'relative',
    width: '100%',
    maxWidth: 375,
    height: '100%',
    maxHeight: 812,
    overflow: 'hidden',
    boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 30px 60px rgba(0,0,0,0.45)',
  },
});

import { Ionicons } from '@expo/vector-icons';
import { router, Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';

import { Colors } from '@/constants/theme';

type IconName = keyof typeof Ionicons.glyphMap;

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return (
    <Ionicons name={name} size={22} color={focused ? Colors.primary : Colors.textTertiary} />
  );
}

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={[styles.label, { color: focused ? Colors.primary : Colors.textTertiary }]}>{label}</Text>
  );
}

export default function TabsLayout() {
  return (
    <View style={styles.root}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textTertiary,
          tabBarStyle: styles.tabBar,
        }}>
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel label="홈" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'time' : 'time-outline'} focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel label="기록" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="scan-placeholder"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="scan-outline" focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel label="스캔" focused={focused} />,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push('/scan/camera');
          },
        }}
      />
      <Tabs.Screen
        name="guide"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'bookmark' : 'bookmark-outline'} focused={focused} />
          ),
          tabBarLabel: ({ focused }) => <TabLabel label="가이드" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="mypage"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'person' : 'person-outline'} focused={focused} />
          ),
          tabBarLabel: ({ focused }) => <TabLabel label="My" focused={focused} />,
        }}
      />
      </Tabs>
      {Platform.OS === 'web' && <View style={styles.homeIndicator} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabBar: {
    height: 109,
    paddingTop: 12,
    paddingBottom: 27,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  homeIndicator: {
    position: 'absolute',
    bottom: 3,
    alignSelf: 'center',
    width: 127,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2E2E2E',
    zIndex: 100,
  },
});

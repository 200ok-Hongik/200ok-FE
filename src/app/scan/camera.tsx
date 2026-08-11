import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { MockDetections } from '@/constants/mockData';
import { uploadScan } from '@/services/api';

const TAB_ICONS = [
  { name: 'home-outline' as const, label: '홈', route: '/(tabs)' as const },
  { name: 'time-outline' as const, label: '기록', route: '/(tabs)/history' as const },
  { name: 'scan' as const, label: '스캔', route: null },
  { name: 'bookmark-outline' as const, label: '가이드', route: '/(tabs)/guide' as const },
  { name: 'person-outline' as const, label: 'My', route: '/(tabs)/mypage' as const },
];

export default function ScanCameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<'scanning' | 'recognized'>('scanning');
  const [activeIndex, setActiveIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const requestedRef = useRef(false);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted && !requestedRef.current) {
      requestedRef.current = true;
      requestPermission();
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('recognized'), 1300);
    const t2 = setTimeout(() => setActiveIndex(1), 3000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const active = MockDetections[Math.min(activeIndex, MockDetections.length - 1)];
  const cameraGranted = permission?.granted;

  const handleCapture = async () => {
    if (isUploading) return;
    if (!cameraGranted || !cameraRef.current) {
      Alert.alert('카메라 권한이 필요해요', '설정에서 카메라 접근을 허용해주세요.');
      return;
    }

    try {
      setIsUploading(true);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.6 });
      if (!photo?.uri) throw new Error('사진을 촬영하지 못했어요.');

      const result = await uploadScan(photo.uri);
      router.push({ pathname: '/scan/captured', params: { scanId: String(result.scanResultId) } });
    } catch (error) {
      console.error(error);
      Alert.alert('업로드 실패', '이미지를 분석하는 중 문제가 발생했어요. 다시 시도해주세요.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      {cameraGranted ? (
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.permissionFallback]}>
          <Ionicons name="camera-outline" size={40} color="rgba(255,255,255,0.6)" />
          <Text style={styles.permissionText}>카메라 권한이 필요해요.</Text>
        </View>
      )}

      <View style={[StyleSheet.absoluteFill, phase === 'scanning' && styles.scanTint]} />

      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable hitSlop={12} onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.overlayArea}>
          <View style={styles.chipRow}>
            <View style={styles.detectionChip}>
              <View style={styles.detectionIconWrap}>
                <Ionicons
                  name={active.category === 'plastic' ? 'water' : 'wine'}
                  size={18}
                  color={active.category === 'plastic' ? Colors.primary : '#0EA5E9'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detectionKind}>{active.categoryLabel}</Text>
                <Text style={styles.detectionLabel}>{active.itemLabel}</Text>
                <Text style={styles.detectionSub}>{active.itemType}</Text>
              </View>
              <Pressable style={styles.detectionArrow} onPress={handleCapture} hitSlop={8}>
                <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
              </Pressable>
            </View>
            <View style={styles.dotsRow}>
              {MockDetections.map((item, idx) => (
                <View key={item.id} style={[styles.dot, idx === activeIndex && styles.dotActive]} />
              ))}
            </View>
          </View>

          <View style={styles.frame}>
            {phase === 'recognized' &&
              MockDetections.map((item, idx) => (
                <BoundingBox key={item.id} item={item} active={idx === activeIndex} />
              ))}
            {phase === 'scanning' && (
              <View style={[styles.simpleFrame, { top: '20%', left: '10%', width: '80%', height: '55%' }]} />
            )}
          </View>

          <Text style={styles.hint}>
            {phase === 'scanning' ? '재활용품을 인식하고 있어요...' : '화면을 반듯하게 유지해주세요'}
          </Text>
        </View>

        <View style={styles.bottomArea}>
          <Pressable style={styles.shutter} onPress={handleCapture} disabled={isUploading}>
            {isUploading ? <ActivityIndicator color={Colors.scanDark} /> : <View style={styles.shutterInner} />}
          </Pressable>

          <View style={styles.tabRow}>
            {TAB_ICONS.map((tab) => (
              <Pressable
                key={tab.label}
                accessibilityRole="button"
                accessibilityLabel={`${tab.label} 화면으로 이동`}
                disabled={!tab.route}
                hitSlop={8}
                onPress={() => tab.route && router.replace(tab.route)}
                style={({ pressed }) => [styles.tabItem, pressed && styles.tabItemPressed]}>
                <View style={tab.label === '스캔' ? styles.tabScanIcon : undefined}>
                  <Ionicons
                    name={tab.name}
                    size={20}
                    color={tab.label === '스캔' ? '#FFFFFF' : 'rgba(255,255,255,0.55)'}
                  />
                </View>
                <Text style={[styles.tabLabel, tab.label === '스캔' && styles.tabLabelActive]}>{tab.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function BoundingBox({ item, active }: { item: (typeof MockDetections)[number]; active: boolean }) {
  const { top, left, width, height } = item.box;
  return (
    <View
      style={[
        styles.boundingBox,
        {
          top: `${top * 100}%`,
          left: `${left * 100}%`,
          width: `${width * 100}%`,
          height: `${height * 100}%`,
          borderColor: active ? Colors.primary : 'rgba(255,255,255,0.6)',
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.scanDark },
  flex: { flex: 1 },
  permissionFallback: { alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  permissionText: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.sm },
  scanTint: { backgroundColor: 'rgba(34,197,94,0.14)' },
  topBar: { flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayArea: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  chipRow: { gap: Spacing.sm },
  detectionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(10,15,13,0.75)',
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  detectionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detectionKind: { color: '#9CA3AF', fontSize: FontSize.xs },
  detectionLabel: { color: '#FFFFFF', fontSize: FontSize.md, fontWeight: '800' },
  detectionSub: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '600', marginTop: 1 },
  detectionArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsRow: { flexDirection: 'row', gap: 6, alignSelf: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotActive: { backgroundColor: Colors.primary, width: 16 },
  frame: { flex: 1 },
  simpleFrame: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    borderRadius: Radius.lg,
  },
  boundingBox: {
    position: 'absolute',
    borderWidth: 2.5,
    borderRadius: Radius.md,
  },
  hint: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.75)',
    fontSize: FontSize.sm,
    marginTop: Spacing.md,
  },
  bottomArea: { alignItems: 'center', paddingBottom: Spacing.sm },
  shutter: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFFFFF' },
  tabRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  tabItem: { minWidth: 52, minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: 4 },
  tabItemPressed: { opacity: 0.55 },
  tabScanIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.55)', fontWeight: '600' },
  tabLabelActive: { color: Colors.primary },
});

import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { confirmScanResult, getScan, type ScanDetail } from '@/services/api';

export default function ScanCapturedScreen() {
  const { scanId } = useLocalSearchParams<{ scanId?: string }>();
  const [scan, setScan] = useState<ScanDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!scanId) return;
    let cancelled = false;

    setIsLoading(true);
    getScan(Number(scanId))
      .then((detail) => {
        if (!cancelled) setScan(detail);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setError('스캔 결과를 불러오지 못했어요.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [scanId]);

  const handleConfirm = async () => {
    if (!scan) return;
    try {
      setIsConfirming(true);
      await confirmScanResult(scan.scanId, {
        categoryId: scan.category.categoryId,
        states: scan.states.map((s) => ({ checklistId: s.checklistId, statusValue: s.statusValue })),
      });
      router.push({ pathname: '/scan/result', params: { scanId: String(scan.scanId) } });
    } catch (err) {
      console.error(err);
      setError('결과를 확정하지 못했어요. 다시 시도해주세요.');
    } finally {
      setIsConfirming(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]} edges={['top', 'bottom']}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (error || !scan) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]} edges={['top', 'bottom']}>
        <ScreenHeader title="SSOK" />
        <Text style={styles.errorText}>{error ?? '스캔 정보를 찾을 수 없어요.'}</Text>
      </SafeAreaView>
    );
  }

  const confidencePercent = Math.round(scan.category.confidence * 100);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="SSOK" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.photo}>
          {scan.imageUrl ? (
            <Image source={{ uri: scan.imageUrl }} style={styles.photoImage} resizeMode="cover" />
          ) : (
            <Ionicons name="image-outline" size={48} color="rgba(255,255,255,0.6)" />
          )}
        </View>

        <Text style={styles.resultText}>
          AI가 이 물건을{'\n'}
          <Text style={styles.resultAccent}>{scan.category.name}</Text>으로 인식했어요. (신뢰도 {confidencePercent}%)
        </Text>

        <View style={styles.fieldGroup}>
          <FieldLabel icon="cube-outline" label="종류" />
          <View style={styles.readonlyField}>
            <Text style={styles.readonlyFieldText}>
              {scan.category.name} ({scan.category.code})
            </Text>
          </View>
        </View>

        {scan.states.length > 0 && (
          <View style={styles.fieldGroup}>
            <FieldLabel icon="git-branch-outline" label="인식된 상태" />
            <View style={styles.checklist}>
              {scan.states.map((state) => (
                <View key={state.checklistId} style={styles.checklistRow}>
                  <Text style={styles.checklistName}>{state.checkItemName}</Text>
                  <Text style={styles.checklistValue}>{state.statusValue}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.noteBox}>
          <View style={styles.noteRow}>
            <Ionicons name="add-circle" size={16} color={Colors.primaryDark} />
            <Text style={styles.noteText}>AI 분석 결과예요. 확정하면 배출 방법을 알려드려요.</Text>
          </View>
        </View>

        <View style={styles.infoBox}>
          <InfoLine text="AI는 이미지 특징과 지역 기준을 바탕으로 분석합니다. 포장 상태나 재질 혼합 여부에 따라 일부 품목은 정확한 판단이 어려울 수 있어요." />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button label="배출 방법 확인하기" loading={isConfirming} onPress={handleConfirm} />
      </View>
    </SafeAreaView>
  );
}

function FieldLabel({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.fieldLabelRow}>
      <Ionicons name={icon} size={16} color={Colors.textSecondary} />
      <Text style={styles.fieldLabelText}>{label}</Text>
    </View>
  );
}

function InfoLine({ text }: { text: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name="information-circle-outline" size={14} color={Colors.textTertiary} />
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: Spacing.xl },
  scroll: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xl },
  photo: {
    height: 200,
    borderRadius: Radius.xl,
    backgroundColor: '#14261F',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoImage: { width: '100%', height: '100%' },
  resultText: { marginTop: Spacing.xl, fontSize: FontSize.xl, fontWeight: '800', color: Colors.text, lineHeight: 28 },
  resultAccent: { color: Colors.primaryDark },
  fieldGroup: { marginTop: Spacing.xl },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm },
  fieldLabelText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary },
  readonlyField: {
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundSoft,
  },
  readonlyFieldText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  checklist: {
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  checklistName: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },
  checklistValue: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primaryDark },
  noteBox: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.sm,
    padding: Spacing.md,
  },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  noteText: { flex: 1, fontSize: FontSize.sm, color: Colors.primaryDark, fontWeight: '700' },
  infoBox: { marginTop: Spacing.lg, gap: Spacing.sm },
  infoRow: { flexDirection: 'row', gap: Spacing.xs, alignItems: 'flex-start' },
  infoText: { flex: 1, fontSize: FontSize.xs, color: Colors.textTertiary, lineHeight: 17 },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});

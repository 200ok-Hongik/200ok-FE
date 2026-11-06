import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ICONS } from '@/components/scan/iconPaths';
import { PathIcon } from '@/components/scan/PathIcon';
import { SsokLogo } from '@/components/ui/SsokLogo';
import { Text } from '@/components/ui/Text';
import { ScanColors, statusBarInset } from '@/constants/scanDesign';
import type { ReviewGroup } from '@/constants/scanReview';

type Props = {
  groups: ReviewGroup[];
  itemCount: number;
  isSaving: boolean;
  error: string | null;
  onBack: () => void;
  onSave: () => void;
};

// 확인을 마친 물건들을 "같은 품목 + 같은 상태"끼리 묶어 한 번에 보여준다.
export function ReviewResult({ groups, itemCount, isSaving, error, onBack, onSave }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: statusBarInset(insets.top) }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="뒤로 가기" hitSlop={12} onPress={onBack} style={styles.back}>
          <PathIcon icon={ICONS.back} color={ScanColors.ink} />
        </Pressable>
        <SsokLogo width={51} color={ScanColors.green} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 120 }]}>
        <Text style={styles.title}>{`${groups.length}가지로 나눠서 버려요`}</Text>
        <Text style={styles.subtitle}>{`물건 ${itemCount}개 · 번호는 사진 속 번호예요`}</Text>

        {groups.map((group) => (
          <View key={group.key} style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle}>{group.categoryName}</Text>
              <Text style={styles.cardCount}>{`${group.items.length}개`}</Text>
            </View>
            <View style={styles.chips}>
              {group.items.map(({ item, categoryName }) => (
                <View key={item.objectId} style={styles.chip}>
                  <View style={styles.chipNumber}>
                    <Text style={styles.chipNumberText}>{item.number}</Text>
                  </View>
                  <Text style={styles.chipText} numberOfLines={1}>{categoryName}</Text>
                </View>
              ))}
            </View>
            {!!group.stateText && <Text style={styles.stateText}>{group.stateText}</Text>}
            <View style={styles.steps}>
              {group.steps.map((step, index) => (
                <Text key={`${index}-${step}`} style={styles.step}>{`${index + 1}. ${step}`}</Text>
              ))}
            </View>
            {!!group.discharge && (
              <View style={styles.discharge}>
                <PathIcon icon={ICONS.pin} color={ScanColors.greenDeep} />
                <Text style={styles.dischargeText}>{group.discharge}</Text>
              </View>
            )}
          </View>
        ))}
        {!!error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable accessibilityRole="button" onPress={onBack} style={[styles.button, styles.secondary]}>
          <Text style={styles.secondaryText}>다시 확인</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={isSaving}
          onPress={onSave}
          style={({ pressed }) => [styles.button, styles.primary, pressed && { opacity: 0.85 }]}>
          {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>정보 저장하기</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingLeft: 22 },
  back: { marginRight: 15, height: 32, justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  title: { fontSize: 24, lineHeight: 32, fontWeight: '700', color: ScanColors.ink },
  subtitle: { marginTop: 6, fontSize: 14, lineHeight: 20, color: ScanColors.gray },

  card: {
    marginTop: 16,
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ScanColors.line,
    backgroundColor: '#FFFFFF',
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 20, lineHeight: 26, fontWeight: '700', color: ScanColors.greenText },
  cardCount: { fontSize: 13, color: ScanColors.gray },
  chips: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    height: 30,
    paddingLeft: 4,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 15,
    backgroundColor: ScanColors.chipGray,
  },
  chipNumber: { width: 22, height: 22, borderRadius: 11, backgroundColor: ScanColors.green, alignItems: 'center', justifyContent: 'center' },
  chipNumberText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  chipText: { maxWidth: 160, fontSize: 13, fontWeight: '600', color: ScanColors.ink },
  stateText: { marginTop: 12, fontSize: 13, lineHeight: 18, color: ScanColors.gray },
  steps: { marginTop: 14, gap: 6 },
  step: { fontSize: 15, lineHeight: 22, color: ScanColors.ink },
  discharge: {
    marginTop: 16,
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: ScanColors.line,
  },
  dischargeText: { flex: 1, fontSize: 13, lineHeight: 18, color: ScanColors.gray },
  error: { marginTop: 16, fontSize: 13, color: '#B42318', textAlign: 'center' },

  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: ScanColors.line,
  },
  button: { height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  secondary: { flex: 1, borderWidth: 1, borderColor: ScanColors.border, backgroundColor: '#FFFFFF' },
  secondaryText: { fontSize: 15, fontWeight: '600', color: ScanColors.ink },
  primary: { flex: 2, backgroundColor: ScanColors.green },
  primaryText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});

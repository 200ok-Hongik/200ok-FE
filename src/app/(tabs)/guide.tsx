import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { DisposalGuideSteps, GuideCategories } from '@/constants/mockData';

export default function GuideScreen() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const activeLabel = GuideCategories.find((c) => c.id === activeCategory)?.label;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={Colors.textTertiary} />
          <Text style={styles.searchPlaceholder}>찾고 싶은 분리배출법을 검색해보세요!</Text>
          <Ionicons name="mic-outline" size={18} color={Colors.textTertiary} />
        </View>

        <LinearGradient colors={['#134E3A', '#1F7A55']} style={styles.hero}>
          <Text style={styles.heroTitle}>올바른 분리배출을 위한{'\n'}내 손안의 분리배출</Text>
        </LinearGradient>

        <View style={styles.sectionTabRow}>
          <Text style={styles.sectionTabActive}>분리배출요령</Text>
        </View>

        <View style={styles.grid}>
          {GuideCategories.map((cat) => (
            <Pressable key={cat.id} style={styles.gridItem} onPress={() => setActiveCategory(cat.id)}>
              <View style={[styles.gridThumb, { backgroundColor: `${Colors.primaryLight}` }]}>
                <Text style={styles.gridEmoji}>{cat.emoji}</Text>
              </View>
              <View style={styles.gridLabelRow}>
                <Text style={styles.gridLabel}>{cat.label}</Text>
                <Ionicons name="chevron-forward" size={14} color={Colors.textTertiary} />
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <BottomSheet
        visible={!!activeCategory}
        onClose={() => setActiveCategory(null)}
        title={activeLabel ? `${activeLabel} 배출 가이드` : ''}>
        {DisposalGuideSteps.map((step, idx) => (
          <View key={step.title} style={styles.stepRow}>
            <View style={styles.stepDot}>
              <Text style={styles.stepDotText}>{idx + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepDesc}>{step.desc}</Text>
            </View>
          </View>
        ))}
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxl },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    backgroundColor: Colors.backgroundSoft,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.lg,
    height: 48,
  },
  searchPlaceholder: { flex: 1, color: Colors.textTertiary, fontSize: FontSize.sm },
  hero: {
    marginTop: Spacing.lg,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    minHeight: 140,
    justifyContent: 'flex-end',
  },
  heroTitle: { color: '#FFFFFF', fontSize: FontSize.xl, fontWeight: '800', lineHeight: 28 },
  sectionTabRow: { marginTop: Spacing.xl },
  sectionTabActive: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginTop: Spacing.lg },
  gridItem: { width: '47%' },
  gridThumb: {
    aspectRatio: 1.4,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridEmoji: { fontSize: 32 },
  gridLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  gridLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  stepRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotText: { color: Colors.primaryDark, fontWeight: '800', fontSize: FontSize.xs },
  stepTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  stepDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2, lineHeight: 19 },
});

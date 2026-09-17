import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { Colors, FontSize, Spacing } from '@/constants/theme';
import { GuideCategories } from '@/constants/mockData';

const CATEGORY_ART: Record<string, string> = {
  paper: '📰',
  glass: '🍾',
  plastic: '🧴',
  can: '🥫',
  vinyl: '🛍️',
  styrofoam: '🍱',
};

const CATEGORY_ICON_SOURCES = {
  paper: require('../../../assets/images/guide-categories/paper.svg'),
  glass: require('../../../assets/images/guide-categories/glass.svg'),
  plastic: require('../../../assets/images/guide-categories/plastic.svg'),
  can: require('../../../assets/images/guide-categories/can.svg'),
  vinyl: require('../../../assets/images/guide-categories/vinyl.svg'),
  styrofoam: require('../../../assets/images/guide-categories/styrofoam.svg'),
};

const CATEGORY_SEARCH_KEYWORDS: Record<string, string[]> = {
  paper: ['종이', '박스', '종이상자', '신문', '책', '노트', '택배상자'],
  can: ['캔', '고철', '알루미늄', '철', '음료캔', '통조림'],
  glass: ['유리', '유리병', '소주병', '맥주병', '음료병'],
  plastic: ['플라스틱', '페트', '페트병', 'pet', '용기', '무색페트병'],
  vinyl: ['비닐', '봉투', '과자봉지', '포장지', '랩'],
  styrofoam: ['스티로폼', '완충재', '포장용기', '식품용기'],
};

function getBannerTags(now = new Date()) {
  const hour = now.getHours();
  const day = now.getDay();
  const month = now.getMonth() + 1;

  const timeTag = hour < 6
    ? '#새벽실천'
    : hour < 12
      ? '#좋은아침'
      : hour < 18
        ? '#오늘도실천'
        : '#저녁정리';
  const dayTag = day === 0 || day === 6 ? '#주말정리' : '#분리배출습관';
  const seasonTag = month >= 3 && month <= 5
    ? '#봄맞이정리'
    : month >= 6 && month <= 8
      ? '#여름분리배출'
      : month >= 9 && month <= 11
        ? '#가을정리'
        : '#겨울실천';

  return [timeTag, dayTag, seasonTag];
}

export default function GuideScreen() {
  const [query, setQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const normalizedQuery = query.trim().replace(/\s/g, '').toLowerCase();
  const categories = useMemo(() => {
    if (!normalizedQuery) return GuideCategories;
    return GuideCategories.filter((category) => {
      const searchableWords = [category.label, ...(CATEGORY_SEARCH_KEYWORDS[category.id] ?? [])];
      return searchableWords.some((word) => word.replace(/\s/g, '').toLowerCase().includes(normalizedQuery));
    });
  }, [normalizedQuery]);
  const bannerTags = useMemo(() => getBannerTags(), []);
  const isSearchMode = isSearchFocused || normalizedQuery.length > 0;
  const openCategory = (categoryId: string) => {
    router.push({ pathname: '/guide-detail' as never, params: { category: categoryId } });
  };
  const openFirstSearchResult = () => {
    if (categories[0]) openCategory(categories[0].id);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.greenHeader}>
          <View style={styles.searchRow}>
            <Pressable style={styles.voiceButton} accessibilityLabel="음성 검색">
              <Ionicons name="mic-outline" size={23} color="#FFFFFF" />
            </Pressable>
            <View style={styles.searchBox}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                placeholder="찾고 싶은 분리배출법을 검색해보세요!"
                placeholderTextColor="#38423E"
                style={styles.searchInput}
                returnKeyType="search"
                clearButtonMode="while-editing"
                onSubmitEditing={openFirstSearchResult}
                autoCorrect={false}
              />
              <Pressable
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="검색"
                onPress={openFirstSearchResult}>
                <Ionicons name="search" size={24} color="#20332B" />
              </Pressable>
            </View>
          </View>

          {!isSearchMode && (
            <>
              <View style={styles.heroRow}>
                <View>
                  <Text style={styles.heroEyebrow}>올바른 분리배출을 위한</Text>
                  <Text style={styles.heroTitle}>내 손안의 분리배출</Text>
                </View>
                <Image
                  source={require('../../../assets/images/guide-recycle.png')}
                  style={styles.heroArt}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                  transition={0}
                />
              </View>
              <View style={styles.heroDots}>
                <View style={styles.heroDotLong} />
                <View style={styles.heroDot} />
              </View>
            </>
          )}
        </View>

        <View style={[styles.contentPanel, isSearchMode && styles.searchContentPanel]}>
          {isSearchMode && (
            <View style={styles.searchStatusRow}>
              <Text style={styles.searchStatusTitle}>
                {normalizedQuery ? `'${query.trim()}' 검색 결과` : '검색할 품목을 입력해주세요'}
              </Text>
              {!!normalizedQuery && <Text style={styles.searchCount}>{categories.length}개</Text>}
            </View>
          )}
          <View style={styles.categoryGrid}>
            {categories.map((category) => (
              <Pressable
                key={category.id}
                style={({ pressed }) => [styles.categoryItem, pressed && styles.pressed]}
                onPress={() => openCategory(category.id)}>
                <Image
                  source={CATEGORY_ICON_SOURCES[category.id as keyof typeof CATEGORY_ICON_SOURCES]}
                  style={styles.categoryArt}
                  contentFit="contain"
                  transition={0}
                />
                <Text style={styles.categoryLabel}>{category.label}</Text>
              </Pressable>
            ))}
          </View>

          {categories.length === 0 && (
            <Text style={styles.emptyText}>검색 결과가 없어요.</Text>
          )}

          {!isSearchMode && <Pressable
            style={({ pressed }) => [styles.scanBanner, pressed && styles.pressed]}
            onPress={() => router.push('/scan/camera')}>
            <View style={styles.bannerCopy}>
              <Text style={styles.bannerTitle}>AI로 SCAN하고{`\n`}쉽게 분리배출을 기록하자!</Text>
              <View style={styles.tagRow}>
                {bannerTags.map((tag) => (
                  <Pressable
                    key={tag}
                    accessibilityRole="text"
                    style={styles.tag}
                    onPress={(event) => event.stopPropagation()}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <Image
              source={require('../../../assets/images/recycling-bin.svg')}
              style={styles.bannerArt}
              contentFit="contain"
            />
          </Pressable>}
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#24B975' },
  scroll: { flexGrow: 1, backgroundColor: '#24B975' },
  greenHeader: { paddingHorizontal: 16, paddingBottom: 22 },
  searchRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  voiceButton: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: '#108653',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    flex: 1,
    height: 52,
    borderRadius: 8,
    backgroundColor: '#F0FAF6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  searchInput: { flex: 1, height: '100%', color: '#20332B', fontSize: 16, fontFamily: 'PretendardRegular', padding: 0 },
  heroRow: {
    minHeight: 130,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 6,
    paddingRight: 10,
  },
  heroEyebrow: { color: '#E7FFF2', fontSize: 17, lineHeight: 24, fontWeight: '400' },
  heroTitle: { color: '#FFFFFF', fontSize: 21, lineHeight: 30, fontWeight: '800', marginTop: 4 },
  heroArt: {
    width: 157,
    height: 148,
    position: 'relative',
    left: -10,
    top: 8,
  },
  heroDots: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingLeft: 7 },
  heroDotLong: { width: 16, height: 3, borderRadius: 2, backgroundColor: '#165C3D' },
  heroDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFFFFF' },
  contentPanel: {
    flex: 1,
    minHeight: 490,
    marginTop: -1,
    paddingHorizontal: 17,
    paddingTop: 27,
    paddingBottom: 28,
    borderTopLeftRadius: 27,
    borderTopRightRadius: 27,
    backgroundColor: '#FFFFFF',
  },
  searchContentPanel: { minHeight: 560, paddingTop: 22 },
  searchStatusRow: { minHeight: 35, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, paddingHorizontal: 4 },
  searchStatusTitle: { color: '#17201C', fontSize: 16, lineHeight: 22, fontWeight: '700' },
  searchCount: { color: Colors.primaryDark, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 27 },
  categoryItem: { width: '33.333%', alignItems: 'center', gap: 6 },
  categoryArt: { width: 78, height: 58 },
  categoryLabel: { color: '#4D4D4D', fontSize: 13, lineHeight: 18, fontWeight: '500' },
  pressed: { opacity: 0.62 },
  emptyText: { paddingVertical: 60, textAlign: 'center', color: Colors.textTertiary, fontSize: 13 },
  scanBanner: {
    height: 152,
    marginTop: 42,
    borderRadius: 9,
    backgroundColor: '#FFD29D',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 30,
  },
  bannerCopy: { flex: 1, zIndex: 2 },
  bannerTitle: { color: '#6D3E16', fontSize: 19, lineHeight: 29, fontWeight: '500', letterSpacing: -0.6 },
  tagRow: { flexDirection: 'row', gap: 7, marginTop: 11 },
  tag: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 9, backgroundColor: '#FFF8F0' },
  tagText: { color: '#C26B22', fontSize: 10, fontWeight: '700' },
  bannerArt: { position: 'absolute', right: 9, bottom: 6, width: 112, height: 122 },
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
  stepCopy: { flex: 1 },
  stepTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  stepDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2, lineHeight: 19 },
});

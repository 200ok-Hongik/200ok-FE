import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { GUIDE_DETAILS } from '@/constants/guideDetails';

export default function GuideDetailScreen() {
  const { category } = useLocalSearchParams<{ category?: string }>();
  const guide = GUIDE_DETAILS[category ?? 'plastic'] ?? GUIDE_DETAILS.plastic;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Ionicons name="chevron-back" size={27} color="#17202D" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>{guide.title}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <Text style={styles.leaf}>🍃</Text>
          <Text style={styles.title}>배출 가이드</Text>
        </View>
        <Text style={styles.subtitle}>아래 순서에 따라 배출하면 재활용률을 높일 수 있어요.</Text>

        <View style={styles.guideCard}>
          {guide.steps.map((step) => (
            <View key={step.title} style={styles.step}>
              <View style={styles.stepTitleRow}>
                <View style={styles.dot} />
                <Text style={styles.stepTitle}>{step.title}</Text>
              </View>
              <View style={styles.stepBody}>
                <View style={styles.line} />
                <View style={styles.descriptionBox}>
                  <Text style={styles.description}>{step.description}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.cautionSection}>
          <View style={styles.cautionTitleRow}>
            <Ionicons name="warning" size={19} color="#1EA866" />
            <Text style={styles.cautionTitle}>주의 사항</Text>
          </View>
          <Text style={styles.cautionIntro}>재활용률을 높이기 위해 꼭 확인해주세요.</Text>
          <View style={styles.cautionCopy}>
            {guide.cautions.map((caution, index) => (
              <Text key={caution} style={styles.cautionText}>
                {index === 0 ? '• ' : '• '}{caution}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button label="정보 저장하기" onPress={() => router.back()} style={styles.saveButton} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { height: 62, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18 },
  headerTitle: { color: '#17202D', fontSize: 18, lineHeight: 24, fontWeight: '800' },
  scroll: { paddingHorizontal: 18, paddingTop: 28, paddingBottom: 30 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  leaf: { fontSize: 18 },
  title: { color: '#1C222B', fontSize: 19, lineHeight: 26, fontWeight: '800' },
  subtitle: { marginTop: 5, color: '#6D727A', fontSize: 12, lineHeight: 18 },
  guideCard: { marginTop: 17, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 6, borderWidth: 1, borderColor: '#D7D7D7', borderRadius: 16 },
  step: { marginBottom: 15 },
  stepTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF8A00' },
  stepTitle: { color: '#20242A', fontSize: 14, lineHeight: 20, fontWeight: '800' },
  stepBody: { flexDirection: 'row', marginTop: 8 },
  line: { width: 2, marginLeft: 3, marginRight: 20, backgroundColor: '#FF8A00' },
  descriptionBox: { flex: 1, minHeight: 58, justifyContent: 'center', borderRadius: 9, backgroundColor: '#FFF0DF', paddingHorizontal: 17, paddingVertical: 12 },
  description: { color: '#5F6064', fontSize: 12, lineHeight: 21 },
  cautionSection: { marginTop: 65 },
  cautionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cautionTitle: { color: '#1C222B', fontSize: 18, lineHeight: 24, fontWeight: '800' },
  cautionIntro: { marginTop: 5, color: '#6D727A', fontSize: 12, lineHeight: 18 },
  cautionCopy: { marginTop: 16, borderLeftWidth: 1, borderLeftColor: '#AAB1BC', paddingLeft: 14, gap: 7 },
  cautionText: { color: '#4F555E', fontSize: 13, lineHeight: 20 },
  footer: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 8, backgroundColor: '#FFFFFF' },
  saveButton: { height: 52, borderRadius: 8 },
});

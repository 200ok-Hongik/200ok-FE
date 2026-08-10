import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SelectField } from '@/components/ui/SelectField';
import { Colors } from '@/constants/theme';
import { RegionData } from '@/constants/mockData';
import { getRegions, updateRegion, type Region } from '@/services/api';

export default function SettingScreen() {
  const [province, setProvince] = useState<string | null>(null);
  const [district, setDistrict] = useState<string | null>(null);
  const [town, setTown] = useState<string | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getRegions()
      .then((data) => {
        if (!cancelled) setRegions(data);
      })
      .catch((error) => console.warn('지역 API를 불러오지 못했습니다.', error));
    return () => {
      cancelled = true;
    };
  }, []);

  const regionSource = useMemo(() => {
    if (!regions.length) return RegionData;
    return regions.reduce<Record<string, Record<string, string[]>>>((result, region) => {
      result[region.sido] ??= {};
      result[region.sido][region.gugun] ??= [];
      if (!result[region.sido][region.gugun].includes(region.dong)) result[region.sido][region.gugun].push(region.dong);
      return result;
    }, {});
  }, [regions]);

  const provinceOptions = useMemo(
    () => Object.keys(regionSource).map((p) => ({ label: p, value: p })),
    [regionSource]
  );
  const districtOptions = useMemo(
    () => (province ? Object.keys(regionSource[province] ?? {}).map((d) => ({ label: d, value: d })) : []),
    [province, regionSource]
  );
  const townOptions = useMemo(
    () => (province && district ? (regionSource[province]?.[district] ?? []).map((t) => ({ label: t, value: t })) : []),
    [province, district, regionSource]
  );

  const complete = !!province && !!district && !!town;

  const handleComplete = async () => {
    if (!province || !district || !town || isSaving) return;
    const selectedRegion = regions.find((region) => region.sido === province && region.gugun === district && region.dong === town);
    try {
      setIsSaving(true);
      if (selectedRegion) await updateRegion(selectedRegion.regionId);
    } catch (error) {
      console.warn('로그인 연결 전이라 지역 저장은 건너뜁니다.', error);
    } finally {
      setIsSaving(false);
      router.replace('/(tabs)');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {Platform.OS === 'web' && (
        <View style={styles.webStatusBar}>
          <Text style={styles.webStatusTime}>9:41</Text>
          <View style={styles.webStatusIcons}>
            <Ionicons name="cellular" size={14} color="#111111" />
            <Ionicons name="wifi" size={14} color="#111111" />
            <Ionicons name="battery-full" size={17} color="#111111" />
          </View>
        </View>
      )}
      <ScreenHeader />
      <View style={styles.content}>
        <Text style={styles.title}>
          <Text style={styles.titleAccent}>지역 정보</Text>를 입력해 주세요
        </Text>
        <Text style={styles.subtitle}>간단한 질문으로 데이터를 기록합니다</Text>

        <View style={styles.fields}>
          <SelectField
            placeholder="시/도를 선택해주세요."
            value={province}
            options={provinceOptions}
            style={styles.selectField}
            textStyle={styles.selectText}
            inline
            onChange={(v) => {
              setProvince(v);
              setDistrict(null);
              setTown(null);
            }}
          />
          <SelectField
            placeholder="구/군을 선택해주세요."
            value={district}
            options={districtOptions}
            style={styles.selectField}
            textStyle={styles.selectText}
            inline
            disabled={!province}
            onChange={(v) => {
              setDistrict(v);
              setTown(null);
            }}
          />
          <SelectField
            placeholder="동을 선택해주세요."
            helperLabel="동을 선택해주세요."
            value={town}
            options={townOptions}
            style={styles.selectField}
            textStyle={styles.selectText}
            inline
            keepOpenOnSelect
            disabled={!district}
            onChange={setTown}
          />
        </View>

        <View style={styles.spacer} />

        <Button
          label={complete ? 'SSOK 시작하기' : '다음'}
          disabled={!complete}
          loading={isSaving}
          style={styles.nextButton}
          labelStyle={styles.nextButtonLabel}
          onPress={handleComplete}
        />
      </View>
      {Platform.OS === 'web' && <View style={styles.webHomeIndicator} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  webStatusBar: {
    height: 44,
    paddingHorizontal: 43,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  webStatusTime: { fontSize: 14, lineHeight: 18, fontWeight: '700', color: '#111111' },
  webStatusIcons: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  content: {
    flex: 1,
    paddingHorizontal: 13,
    paddingTop: 66,
    paddingBottom: Platform.OS === 'web' ? 52 : 12,
  },
  title: {
    textAlign: 'center',
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    color: '#090909',
  },
  titleAccent: {
    color: '#22B573',
  },
  subtitle: {
    textAlign: 'center',
    marginTop: 9,
    color: '#555555',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '400',
  },
  fields: {
    marginTop: 75,
    gap: 14,
  },
  selectField: {
    height: 55,
    paddingHorizontal: 22,
    borderRadius: 10,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: { elevation: 2 },
      web: { boxShadow: '0 1px 3px rgba(0,0,0,0.14)' },
    }),
  },
  selectText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400',
    color: '#3F3F3F',
  },
  nextButton: {
    height: 46,
    borderRadius: 7,
    backgroundColor: '#25B972',
    opacity: 1,
  },
  nextButtonLabel: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
  },
  spacer: { flex: 1 },
  webHomeIndicator: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    width: 127,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3E3E3E',
  },
});

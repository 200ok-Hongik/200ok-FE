import { createContext, useContext } from 'react';
import { StyleSheet, Text as RNText, type TextProps, type TextStyle } from 'react-native';

const FONT_FAMILY_BY_WEIGHT = {
  '100': 'PretendardThin',
  '200': 'PretendardExtraLight',
  '300': 'PretendardLight',
  '400': 'PretendardRegular',
  '500': 'PretendardMedium',
  '600': 'PretendardSemiBold',
  '700': 'PretendardBold',
  '800': 'PretendardExtraBold',
  '900': 'PretendardBlack',
} as const;

const PretendardFontContext = createContext<string>(FONT_FAMILY_BY_WEIGHT['400']);

function getPretendardFamily(fontWeight: TextStyle['fontWeight']) {
  if (fontWeight === 'bold') return FONT_FAMILY_BY_WEIGHT['700'];
  if (!fontWeight || fontWeight === 'normal') return FONT_FAMILY_BY_WEIGHT['400'];

  const numericWeight = Number(fontWeight);
  const normalizedWeight = Math.min(900, Math.max(100, Math.round(numericWeight / 100) * 100));
  return FONT_FAMILY_BY_WEIGHT[String(normalizedWeight) as keyof typeof FONT_FAMILY_BY_WEIGHT] ?? FONT_FAMILY_BY_WEIGHT['400'];
}

export function Text({ style, ...props }: TextProps) {
  const inheritedFontFamily = useContext(PretendardFontContext);
  const flattenedStyle = StyleSheet.flatten(style);
  const explicitFontFamily = flattenedStyle?.fontFamily;
  const hasExplicitFontWeight = flattenedStyle?.fontWeight != null;
  const fontFamily = explicitFontFamily
    ?? (hasExplicitFontWeight ? getPretendardFamily(flattenedStyle?.fontWeight) : inheritedFontFamily);

  return (
    <PretendardFontContext.Provider value={fontFamily}>
      <RNText
        {...props}
        style={explicitFontFamily ? style : [style, { fontFamily, fontWeight: 'normal' }]}
      />
    </PretendardFontContext.Provider>
  );
}

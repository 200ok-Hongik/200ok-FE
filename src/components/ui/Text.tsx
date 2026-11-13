import { createContext, useContext } from 'react';
import { Platform, StyleSheet, Text as RNText, type TextProps, type TextStyle } from 'react-native';

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

// 한글은 띄어쓰기 단위로만 줄을 바꾼다. 기본값이면 "…확인해보세 / 요"처럼 단어가 중간에서 잘려 한 글자만 다음 줄로 넘어간다.
// 웹은 word-break: keep-all, iOS는 hangul-word 줄바꿈을 쓴다. (너무 긴 단어는 칸을 넘지 않게 여전히 잘린다)
const KOREAN_WORD_WRAP = Platform.OS === 'web' ? ({ wordBreak: 'keep-all', overflowWrap: 'break-word' } as TextStyle) : null;
const KOREAN_LINE_BREAK = Platform.OS === 'ios' ? ({ lineBreakStrategy: 'hangul-word' } as const) : null;

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
        {...KOREAN_LINE_BREAK}
        {...props}
        style={[KOREAN_WORD_WRAP, explicitFontFamily ? style : [style, { fontFamily, fontWeight: 'normal' }]]}
      />
    </PretendardFontContext.Provider>
  );
}

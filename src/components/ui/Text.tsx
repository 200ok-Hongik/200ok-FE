import { Text as RNText, type TextProps } from 'react-native';

export function Text({ style, ...props }: TextProps) {
  return <RNText {...props} style={style} />;
}

import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View, type TextStyle, type ViewStyle } from 'react-native';
import { Text } from '@/components/ui/Text';

import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { BottomSheet } from '@/components/ui/BottomSheet';

export type SelectOption = { label: string; value: string };

type Props = {
  placeholder: string;
  value: string | null;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  helperLabel?: string;
  sheetTitle?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  inline?: boolean;
  keepOpenOnSelect?: boolean;
};

export function SelectField({
  placeholder,
  value,
  options,
  onChange,
  disabled,
  helperLabel,
  sheetTitle,
  style,
  textStyle,
  inline = false,
  keepOpenOnSelect = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <>
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        style={[
          styles.field,
          disabled && styles.fieldDisabled,
          style,
          selected && (!inline || open) && styles.fieldFilled,
          inline && open && styles.fieldOpen,
        ]}>
        <View style={{ flex: 1 }}>
          {selected && helperLabel && <Text style={styles.helperLabel}>{helperLabel}</Text>}
          <Text style={[styles.fieldText, !selected && styles.placeholder, textStyle]}>
            {selected ? selected.label : placeholder}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={18} color={disabled ? Colors.textTertiary : Colors.textSecondary} />
      </Pressable>

      {inline && open ? (
        <View style={styles.inlineMenu}>
          {options.filter((item) => item.value !== value).map((item, index, visibleOptions) => (
            <Pressable
              key={item.value}
              style={[styles.inlineOption, index < visibleOptions.length - 1 && styles.inlineOptionBorder]}
              onPress={() => {
                onChange(item.value);
                if (!keepOpenOnSelect) setOpen(false);
              }}>
              <Text style={styles.inlineOptionText}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <BottomSheet visible={open} onClose={() => setOpen(false)} title={sheetTitle ?? placeholder}>
          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            style={{ maxHeight: 360 }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => (
              <Pressable
                style={styles.option}
                onPress={() => {
                  onChange(item.value);
                  setOpen(false);
                }}>
                <Text style={[styles.optionText, item.value === value && styles.optionTextActive]}>
                  {item.label}
                </Text>
                {item.value === value && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
              </Pressable>
            )}
          />
        </BottomSheet>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  fieldFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.mint,
  },
  fieldOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  fieldDisabled: {
    backgroundColor: Colors.backgroundSoft,
  },
  fieldText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  placeholder: {
    color: Colors.textTertiary,
    fontWeight: '500',
  },
  helperLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.primaryDark,
    marginBottom: 2,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  optionText: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: '500',
  },
  optionTextActive: {
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  inlineMenu: {
    marginTop: -1,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: Colors.border,
    borderBottomLeftRadius: Radius.sm,
    borderBottomRightRadius: Radius.sm,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  inlineOption: {
    height: 55,
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  inlineOptionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  inlineOptionText: {
    color: '#3F3F3F',
    fontSize: 15,
    fontWeight: '400',
  },
});

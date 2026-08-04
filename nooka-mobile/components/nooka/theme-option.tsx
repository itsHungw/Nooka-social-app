import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ThemePreference } from '@/features/theme/theme-preference';
import { useNookaTheme } from '@/hooks/use-nooka-theme';

type ThemeOptionProps = {
  value: ThemePreference;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export function ThemeOption({ value, label, description, icon }: ThemeOptionProps) {
  const { colors, preference, setPreference } = useNookaTheme();
  const selected = preference === value;

  return (
    <Pressable
      accessibilityHint={description}
      accessibilityLabel={label}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={() => setPreference(value)}
      style={({ pressed }) => [
        styles.option,
        {
          backgroundColor: selected ? colors.mint : colors.surface,
          borderColor: selected ? colors.mintStrong : colors.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}>
      <View style={[styles.iconBox, { backgroundColor: selected ? colors.surface : colors.surfaceMuted }]}> 
        <Ionicons color={selected ? colors.mintStrong : colors.icon} name={icon} size={21} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.description, { color: colors.textMuted }]}>{description}</Text>
      </View>
      <View
        style={[
          styles.radio,
          { borderColor: selected ? colors.mintStrong : colors.borderStrong, backgroundColor: colors.surface },
        ]}>
        {selected ? <View style={[styles.radioDot, { backgroundColor: colors.mintStrong }]} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: { minHeight: 74, borderRadius: 8, borderWidth: 1, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  description: { marginTop: 2, fontSize: 11, lineHeight: 16 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 12, height: 12, borderRadius: 6 },
});

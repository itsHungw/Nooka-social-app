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
          backgroundColor: selected ? colors.accentSoft : colors.surface,
          borderColor: selected ? colors.accentStrong : colors.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}>
      <View style={[styles.iconBox, { backgroundColor: selected ? colors.surface : colors.surfaceMuted }]}> 
        <Ionicons color={selected ? colors.accentStrong : colors.icon} name={icon} size={19} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.description, { color: colors.textMuted }]}>{description}</Text>
      </View>
      <View
        style={[
          styles.radio,
          { borderColor: selected ? colors.accentStrong : colors.border, backgroundColor: colors.surface },
        ]}>
        {selected ? <View style={[styles.radioDot, { backgroundColor: colors.accentStrong }]} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: { minHeight: 62, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  label: { fontSize: 14.5, lineHeight: 19, fontWeight: '700' },
  description: { marginTop: 2, fontSize: 11.5, lineHeight: 16 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
});

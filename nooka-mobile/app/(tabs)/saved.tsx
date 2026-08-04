import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PlaceRow, ScreenShell } from '@/components/nooka/ui';
import { savedMapImage, savedPlaces } from '@/features/nooka/prototype-data';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';

type SavedMode = 'wantToGo' | 'been';

export default function SavedScreen() {
  const { colors } = useNookaTheme();
  const [mode, setMode] = useState<SavedMode>('wantToGo');
  const visiblePlaces = mode === 'wantToGo' ? savedPlaces : savedPlaces.slice(1);

  return (
    <ScreenShell testID="saved-screen">
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t('saved.title')}</Text>
        <View style={[styles.countPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.countLabel, { color: colors.textMuted }]}>{t('saved.locationCount')}</Text>
        </View>
      </View>

      <View style={styles.segmented}>
        {(['wantToGo', 'been'] as SavedMode[]).map((item) => {
          const selected = mode === item;
          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              key={item}
              onPress={() => setMode(item)}
              style={[
                styles.segment,
                {
                  backgroundColor: selected ? colors.mint : colors.surface,
                  borderColor: selected ? colors.mintStrong : colors.border,
                },
              ]}>
              <Text style={[styles.segmentLabel, { color: colors.text }]}>{t(`saved.${item}`)}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.map, { backgroundColor: colors.mapBackground }]}>
        <Image accessibilityLabel={t('navigation.map')} contentFit="cover" source={savedMapImage} style={StyleSheet.absoluteFill} transition={180} />
      </View>

      <View style={styles.list}>
        {visiblePlaces.map((place) => (
          <PlaceRow
            image={place.image}
            key={place.id}
            metaKey={place.metaKey}
            nameKey={place.nameKey}
            saved
            socialKey={place.socialKey}
          />
        ))}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { fontSize: 25, lineHeight: 31, fontWeight: '800' },
  countPill: { minHeight: 34, borderRadius: 17, borderWidth: 1, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  countLabel: { fontSize: 10, lineHeight: 14, fontWeight: '600' },
  segmented: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 },
  segment: { minHeight: 36, borderRadius: 18, borderWidth: 1, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  segmentLabel: { fontSize: 11, lineHeight: 15, fontWeight: '700' },
  map: { height: 230, marginTop: 8, borderRadius: 18, overflow: 'hidden' },
  list: { marginTop: 14, gap: 9 },
});

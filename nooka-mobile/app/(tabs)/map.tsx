import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { FakeMap, MapPin } from '@/components/nooka/fake-map';
import { AskNookaBar, ScreenShell, SectionLabel, SpotRow } from '@/components/nooka/ui';
import { spotName } from '@/features/nooka/labels';
import { MAP_PINS, SPOTS, SPOT_IDS } from '@/features/nooka/spots';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';

export default function MapScreen() {
  const router = useRouter();
  const { colors } = useNookaTheme();

  return (
    <ScreenShell testID="map-screen">
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t('map.title')}</Text>
        <View style={styles.locationRow}>
          <View style={[styles.locationDot, { backgroundColor: colors.accentInk }]} />
          <Text style={[styles.locationText, { color: colors.text }]}>{t('home.location')}</Text>
        </View>
      </View>

      <AskNookaBar hint={t('map.askHint')} onPress={() => router.push('/search')} />

      <FakeMap showUser style={styles.map}>
        {MAP_PINS.map((pin) => (
          <MapPin
            count={SPOTS[pin.spot].checkins}
            key={pin.spot}
            label={t('map.pinLabel', { count: SPOTS[pin.spot].checkins, spot: spotName(pin.spot) })}
            left={pin.left}
            onPress={() => router.push({ pathname: '/spot/[id]', params: { id: pin.spot } })}
            top={pin.top}
          />
        ))}
      </FakeMap>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <SectionLabel>{t('map.busyNearby')}</SectionLabel>
        {SPOT_IDS.map((id) => (
          <SpotRow
            key={id}
            line={t(`spots.${id}.busy`)}
            onPress={() => router.push({ pathname: '/spot/[id]', params: { id: id } })}
            tint={SPOTS[id].photoTint}
            title={spotName(id)}
          />
        ))}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 44, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { flex: 1, fontSize: 25, lineHeight: 32, fontWeight: '800', letterSpacing: -0.7 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  locationDot: { width: 6, height: 6, borderRadius: 3 },
  locationText: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  map: { height: 250, marginTop: 14, marginHorizontal: 20, borderRadius: 22 },
  list: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12, gap: 6 },
});

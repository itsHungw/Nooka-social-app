import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CenterPin, FakeMap } from '@/components/nooka/fake-map';
import { Button, CircleButton, ScreenShell, SectionLabel } from '@/components/nooka/ui';
import { formatDistance, spotName } from '@/features/nooka/labels';
import { SPOTS, SPOT_IDS } from '@/features/nooka/spots';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';
import { useNookaDemo } from '@/providers/nooka-demo-provider';

/** Bước 2: sửa lại địa điểm khi định vị tự động đoán sai. */
export default function PinScreen() {
  const router = useRouter();
  const { colors } = useNookaTheme();
  const demo = useNookaDemo();

  return (
    <ScreenShell edges={['top', 'bottom']} testID="pin-screen">
      <FakeMap style={styles.map}>
        <View style={styles.mapBar}>
          <CircleButton accessibilityLabel={t('common.back')} icon="arrow-back" onPress={() => router.back()} />
          <View style={[styles.hint, { backgroundColor: colors.surface }]}>
            <Text style={[styles.hintText, { color: colors.text }]}>{t('pin.hint')}</Text>
          </View>
        </View>
        <CenterPin label={t('pin.yourPin')} />
      </FakeMap>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <SectionLabel>{t('pin.nearPin')}</SectionLabel>
        {SPOT_IDS.map((id) => {
          const spot = SPOTS[id];
          const selected = demo.draftSpot === id;

          return (
            <Pressable
              accessibilityLabel={spotName(id)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              key={id}
              onPress={() => demo.setDraftSpot(id)}
              style={({ pressed }) => [styles.option, { opacity: pressed ? 0.7 : 1 }]}>
              <View
                style={[
                  styles.radio,
                  { borderColor: selected ? colors.text : colors.border, borderWidth: selected ? 6 : 2 },
                ]}
              />
              <View style={styles.optionCopy}>
                <Text numberOfLines={1} style={[styles.optionName, { color: colors.text }]}>{spotName(id)}</Text>
                <Text numberOfLines={1} style={[styles.optionLine, { color: colors.textMuted }]}>
                  {spot.isNew
                    ? t('pin.fromMaps')
                    : t('pin.onNooka', { distance: formatDistance(spot.distanceM), count: spot.checkins })}
                </Text>
              </View>
              {spot.isNew ? (
                <View style={[styles.newBadge, { backgroundColor: colors.accentSoft }]}>
                  <Text style={[styles.newBadgeText, { color: colors.accentInk }]}>{t('pin.new')}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}

        <View style={[styles.createRow, { borderColor: colors.borderSubtle }]}>
          <View style={[styles.createIcon, { backgroundColor: colors.surfaceMuted }]}>
            <Ionicons color={colors.text} name="add" size={15} />
          </View>
          <Text style={[styles.createText, { color: colors.text }]}>{t('pin.notListed')}</Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
        <Button label={t('pin.confirm')} onPress={() => router.back()} style={styles.confirm} />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  map: { height: 322 },
  mapBar: { paddingHorizontal: 20, paddingTop: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  hint: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  hintText: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  list: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  option: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  radio: { width: 20, height: 20, borderRadius: 10 },
  optionCopy: { flex: 1, minWidth: 0 },
  optionName: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  optionLine: { marginTop: 3, fontSize: 12.5, lineHeight: 17, fontWeight: '500' },
  newBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  newBadgeText: { fontSize: 12, lineHeight: 16, fontWeight: '700' },
  createRow: { marginTop: 18, paddingTop: 16, borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  createIcon: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  createText: { flex: 1, fontSize: 14, lineHeight: 19, fontWeight: '700' },
  footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, borderTopWidth: 1 },
  confirm: { minHeight: 50, borderRadius: 16 },
});

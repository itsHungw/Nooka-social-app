import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CreateRouteTabBar } from '@/components/nooka/nooka-tab-bar';
import { workshopImage } from '@/features/nooka/prototype-data';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';

type Visibility = 'followers' | 'closeFriends' | 'public' | 'private';

const visibilityIcons: Record<Visibility, keyof typeof Ionicons.glyphMap> = {
  followers: 'people-outline',
  closeFriends: 'star-outline',
  public: 'earth-outline',
  private: 'lock-closed-outline',
};

export default function CreateScreen() {
  const router = useRouter();
  const { colors } = useNookaTheme();
  const [photoAdded, setPhotoAdded] = useState(false);
  const [placeSelected, setPlaceSelected] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>('followers');
  const [hideTime, setHideTime] = useState(false);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Pressable accessibilityLabel={t('common.back')} accessibilityRole="button" hitSlop={10} onPress={() => router.back()} style={styles.backButton}>
              <Ionicons color={colors.text} name="arrow-back" size={23} />
            </Pressable>
            <Text style={[styles.title, { color: colors.text }]}>{t('create.title')}</Text>
            <Text style={[styles.stepCount, { color: colors.textMuted }]}>{t('create.stepCount')}</Text>
          </View>

          <View style={styles.stepper}>
            {(['photo', 'place', 'details', 'share'] as const).map((step, index) => (
              <View key={step} style={styles.stepCell}>
                <View style={[styles.stepIcon, { backgroundColor: index === 0 ? colors.accent : colors.surface, borderColor: colors.border }]}>
                  <Ionicons
                    color={colors.text}
                    name={(['camera-outline', 'location-outline', 'document-text-outline', 'share-outline'] as const)[index]}
                    size={21}
                  />
                </View>
                <Text style={[styles.stepLabel, { color: colors.text }]}>{t(`create.steps.${step}`)}</Text>
              </View>
            ))}
          </View>

          <Pressable
            accessibilityLabel={t('create.addPhoto')}
            accessibilityRole="button"
            onPress={() => setPhotoAdded((value) => !value)}
            style={[styles.upload, { backgroundColor: colors.surface, borderColor: photoAdded ? colors.mintStrong : colors.borderStrong }]}>
            {photoAdded ? (
              <Image accessibilityLabel={t('create.photoAdded')} contentFit="cover" source={workshopImage} style={StyleSheet.absoluteFill} transition={180} />
            ) : null}
            <View style={[styles.uploadBadge, { backgroundColor: photoAdded ? colors.mint : colors.accentSoft }]}>
              <Ionicons color={colors.text} name={photoAdded ? 'checkmark' : 'camera-outline'} size={25} />
            </View>
            <Text style={[styles.uploadTitle, { color: photoAdded ? colors.surface : colors.text }]}>
              {t(photoAdded ? 'create.photoAdded' : 'create.addPhoto')}
            </Text>
            {!photoAdded ? <Text style={[styles.uploadHint, { color: colors.textMuted }]}>{t('create.tapUpload')}</Text> : null}
          </Pressable>

          <Pressable
            accessibilityLabel={t('create.pickPlace')}
            accessibilityRole="button"
            onPress={() => setPlaceSelected((value) => !value)}
            style={[styles.optionRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons color={colors.text} name="location-outline" size={20} />
            <Text style={[styles.optionLabel, { color: colors.text }]}>{t('create.pickPlace')}</Text>
            <Text numberOfLines={1} style={[styles.optionValue, { color: placeSelected ? colors.mintStrong : colors.textMuted }]}>
              {placeSelected ? t('places.workshop.name') : t('create.search')}
            </Text>
            <Ionicons color={colors.icon} name="chevron-forward" size={18} />
          </Pressable>
          <View style={[styles.optionRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons color={colors.text} name="bag-handle-outline" size={20} />
            <Text style={[styles.optionLabel, { color: colors.text }]}>{t('create.needToKnow')}</Text>
            <Text style={[styles.optionValue, { color: colors.textMuted }]}>{t('create.optional')}</Text>
            <Ionicons color={colors.icon} name="chevron-forward" size={18} />
          </View>

          <View style={styles.visibilityGrid}>
            {(Object.keys(visibilityIcons) as Visibility[]).map((item) => {
              const selected = visibility === item;
              return (
                <Pressable
                  accessibilityLabel={t(`create.visibility.${item}`)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  key={item}
                  onPress={() => setVisibility(item)}
                  style={[
                    styles.visibilityCard,
                    {
                      backgroundColor: selected ? colors.mint : colors.surface,
                      borderColor: selected ? colors.mintStrong : colors.border,
                    },
                  ]}>
                  <Ionicons color={colors.text} name={visibilityIcons[item]} size={20} />
                  <View style={styles.visibilityCopy}>
                    <Text style={[styles.visibilityTitle, { color: colors.text }]}>{t(`create.visibility.${item}`)}</Text>
                    <Text style={[styles.visibilityHint, { color: colors.textMuted }]}>{t(`create.visibility.${item}Desc`)}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={[styles.switchRow, { borderColor: colors.border }]}>
            <Ionicons color={colors.text} name="time-outline" size={20} />
            <Text style={[styles.switchLabel, { color: colors.text }]}>{t('create.hideTime')}</Text>
            <Switch
              accessibilityLabel={t('create.hideTime')}
              onValueChange={setHideTime}
              thumbColor={hideTime ? colors.surface : colors.textSubtle}
              trackColor={{ false: colors.borderStrong, true: colors.mintStrong }}
              value={hideTime}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/')}
            style={({ pressed }) => [styles.publishButton, { backgroundColor: colors.accent, opacity: pressed ? 0.76 : 1 }]}>
            <Text style={[styles.publishLabel, { color: colors.onAccent }]}>{t('create.publish')}</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
      <CreateRouteTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 18, paddingBottom: 20 },
  header: { minHeight: 58, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 17, lineHeight: 22, fontWeight: '800' },
  stepCount: { width: 64, textAlign: 'right', fontSize: 11, lineHeight: 16 },
  stepper: { minHeight: 86, flexDirection: 'row', alignItems: 'flex-start' },
  stepCell: { flex: 1, alignItems: 'center', gap: 7 },
  stepIcon: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepLabel: { fontSize: 10, lineHeight: 14, fontWeight: '600' },
  upload: { height: 214, marginTop: 4, borderRadius: 18, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  uploadBadge: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  uploadTitle: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  uploadHint: { marginTop: 3, fontSize: 11, lineHeight: 16 },
  optionRow: { minHeight: 52, marginTop: 10, borderRadius: 8, borderWidth: 1, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  optionLabel: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  optionValue: { maxWidth: 140, fontSize: 11, lineHeight: 16 },
  visibilityGrid: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  visibilityCard: { width: '48.8%', minHeight: 64, borderRadius: 8, borderWidth: 1, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 9 },
  visibilityCopy: { flex: 1, minWidth: 0 },
  visibilityTitle: { fontSize: 12, lineHeight: 17, fontWeight: '700' },
  visibilityHint: { fontSize: 10, lineHeight: 14 },
  switchRow: { minHeight: 56, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  switchLabel: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  publishButton: { minWidth: 98, minHeight: 44, marginTop: 14, paddingHorizontal: 22, alignSelf: 'flex-end', borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  publishLabel: { fontSize: 13, lineHeight: 18, fontWeight: '800' },
});

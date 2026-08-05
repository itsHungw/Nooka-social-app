import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { DarkScreen, Photo } from '@/components/nooka/ui';
import { spotShortName } from '@/features/nooka/labels';
import { SPOTS, SPOT_IDS } from '@/features/nooka/spots';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';
import { useNookaDemo } from '@/providers/nooka-demo-provider';

/** Bước 3: một câu caption, chọn nơi đăng, rồi lên feed. */
export default function CaptionScreen() {
  const router = useRouter();
  const { colors } = useNookaTheme();
  const demo = useNookaDemo();

  const post = () => {
    demo.post();
    router.dismissAll();
  };

  return (
    <DarkScreen testID="caption-screen">
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.cameraText }]}>{t('caption.title')}</Text>
        <Text style={[styles.shots, { color: colors.cameraTextMuted }]}>
          {t('camera.shotCount', { count: demo.shots })}
        </Text>
      </View>

      <View style={styles.stage}>
        <View style={[styles.preview, { backgroundColor: colors.cameraSurface }]}>
          <View style={styles.captionAnchor}>
            <TextInput
              accessibilityLabel={t('caption.placeholder')}
              onChangeText={demo.setCaption}
              placeholder={t('caption.placeholder')}
              placeholderTextColor={colors.cameraTextMuted}
              style={[styles.captionInput, { backgroundColor: colors.cameraOverlay, color: colors.cameraText }]}
              value={demo.caption}
            />
          </View>
        </View>
        <View style={styles.dots}>
          {Array.from({ length: Math.max(demo.shots, 1) }, (_, index) => (
            <View
              key={index}
              style={[styles.dot, { backgroundColor: index === 0 ? colors.cameraText : colors.cameraChip }]}
            />
          ))}
        </View>
      </View>

      <View style={styles.controls}>
        <Pressable
          accessibilityLabel={t('common.close')}
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => router.back()}
          style={styles.roundControl}>
          <Ionicons color={colors.cameraText} name="close" size={24} />
        </Pressable>
        <Pressable
          accessibilityLabel={t('caption.post')}
          accessibilityRole="button"
          onPress={post}
          style={({ pressed }) => [styles.postButton, { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 }]}>
          <Ionicons color={colors.onAccent} name="arrow-up" size={28} />
        </Pressable>
        <Pressable
          accessibilityLabel={t('caption.toggleFont')}
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => demo.flash(t('toast.fontChanged'))}
          style={styles.roundControl}>
          <Text style={[styles.fontToggle, { color: colors.cameraText }]}>{t('caption.fontLabel')}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.destinations}
        horizontal
        showsHorizontalScrollIndicator={false}>
        {SPOT_IDS.map((id) => {
          const selected = demo.draftSpot === id;
          return (
            <Pressable
              accessibilityLabel={spotShortName(id)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={id}
              onPress={() => demo.setDraftSpot(id)}
              style={styles.destination}>
              <Photo
                style={[
                  styles.destinationCircle,
                  { borderWidth: 2.5, borderColor: selected ? colors.accent : colors.cameraBorder },
                ]}
                tint={SPOTS[id].photoTint}
              />
              <Text
                numberOfLines={1}
                style={[
                  styles.destinationLabel,
                  { color: selected ? colors.accent : colors.cameraTextMuted, fontWeight: selected ? '700' : '600' },
                ]}>
                {spotShortName(id)}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          accessibilityLabel={t('caption.mapDestination')}
          accessibilityRole="button"
          onPress={() => router.push('/pin')}
          style={styles.destination}>
          <View style={[styles.destinationCircle, styles.destinationMap, { borderColor: colors.cameraBorder }]}>
            <Ionicons color={colors.cameraTextMuted} name="map-outline" size={20} />
          </View>
          <Text numberOfLines={1} style={[styles.destinationLabel, { color: colors.cameraTextMuted }]}>
            {t('caption.mapDestination')}
          </Text>
        </Pressable>
      </ScrollView>
    </DarkScreen>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 40, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 17, lineHeight: 22, fontWeight: '700' },
  shots: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  stage: { flex: 1, minHeight: 0, paddingHorizontal: 20, paddingTop: 18 },
  preview: { flex: 1, minHeight: 0, borderRadius: 30, overflow: 'hidden' },
  captionAnchor: { position: 'absolute', left: 22, right: 22, bottom: 34, alignItems: 'center' },
  captionInput: {
    maxWidth: '100%',
    minHeight: 44,
    borderRadius: 999,
    paddingHorizontal: 20,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  dots: { paddingTop: 14, flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  controls: { paddingHorizontal: 40, paddingTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  roundControl: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  fontToggle: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  postButton: { width: 74, height: 74, borderRadius: 37, alignItems: 'center', justifyContent: 'center' },
  destinations: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 26, gap: 14 },
  destination: { width: 74, alignItems: 'center', gap: 7 },
  destinationCircle: { width: 52, height: 52, borderRadius: 26 },
  destinationMap: { borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  destinationLabel: { maxWidth: 74, fontSize: 11, lineHeight: 15 },
});

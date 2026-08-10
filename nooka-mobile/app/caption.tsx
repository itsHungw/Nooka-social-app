import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { PhotoCropEditor } from '@/components/nooka/photo-crop-editor';
import { DarkScreen, Photo } from '@/components/nooka/ui';
import { audienceCanPost } from '@/features/nooka/checkin-audience';
import { parseHashtags } from '@/features/nooka/checkin-draft';
import { COMPOSER_VISIBILITIES, FRIENDS } from '@/features/nooka/spots';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { useExitCheckin } from '@/hooks/use-exit-checkin';
import { t } from '@/lib/i18n';
import { useNookaDemo } from '@/providers/nooka-demo-provider';

/** Bước 3: một câu caption, chọn nơi đăng, rồi lên feed. */
export default function CaptionScreen() {
  const router = useRouter();
  const { colors } = useNookaTheme();
  const demo = useNookaDemo();
  const exitCheckin = useExitCheckin();
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const activePhoto = demo.draftPhotos[Math.min(activePhotoIndex, Math.max(0, demo.shots - 1))];

  const post = () => {
    if (!audienceCanPost(demo.draftVisibility, demo.draftAudienceFriendIds)) {
      demo.flash(t('toast.chooseAudienceFriend'));
      return;
    }
    if (!demo.post()) return;
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
          {activePhoto ? (
            <PhotoCropEditor
              onChange={(crop) => demo.updateDraftPhotoCrop(activePhoto.id, crop)}
              photo={activePhoto}
            />
          ) : null}
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
          <View pointerEvents="none" style={[styles.cropHint, { backgroundColor: colors.cameraOverlay }]}>
            <Text style={[styles.cropHintText, { color: colors.cameraTextMuted }]}>{t('caption.cropHint')}</Text>
          </View>
        </View>
        <View style={styles.dots}>
          {demo.draftPhotos.map((photo, index) => (
            <Pressable
              accessibilityLabel={t('caption.editPhoto', { count: index + 1 })}
              accessibilityRole="button"
              accessibilityState={{ selected: index === activePhotoIndex }}
              key={photo.id}
              onPress={() => setActivePhotoIndex(index)}
              style={[
                styles.photoThumb,
                { borderColor: index === activePhotoIndex ? colors.accent : colors.cameraBorder },
              ]}>
              <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} />
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.controls}>
        <Pressable
          accessibilityLabel={t('common.close')}
          accessibilityRole="button"
          hitSlop={10}
          onPress={exitCheckin}
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

      <View style={styles.hashtagBlock}>
        <View style={styles.hashtagHeading}>
          <Text style={[styles.hashtagTitle, { color: colors.cameraText }]}>{t('caption.hashtags.title')}</Text>
          <Text style={[styles.hashtagCount, { color: colors.cameraTextMuted }]}>
            {t('caption.hashtags.count', { count: parseHashtags(demo.hashtagText).length })}
          </Text>
        </View>
        <TextInput
          accessibilityLabel={t('caption.hashtags.title')}
          autoCapitalize="none"
          onChangeText={demo.setHashtagText}
          placeholder={t('caption.hashtags.placeholder')}
          placeholderTextColor={colors.cameraTextMuted}
          style={[styles.hashtagInput, { backgroundColor: colors.cameraChip, borderColor: colors.cameraBorder, color: colors.cameraText }]}
          value={demo.hashtagText}
        />
      </View>

      <View style={styles.visibilityBlock}>
        <View style={styles.visibilityHeading}>
          <Ionicons color={colors.cameraTextMuted} name="people-outline" size={16} />
          <Text style={[styles.visibilityTitle, { color: colors.cameraText }]}>{t('caption.visibility.title')}</Text>
        </View>
        <Text style={[styles.visibilityHint, { color: colors.cameraTextMuted }]}>{t('caption.visibility.hint')}</Text>
        <ScrollView
          contentContainerStyle={styles.visibilityOptions}
          horizontal
          showsHorizontalScrollIndicator={false}>
          {COMPOSER_VISIBILITIES.map((visibility) => {
            const selected = demo.draftVisibility === visibility;
            return (
              <Pressable
                accessibilityLabel={t(`caption.visibility.options.${visibility}`)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                key={visibility}
                onPress={() => demo.setDraftVisibility(visibility)}
                style={({ pressed }) => [
                  styles.visibilityOption,
                  {
                    backgroundColor: selected ? colors.accent : colors.cameraChip,
                    borderColor: selected ? colors.accent : colors.cameraBorder,
                    opacity: pressed ? 0.78 : 1,
                  },
                ]}>
                <Text style={[styles.visibilityOptionText, { color: selected ? colors.onAccent : colors.cameraTextMuted }]}>
                  {t(`caption.visibility.options.${visibility}`)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.audienceFriends}
        horizontal
        showsHorizontalScrollIndicator={false}>
        {FRIENDS.map((friend) => {
          const selected = demo.draftAudienceFriendIds.includes(friend.id);
          return (
            <Pressable
              accessibilityLabel={t(`friends.${friend.id}`)}
              accessibilityRole="checkbox"
              accessibilityState={{ selected }}
              key={friend.id}
              onPress={() => demo.toggleDraftAudienceFriend(friend.id)}
              style={styles.audienceFriend}>
              <Photo
                style={[
                  styles.audienceAvatar,
                  { borderWidth: 2.5, borderColor: selected ? colors.accent : colors.cameraBorder },
                ]}
                tint={friend.tint}
              />
              <Text
                numberOfLines={1}
                style={[
                  styles.audienceName,
                  { color: selected ? colors.accent : colors.cameraTextMuted, fontWeight: selected ? '700' : '600' },
                ]}>
                {t(`friends.${friend.id}`)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </DarkScreen>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 40, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 17, lineHeight: 22, fontWeight: '700' },
  shots: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  stage: { flex: 1, minHeight: 230, paddingHorizontal: 20, paddingTop: 18, alignItems: 'center' },
  preview: { flex: 1, maxWidth: '100%', aspectRatio: 4 / 5, borderRadius: 30, overflow: 'hidden' },
  cropHint: { position: 'absolute', left: 14, top: 14, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 },
  cropHintText: { fontSize: 10.5, lineHeight: 14, fontWeight: '600' },
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
  photoThumb: { width: 34, height: 34, borderRadius: 9, borderWidth: 2, overflow: 'hidden' },
  controls: { paddingHorizontal: 40, paddingTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  roundControl: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  fontToggle: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  postButton: { width: 74, height: 74, borderRadius: 37, alignItems: 'center', justifyContent: 'center' },
  visibilityBlock: { paddingTop: 12 },
  hashtagBlock: { paddingHorizontal: 20, paddingTop: 14 },
  hashtagHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hashtagTitle: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  hashtagCount: { fontSize: 11.5, lineHeight: 16, fontWeight: '600' },
  hashtagInput: { minHeight: 42, marginTop: 8, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, fontSize: 13, fontWeight: '600' },
  visibilityHeading: { paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 7 },
  visibilityTitle: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  visibilityHint: { paddingHorizontal: 20, marginTop: 4, fontSize: 11.5, lineHeight: 16, fontWeight: '500' },
  visibilityOptions: { paddingHorizontal: 20, paddingTop: 9, gap: 8 },
  visibilityOption: {
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visibilityOptionText: { fontSize: 12.5, lineHeight: 17, fontWeight: '700' },
  audienceFriends: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 26, gap: 14 },
  audienceFriend: { width: 74, alignItems: 'center', gap: 7 },
  audienceAvatar: { width: 52, height: 52, borderRadius: 26 },
  audienceName: { maxWidth: 74, fontSize: 11, lineHeight: 15 },
});

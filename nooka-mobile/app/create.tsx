import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { DarkScreen } from '@/components/nooka/ui';
import { prepareDraftPhoto } from '@/features/nooka/draft-photo';
import { formatDistance, spotName } from '@/features/nooka/labels';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { useExitCheckin } from '@/hooks/use-exit-checkin';
import { t } from '@/lib/i18n';
import { useNookaDemo } from '@/providers/nooka-demo-provider';

export default function CameraScreen() {
  const router = useRouter();
  const { colors } = useNookaTheme();
  const demo = useNookaDemo();
  const exitCheckin = useExitCheckin();
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [busy, setBusy] = useState(false);

  const next = () => {
    if (demo.shots === 0) {
      demo.flash(t('toast.needPhoto'));
      return;
    }
    router.push('/caption');
  };

  const takePhoto = async () => {
    if (!permission?.granted) {
      await requestPermission();
      return;
    }
    if (!cameraReady || !camera.current || busy || demo.shots >= 5) return;
    setBusy(true);
    try {
      const captured = await camera.current.takePictureAsync({ quality: 1, skipProcessing: false });
      if (!captured) return;
      demo.addDraftPhotos([await prepareDraftPhoto({
        uri: captured.uri,
        width: captured.width,
        height: captured.height,
        contentType: 'image/jpeg',
        fileName: `camera-${Date.now()}.jpg`,
        livePhoto: false,
      })]);
    } catch {
      demo.flash(t('toast.cameraFailed'));
    } finally {
      setBusy(false);
    }
  };

  const pickPhotos = async () => {
    const remaining = 5 - demo.shots;
    if (remaining < 1 || busy) return;
    setBusy(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'livePhotos'],
        allowsMultipleSelection: true,
        orderedSelection: true,
        selectionLimit: remaining,
        quality: 1,
        exif: false,
      });
      if (result.canceled) return;
      const photos = await Promise.all(result.assets.slice(0, remaining).map((asset, index) => prepareDraftPhoto({
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          contentType: asset.mimeType ?? '',
          fileName: asset.fileName ?? `library-${Date.now()}-${index}`,
          livePhoto: Boolean(asset.pairedVideoAsset),
        })));
      demo.addDraftPhotos(photos);
    } catch {
      demo.flash(t('toast.libraryFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <DarkScreen testID="camera-screen">
      <View style={styles.header}>
        <Pressable accessibilityRole="button" hitSlop={10} onPress={exitCheckin}>
          <Text style={[styles.headerAction, { color: colors.cameraTextMuted }]}>{t('common.cancel')}</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.cameraText }]}>{t('camera.title')}</Text>
        <Text style={[styles.headerAction, { color: colors.cameraTextMuted }]}>
          {t('camera.shotCount', { count: demo.shots })}
        </Text>
      </View>

      <View style={styles.stage}>
        <View style={[styles.viewfinder, { backgroundColor: colors.cameraSurface }]}>
          {permission?.granted ? (
            <CameraView
              facing="back"
              mode="picture"
              onCameraReady={() => setCameraReady(true)}
              ref={camera}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={requestPermission}
              style={styles.permissionPrompt}>
              <Text style={[styles.permissionTitle, { color: colors.cameraText }]}>{t('camera.permissionTitle')}</Text>
              <Text style={[styles.permissionBody, { color: colors.cameraTextMuted }]}>{t('camera.permissionBody')}</Text>
            </Pressable>
          )}
          <View style={[styles.spotBar, { backgroundColor: colors.cameraOverlay }]}>
            <View style={[styles.spotDot, { backgroundColor: colors.accent }]} />
            <View style={styles.spotCopy}>
              <Text numberOfLines={1} style={[styles.spotName, { color: colors.cameraText }]}>
                {spotName(demo.draftSpot)}
              </Text>
              <Text style={[styles.spotNote, { color: colors.cameraTextMuted }]}>
                {t('camera.autoLocated', { distance: formatDistance(demo.draft.distanceM) })}
              </Text>
            </View>
            <Pressable accessibilityRole="button" hitSlop={10} onPress={() => router.push('/pin')}>
              <Text style={[styles.change, { color: colors.accent }]}>{t('camera.change')}</Text>
            </Pressable>
          </View>
          <View style={[styles.viewfinderTag, { backgroundColor: colors.cameraOverlay }]}>
            <Text style={[styles.viewfinderTagText, { color: colors.cameraTextMuted }]}>{t('camera.viewfinder')}</Text>
          </View>
        </View>

        <View style={styles.filmstrip}>
          {demo.shots === 0 ? (
            <Text style={[styles.filmstripHint, { color: colors.cameraTextMuted }]}>{t('camera.shootFirst')}</Text>
          ) : demo.draftPhotos.map((photo, index) => (
            <Pressable
              accessibilityLabel={t('camera.removePhoto', { count: index + 1 })}
              accessibilityRole="button"
              key={photo.id}
              onPress={() => demo.removeDraftPhoto(index)}
              style={[styles.thumb, { borderColor: index === demo.shots - 1 ? colors.accent : 'transparent' }]}>
              <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} />
              <View style={[styles.removeBadge, { backgroundColor: colors.cameraOverlay }]}>
                <Text style={[styles.removePhoto, { color: colors.cameraText }]}>×</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.controls}>
        <Pressable
          accessibilityLabel={t('camera.library')}
          accessibilityRole="button"
          disabled={busy || demo.shots >= 5}
          onPress={pickPhotos}
          style={({ pressed }) => [styles.library, { backgroundColor: colors.cameraChip, opacity: pressed ? 0.75 : 1 }]}>
          <Text style={[styles.libraryText, { color: colors.cameraTextMuted }]}>{t('camera.library')}</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={t('camera.shutter')}
          accessibilityRole="button"
          disabled={busy || demo.shots >= 5}
          onPress={takePhoto}
          style={({ pressed }) => [
            styles.shutter,
            { backgroundColor: colors.cameraText, borderColor: colors.cameraBorder, opacity: busy || pressed ? 0.6 : 1 },
          ]}
        />
        <Pressable
          accessibilityLabel={t('common.next')}
          accessibilityRole="button"
          onPress={next}
          style={[styles.nextButton, { backgroundColor: demo.shots > 0 ? colors.accent : colors.cameraChip }]}>
          <Text style={[styles.nextLabel, { color: demo.shots > 0 ? colors.onAccent : colors.cameraTextMuted }]}>
            {t('common.next')}
          </Text>
        </Pressable>
      </View>
    </DarkScreen>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 40, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerAction: { fontSize: 14, lineHeight: 19, fontWeight: '600' },
  title: { fontSize: 17, lineHeight: 22, fontWeight: '800', letterSpacing: -0.4 },
  stage: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  viewfinder: { flex: 1, borderRadius: 28, overflow: 'hidden' },
  permissionPrompt: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  permissionTitle: { fontSize: 16, lineHeight: 22, fontWeight: '700', textAlign: 'center' },
  permissionBody: { marginTop: 7, fontSize: 13, lineHeight: 18, fontWeight: '500', textAlign: 'center' },
  spotBar: { position: 'absolute', left: 14, right: 14, top: 14, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  spotDot: { width: 8, height: 8, borderRadius: 4 },
  spotCopy: { flex: 1, minWidth: 0 },
  spotName: { fontSize: 13.5, lineHeight: 18, fontWeight: '700' },
  spotNote: { marginTop: 2, fontSize: 11.5, lineHeight: 16, fontWeight: '500' },
  change: { fontSize: 12.5, lineHeight: 17, fontWeight: '700' },
  viewfinderTag: { position: 'absolute', left: 14, bottom: 14, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 },
  viewfinderTagText: { fontSize: 11, lineHeight: 15, letterSpacing: 1.3, textTransform: 'uppercase' },
  filmstrip: { minHeight: 59, paddingTop: 13, flexDirection: 'row', alignItems: 'center', gap: 8 },
  filmstripHint: { fontSize: 12.5, lineHeight: 17, fontWeight: '600' },
  thumb: { width: 46, height: 46, borderRadius: 11, borderWidth: 2, overflow: 'hidden' },
  removeBadge: { position: 'absolute', right: 3, top: 3, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  removePhoto: { fontSize: 15, lineHeight: 17, fontWeight: '800' },
  controls: { paddingHorizontal: 30, paddingTop: 14, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  library: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  libraryText: { fontSize: 11, lineHeight: 14, fontWeight: '700', textAlign: 'center' },
  shutter: { width: 74, height: 74, borderRadius: 37, borderWidth: 5 },
  nextButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  nextLabel: { fontSize: 12, lineHeight: 16, fontWeight: '700' },
});

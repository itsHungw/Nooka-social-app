import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, CircleButton, ScreenShell } from '@/components/nooka/ui';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';
import { useNookaDemo } from '@/providers/nooka-demo-provider';

export default function EditProfileScreen() {
  const router = useRouter();
  const { colors } = useNookaTheme();
  const { flash } = useNookaDemo();

  const [name, setName] = useState(t('profile.name'));
  const [username, setUsername] = useState(t('profile.handle'));
  const [location, setLocation] = useState('Binh Thanh');
  const [bio, setBio] = useState(t('profile.bio'));

  const handleSave = () => {
    flash(t('editProfile.savedToast'));
    router.back();
  };

  return (
    <ScreenShell testID="edit-profile-screen">
      {/* Header Bar */}
      <View style={styles.header}>
        <CircleButton accessibilityLabel={t('common.back')} icon="arrow-back" onPress={() => router.back()} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('editProfile.title')}</Text>
        <Button label={t('editProfile.save')} onPress={handleSave} style={styles.saveBtn} tone="primary" />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Avatar Edit Section */}
        <View style={styles.avatarSection}>
          <Pressable
            accessibilityLabel={t('editProfile.changePhoto')}
            accessibilityRole="button"
            onPress={() => flash(t('editProfile.changePhoto'))}
            style={({ pressed }) => [styles.avatarWrap, { opacity: pressed ? 0.8 : 1 }]}>
            <View style={[styles.avatarCircle, { backgroundColor: colors.avatarDefault }]}>
              <Ionicons color={colors.icon} name="person" size={40} />
            </View>
            <View style={[styles.cameraBadge, { backgroundColor: colors.inverseSurface, borderColor: colors.surface }]}>
              <Ionicons color={colors.onInverse} name="camera-outline" size={14} />
            </View>
          </Pressable>
          <Pressable
            accessibilityLabel={t('editProfile.changePhoto')}
            accessibilityRole="button"
            onPress={() => flash(t('editProfile.changePhoto'))}>
            <Text style={[styles.changePhotoText, { color: colors.accentInk }]}>{t('editProfile.changePhoto')}</Text>
          </Pressable>
        </View>

        {/* Form Fields */}
        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{t('editProfile.name')}</Text>
            <TextInput
              onChangeText={setName}
              placeholder={t('editProfile.namePlaceholder')}
              placeholderTextColor={colors.textSubtle}
              style={[
                styles.input,
                { backgroundColor: colors.surfaceMuted, color: colors.text, borderColor: colors.borderSubtle },
              ]}
              value={name}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{t('editProfile.username')}</Text>
            <TextInput
              autoCapitalize="none"
              onChangeText={setUsername}
              placeholder={t('editProfile.usernamePlaceholder')}
              placeholderTextColor={colors.textSubtle}
              style={[
                styles.input,
                { backgroundColor: colors.surfaceMuted, color: colors.text, borderColor: colors.borderSubtle },
              ]}
              value={username}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{t('editProfile.location')}</Text>
            <TextInput
              onChangeText={setLocation}
              placeholder={t('editProfile.locationPlaceholder')}
              placeholderTextColor={colors.textSubtle}
              style={[
                styles.input,
                { backgroundColor: colors.surfaceMuted, color: colors.text, borderColor: colors.borderSubtle },
              ]}
              value={location}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{t('editProfile.bio')}</Text>
            <TextInput
              multiline
              numberOfLines={3}
              onChangeText={setBio}
              placeholder={t('editProfile.bioPlaceholder')}
              placeholderTextColor={colors.textSubtle}
              style={[
                styles.input,
                styles.textArea,
                { backgroundColor: colors.surfaceMuted, color: colors.text, borderColor: colors.borderSubtle },
              ]}
              value={bio}
            />
          </View>
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  headerTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
  },
  saveBtn: {
    minHeight: 36,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 24,
  },
  avatarSection: {
    alignItems: 'center',
    gap: 10,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePhotoText: {
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: '700',
  },
  form: {
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  input: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '500',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});

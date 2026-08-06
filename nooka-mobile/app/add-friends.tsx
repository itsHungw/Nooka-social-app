import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Photo, ScreenShell, SectionLabel } from '@/components/nooka/ui';
import { spotDistrict, spotName } from '@/features/nooka/labels';
import { FRIENDS, type FriendId, type PhotoTint, type SpotId } from '@/features/nooka/spots';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';
import { useNookaDemo } from '@/providers/nooka-demo-provider';

type SuggestedUser = {
  id: string;
  name: string;
  handle: string;
  tint: PhotoTint;
  mutual: number;
};

const SUGGESTIONS: SuggestedUser[] = [
  { id: 'an', name: 'An Tran', handle: '@antran', tint: 'photoWarm', mutual: 8 },
  { id: 'minh', name: 'Minh Pham', handle: '@minhpham', tint: 'photoSand', mutual: 4 },
  { id: 'thu', name: 'Thu Ha', handle: '@thuha', tint: 'photoSage', mutual: 12 },
];

export default function AddFriendsScreen() {
  const router = useRouter();
  const { colors } = useNookaTheme();
  const { flash } = useNookaDemo();

  const [query, setQuery] = useState('');
  const [requested, setRequested] = useState<string[]>([]);

  const toggleRequest = (id: string) => {
    setRequested((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const filteredSuggestions = SUGGESTIONS.filter(
    (user) =>
      user.name.toLowerCase().includes(query.toLowerCase()) ||
      user.handle.toLowerCase().includes(query.toLowerCase()),
  );

  const filteredFriends = FRIENDS.filter((friend) =>
    t(`friends.${friend.id}`).toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <ScreenShell testID="add-friends-screen">
      {/* Header Bar */}
      <View style={styles.header}>
        <Pressable
          accessibilityLabel={t('common.back')}
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}>
          <Ionicons color={colors.text} name="arrow-back" size={20} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('addFriends.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchWrap}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <Ionicons color={colors.icon} name="search-outline" size={18} />
          <TextInput
            onChangeText={setQuery}
            placeholder={t('addFriends.searchPlaceholder')}
            placeholderTextColor={colors.textSubtle}
            style={[styles.searchInput, { color: colors.text }]}
            value={query}
          />
          {query.length > 0 && (
            <Pressable accessibilityLabel={t('common.close')} accessibilityRole="button" onPress={() => setQuery('')}>
              <Ionicons color={colors.textMuted} name="close-circle" size={16} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Quick Action Cards */}
        <View style={styles.actionsRow}>
          <Pressable
            accessibilityLabel={t('addFriends.shareLink')}
            accessibilityRole="button"
            onPress={() => flash(t('addFriends.copiedToast'))}
            style={({ pressed }) => [
              styles.actionCard,
              { backgroundColor: colors.surfaceMuted, borderColor: colors.borderSubtle, opacity: pressed ? 0.8 : 1 },
            ]}>
            <View style={[styles.actionIconCircle, { backgroundColor: colors.surface }]}>
              <Ionicons color={colors.accentInk} name="share-social-outline" size={20} />
            </View>
            <View style={styles.actionTextWrap}>
              <Text style={[styles.actionTitle, { color: colors.text }]}>{t('addFriends.shareLink')}</Text>
              <Text numberOfLines={1} style={[styles.actionDesc, { color: colors.textMuted }]}>
                {t('addFriends.inviteDesc')}
              </Text>
            </View>
          </Pressable>

          <Pressable
            accessibilityLabel={t('addFriends.syncContacts')}
            accessibilityRole="button"
            onPress={() => flash(t('addFriends.syncContacts'))}
            style={({ pressed }) => [
              styles.actionCard,
              { backgroundColor: colors.surfaceMuted, borderColor: colors.borderSubtle, opacity: pressed ? 0.8 : 1 },
            ]}>
            <View style={[styles.actionIconCircle, { backgroundColor: colors.surface }]}>
              <Ionicons color={colors.accentInk} name="people-outline" size={20} />
            </View>
            <View style={styles.actionTextWrap}>
              <Text style={[styles.actionTitle, { color: colors.text }]}>{t('addFriends.syncContacts')}</Text>
              <Text numberOfLines={1} style={[styles.actionDesc, { color: colors.textMuted }]}>
                {t('addFriends.syncDesc')}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Suggestions Section */}
        {filteredSuggestions.length > 0 && (
          <View style={styles.section}>
            <SectionLabel>{t('addFriends.suggestions')}</SectionLabel>
            <View style={styles.userList}>
              {filteredSuggestions.map((user) => {
                const isRequested = requested.includes(user.id);
                return (
                  <View key={user.id} style={styles.userRow}>
                    <Photo style={styles.avatarPhoto} tint={user.tint} />
                    <View style={styles.userCopy}>
                      <Text style={[styles.userName, { color: colors.text }]}>{user.name}</Text>
                      <Text style={[styles.userHandle, { color: colors.textMuted }]}>
                        {user.handle} · {t('addFriends.mutualFriends', { count: user.mutual })}
                      </Text>
                    </View>
                    <Pressable
                      accessibilityLabel={isRequested ? t('addFriends.requested') : t('addFriends.add')}
                      accessibilityRole="button"
                      onPress={() => toggleRequest(user.id)}
                      style={({ pressed }) => [
                        styles.addPillBtn,
                        {
                          backgroundColor: isRequested ? colors.surfaceMuted : colors.inverseSurface,
                          borderColor: isRequested ? colors.borderSubtle : colors.inverseSurface,
                          opacity: pressed ? 0.75 : 1,
                        },
                      ]}>
                      <Text style={[styles.addPillText, { color: isRequested ? colors.textMuted : colors.onInverse }]}>
                        {isRequested ? t('addFriends.requested') : t('addFriends.add')}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Your Friends List Section */}
        <View style={styles.section}>
          <SectionLabel>{t('addFriends.yourFriends', { count: FRIENDS.length })}</SectionLabel>
          <View style={styles.userList}>
            {filteredFriends.map((friend) => {
              const name = t(`friends.${friend.id as FriendId}`);
              const spot = spotName(friend.spot as SpotId);
              const district = spotDistrict(friend.spot as SpotId);
              return (
                <View key={friend.id} style={styles.userRow}>
                  <Photo style={styles.avatarPhoto} tint={friend.tint} />
                  <View style={styles.userCopy}>
                    <View style={styles.friendNameRow}>
                      <Text style={[styles.userName, { color: colors.text }]}>{name}</Text>
                      {friend.live && <View style={[styles.liveDot, { backgroundColor: colors.accentStrong }]} />}
                    </View>
                    <Text numberOfLines={1} style={[styles.userHandle, { color: colors.textMuted }]}>
                      {spot} · {district}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityLabel={t('spot.viewSpot')}
                    accessibilityRole="button"
                    onPress={() => router.push({ pathname: '/spot/[id]', params: { id: friend.spot } })}
                    style={({ pressed }) => [
                      styles.spotBtn,
                      { backgroundColor: colors.surfaceMuted, opacity: pressed ? 0.75 : 1 },
                    ]}>
                    <Text style={[styles.spotBtnText, { color: colors.text }]}>{t('spot.viewSpot')}</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
  },
  headerSpacer: {
    width: 36,
  },
  searchWrap: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 10,
  },
  searchBox: {
    minHeight: 44,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '500',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 32,
    gap: 20,
  },
  actionsRow: {
    gap: 10,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  actionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  actionTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
  },
  actionDesc: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  section: {
    gap: 12,
  },
  userList: {
    gap: 8,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  avatarPhoto: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  userCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  friendNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 14.5,
    lineHeight: 20,
    fontWeight: '700',
  },
  userHandle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  addPillBtn: {
    minHeight: 32,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPillText: {
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '700',
  },
  spotBtn: {
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotBtnText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
});

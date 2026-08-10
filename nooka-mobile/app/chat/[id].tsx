import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, CircleButton, Photo, ScreenShell } from '@/components/nooka/ui';
import { spotDistrict, spotName, wantToGoLabel } from '@/features/nooka/labels';
import { FRIENDS, SPOTS, type FriendId, type SpotId } from '@/features/nooka/spots';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';
import { useNookaDemo } from '@/providers/nooka-demo-provider';

type ChatMsg = {
  id: string;
  sender: 'other' | 'me';
  text: string;
  spotId?: SpotId;
  spotBadge?: string;
  seenTime?: string;
};

export default function ChatThreadScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors } = useNookaTheme();
  const demo = useNookaDemo();

  const friendId = (params.id ?? 'linh') as FriendId;
  const friendObj = FRIENDS.find((f) => f.id === friendId);
  const friendName = friendObj ? t(`friends.${friendObj.id as FriendId}`) : (params.id ?? 'Linh');

  const isOnline = friendObj?.live ?? true;
  const onlineStatus = isOnline ? t('chat.onlineNow') : t('chat.activeAgo', { time: '5m' });

  const [optionsVisible, setOptionsVisible] = useState(false);
  const [inputMsg, setInputMsg] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: 'm1',
      sender: 'other',
      text: t('chat.linhMsg1'),
    },
    {
      id: 'm2',
      sender: 'me',
      text: t('chat.myMsg1'),
    },
    {
      id: 'm3',
      sender: 'other',
      text: t('chat.linhMsg2'),
    },
    {
      id: 'm4',
      sender: 'other',
      text: '',
      spotId: 'bloom',
      spotBadge: t('chat.spotPreviewBadge'),
    },
    {
      id: 'm5',
      sender: 'other',
      text: t('chat.linhMsg3'),
      seenTime: '14:02',
    },
  ]);

  const handleSend = () => {
    if (!inputMsg.trim()) return;
    const newMsg: ChatMsg = {
      id: String(Date.now()),
      sender: 'me',
      text: inputMsg.trim(),
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputMsg('');
  };

  const openSpot = (spotId: SpotId) => {
    router.push({ pathname: '/spot/[id]', params: { id: spotId } });
  };

  return (
    <ScreenShell testID="chat-thread-screen">
      {/* Header Bar */}
      <View style={styles.header}>
        <CircleButton
          accessibilityLabel={t('common.back')}
          icon="chevron-back"
          onPress={() => router.back()}
          tone="muted"
        />

        <View style={styles.headerUser}>
          <Photo style={styles.headerAvatar} tint="photoWarm" />
          <View style={styles.headerCopy}>
            <Text style={[styles.headerName, { color: colors.text }]}>{friendName}</Text>
            <View style={styles.statusRow}>
              {isOnline && <View style={[styles.onlineDot, { backgroundColor: colors.online }]} />}
              <Text style={[styles.headerSubtext, { color: isOnline ? colors.text : colors.textMuted }]}>
                {onlineStatus}
              </Text>
            </View>
          </View>
        </View>

        <CircleButton
          accessibilityLabel={t('chat.optionsTitle')}
          icon="ellipsis-horizontal"
          onPress={() => setOptionsVisible(true)}
          tone="muted"
        />
      </View>

      {/* Pinned Spot Header Banner */}
      <View style={[styles.pinnedBanner, { backgroundColor: colors.surfaceMuted, borderColor: colors.borderSubtle }]}>
        <View style={styles.pinnedCopy}>
          <Text style={[styles.pinnedName, { color: colors.text }]}>{spotName('workshop')}</Text>
          <Text style={[styles.pinnedSubtext, { color: colors.textMuted }]}>{t('chat.pinnedSpotDesc')}</Text>
        </View>
        <Button
          label={wantToGoLabel(demo.isBeen('workshop'), demo.wantsToGo('workshop'))}
          onPress={() => demo.toggleWantToGo('workshop')}
          selected={demo.wantsToGo('workshop')}
          style={styles.pinnedBtn}
          tone={demo.wantsToGo('workshop') ? 'soft' : 'primary'}
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
        style={styles.flexFill}>
        <ScrollView contentContainerStyle={styles.threadList} showsVerticalScrollIndicator={false}>
          {/* Date Tag */}
          <View style={styles.dateWrap}>
            <View style={[styles.dateChip, { backgroundColor: colors.surfaceMuted }]}>
              <Text style={[styles.dateText, { color: colors.textMuted }]}>{t('chat.today')}</Text>
            </View>
          </View>

          {/* Messages Timeline */}
          {messages.map((item) => {
            const isMe = item.sender === 'me';

            return (
              <View key={item.id} style={isMe ? styles.msgRowMe : styles.msgRowOther}>
                {item.text ? (
                  <View
                    style={[
                      styles.bubble,
                      isMe
                        ? [styles.bubbleMe, { backgroundColor: colors.inverseSurface }]
                        : [styles.bubbleOther, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }],
                    ]}>
                    <Text
                      style={[
                        styles.bubbleText,
                        { color: isMe ? colors.onInverse : colors.text },
                      ]}>
                      {item.text}
                    </Text>
                  </View>
                ) : null}

                {/* Embedded Spot Preview Card */}
                {item.spotId ? (
                  <Pressable
                    accessibilityLabel={spotName(item.spotId)}
                    accessibilityRole="button"
                    onPress={() => openSpot(item.spotId!)}
                    style={({ pressed }) => [
                      styles.spotCard,
                      { backgroundColor: colors.inverseSurface, opacity: pressed ? 0.85 : 1 },
                    ]}>
                    <Photo style={styles.spotPhoto} tint={SPOTS[item.spotId].photoTint} />
                    <View style={styles.spotCardCopy}>
                      <Text style={[styles.spotCardName, { color: colors.onInverse }]}>{spotName(item.spotId)}</Text>
                      <Text style={[styles.spotCardMeta, { color: colors.captionText }]}>
                        {spotDistrict(item.spotId)} · {t('tags.niceView')}
                      </Text>
                      {item.spotBadge && (
                        <Text style={[styles.spotCardBadge, { color: colors.accent }]}>{item.spotBadge}</Text>
                      )}
                    </View>
                  </Pressable>
                ) : null}

                {/* Status Timestamp */}
                {item.seenTime && (
                  <View style={styles.seenRow}>
                    <Ionicons color={colors.textSubtle} name="checkmark" size={13} />
                    <Text style={[styles.seenText, { color: colors.textSubtle }]}>
                      {t('chat.seenStatus', { time: item.seenTime })}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>

        {/* Composer Bar */}
        <View
          style={[
            styles.composer,
            {
              backgroundColor: colors.background,
              borderColor: colors.borderSubtle,
              paddingBottom: Math.max(insets.bottom, 8),
            },
          ]}>
          <Pressable
            accessibilityLabel={t('common.optional')}
            accessibilityRole="button"
            onPress={() => demo.flash('Camera & Media')}
            style={({ pressed }) => [styles.attachBtn, { opacity: pressed ? 0.7 : 1 }]}>
            <Ionicons color={colors.text} name="add" size={24} />
          </Pressable>

          <TextInput
            onChangeText={setInputMsg}
            onSubmitEditing={handleSend}
            placeholder={t('chat.inputPlaceholder', { name: friendName })}
            placeholderTextColor={colors.textSubtle}
            style={[styles.inputField, { backgroundColor: colors.surfaceMuted, color: colors.text }]}
            value={inputMsg}
          />

          <Pressable
            accessibilityLabel={t('common.done')}
            accessibilityRole="button"
            onPress={handleSend}
            style={({ pressed }) => [
              styles.sendBtn,
              { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 },
            ]}>
            <Ionicons color={colors.onAccent} name="send" size={18} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <Modal animationType="slide" onRequestClose={() => setOptionsVisible(false)} transparent visible={optionsVisible}>
        <Pressable onPress={() => setOptionsVisible(false)} style={[styles.sheetScrim, { backgroundColor: colors.scrim }]}>
          <Pressable onPress={(e) => e.stopPropagation()} style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.sheetGrip, { backgroundColor: colors.border }]} />

            <View style={styles.sheetHeader}>
              <Photo style={styles.sheetAvatar} tint="photoWarm" />
              <Text style={[styles.sheetName, { color: colors.text }]}>{friendName}</Text>
              <Text style={[styles.sheetSubtext, { color: colors.textMuted }]}>@{friendId}</Text>
            </View>

            <View style={styles.sheetOptions}>
              <Pressable
                onPress={() => {
                  setOptionsVisible(false);
                  demo.flash(t('chat.nicknameUpdated', { name: friendName }));
                }}
                style={({ pressed }) => [styles.optionRow, { opacity: pressed ? 0.7 : 1 }]}>
                <Ionicons color={colors.text} name="create-outline" size={20} />
                <Text style={[styles.optionLabel, { color: colors.text }]}>{t('chat.changeNickname')}</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setOptionsVisible(false);
                  demo.flash(t('chat.changeWallpaper'));
                }}
                style={({ pressed }) => [styles.optionRow, { opacity: pressed ? 0.7 : 1 }]}>
                <Ionicons color={colors.text} name="image-outline" size={20} />
                <Text style={[styles.optionLabel, { color: colors.text }]}>{t('chat.changeWallpaper')}</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setOptionsVisible(false);
                  demo.flash(t('chat.muteNotifications'));
                }}
                style={({ pressed }) => [styles.optionRow, { opacity: pressed ? 0.7 : 1 }]}>
                <Ionicons color={colors.text} name="notifications-off-outline" size={20} />
                <Text style={[styles.optionLabel, { color: colors.text }]}>{t('chat.muteNotifications')}</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setOptionsVisible(false);
                  demo.flash(t('chat.blockedToast', { name: friendName }));
                }}
                style={({ pressed }) => [styles.optionRow, { opacity: pressed ? 0.7 : 1 }]}>
                <Ionicons color={colors.accentStrong} name="ban-outline" size={20} />
                <Text style={[styles.optionLabel, { color: colors.accentStrong }]}>{t('chat.blockUser')}</Text>
              </Pressable>
            </View>

            <Button label={t('common.done')} onPress={() => setOptionsVisible(false)} tone="soft" />
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  flexFill: {
    flex: 1,
  },
  header: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  headerUser: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  headerCopy: {
    flex: 1,
  },
  headerName: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  headerSubtext: {
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '500',
  },
  pinnedBanner: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  pinnedCopy: {
    flex: 1,
    gap: 2,
  },
  pinnedName: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
  },
  pinnedSubtext: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  pinnedBtn: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  threadList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
    gap: 12,
  },
  dateWrap: {
    alignItems: 'center',
    marginVertical: 4,
  },
  dateChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  dateText: {
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '600',
  },
  msgRowOther: {
    alignSelf: 'flex-start',
    maxWidth: '85%',
    gap: 4,
  },
  msgRowMe: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    gap: 4,
  },
  bubble: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bubbleOther: {
    borderBottomLeftRadius: 6,
    borderWidth: 1,
  },
  bubbleMe: {
    borderBottomRightRadius: 6,
  },
  bubbleText: {
    fontSize: 14.5,
    lineHeight: 20,
    fontWeight: '500',
  },
  spotCard: {
    width: 240,
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 4,
  },
  spotPhoto: {
    width: '100%',
    height: 120,
  },
  spotCardCopy: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 3,
  },
  spotCardName: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  spotCardMeta: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  spotCardBadge: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  seenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    marginTop: 2,
  },
  seenText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
    borderTopWidth: 1,
  },
  attachBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputField: {
    flex: 1,
    minHeight: 40,
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: '500',
  },

  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScrim: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
    gap: 16,
  },
  sheetGrip: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
  },
  sheetHeader: {
    alignItems: 'center',
    gap: 4,
  },
  sheetAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 4,
  },
  sheetName: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
  },
  sheetSubtext: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  sheetOptions: {
    gap: 4,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  optionLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
});

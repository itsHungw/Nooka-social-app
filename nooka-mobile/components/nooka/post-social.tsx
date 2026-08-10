import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { spotName } from '@/features/nooka/labels';
import type { FeedPost, PostVisibility } from '@/features/nooka/spots';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';
import { useNookaDemo } from '@/providers/nooka-demo-provider';

export function PostSocialActions({ post, onComment, compact = false }: {
  post: FeedPost;
  onComment: () => void;
  compact?: boolean;
}) {
  const demo = useNookaDemo();
  const reacted = demo.isPostReacted(post.id);
  const reactionCount = post.reactionCount + (reacted ? 1 : 0);
  const commentCount = demo.postCommentCount(post);
  const author = post.friend ? t(`friends.${post.friend}`) : t('feed.you');

  const sharePost = async () => {
    try {
      const caption = post.captionKey ? t(post.captionKey) : (post.caption ?? '');
      const result = await Share.share({
        message: String(t('feed.shareMessage', { author, spot: spotName(post.spot), caption })),
      });
      if (result.action === Share.sharedAction) demo.flash(t('toast.postShared'));
    } catch {
      demo.flash(t('toast.shareFailed'));
    }
  };

  return (
    <View style={[styles.socialRow, compact && styles.socialRowCompact]}>
      <SocialAction
        accessibilityLabel={t('feed.reactionAccessibility', { count: reactionCount })}
        count={reactionCount}
        icon={reacted ? 'heart' : 'heart-outline'}
        label={t('actions.react')}
        onPress={() => demo.togglePostReaction(post.id)}
        selected={reacted}
      />
      <SocialAction
        accessibilityLabel={t('feed.commentAccessibility', { count: commentCount })}
        count={commentCount}
        icon="chatbubble-outline"
        label={t('actions.comment')}
        onPress={onComment}
      />
      {post.visibility === 'PUBLIC' ? (
        <SocialAction
          accessibilityLabel={t('actions.share')}
          icon="arrow-redo-outline"
          label={t('actions.share')}
          onPress={() => void sharePost()}
        />
      ) : null}
    </View>
  );
}

function SocialAction({ icon, label, count, onPress, selected, accessibilityLabel }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  count?: number;
  onPress: () => void;
  selected?: boolean;
  accessibilityLabel: string;
}) {
  const { colors } = useNookaTheme();
  const color = selected ? colors.accentInk : colors.textMuted;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={selected === undefined ? undefined : { selected }}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [styles.socialAction, { backgroundColor: pressed ? colors.surfacePressed : 'transparent' }]}>
      <Ionicons color={color} name={icon} size={19} />
      <Text numberOfLines={1} style={[styles.socialLabel, { color }]}>{label}</Text>
      {count === undefined ? null : <Text style={[styles.socialCount, { color }]}>{String(count)}</Text>}
    </Pressable>
  );
}

export function PostVisibilityBadge({ visibility }: { visibility: PostVisibility }) {
  const { colors } = useNookaTheme();
  const icon: Record<PostVisibility, keyof typeof Ionicons.glyphMap> = {
    PUBLIC: 'earth-outline',
    FOLLOWERS: 'people-outline',
    CLOSE_FRIENDS: 'star-outline',
    PRIVATE: 'lock-closed-outline',
  };

  return (
    <View style={[styles.visibilityBadge, { backgroundColor: colors.surfaceMuted }]}>
      <Ionicons color={colors.textMuted} name={icon[visibility]} size={12} />
      <Text style={[styles.visibilityText, { color: colors.textMuted }]}>
        {t(`caption.visibility.options.${visibility}`)}
      </Text>
    </View>
  );
}

export function CommentSheet({ post, visible, onClose }: {
  post: FeedPost | null;
  visible: boolean;
  onClose: () => void;
}) {
  const { colors } = useNookaTheme();
  const demo = useNookaDemo();
  const [body, setBody] = useState('');

  useEffect(() => setBody(''), [post?.id]);

  const submit = () => {
    if (!post || !body.trim()) return;
    demo.addPostComment(post.id, body);
    setBody('');
  };

  const comments = post ? demo.postComments(post.id) : [];
  const author = post?.friend ? t(`friends.${post.friend}`) : t('feed.you');

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible && Boolean(post)}>
      <View style={styles.modalRoot}>
        <Pressable accessibilityLabel={t('common.close')} accessibilityRole="button" onPress={onClose} style={[styles.backdrop, { backgroundColor: colors.scrim }]} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetAnchor}>
          <View accessibilityViewIsModal style={[styles.commentSheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.sheetGrip, { backgroundColor: colors.border }]} />
            <View style={styles.commentHeader}>
              <View style={styles.commentHeaderCopy}>
                <Text style={[styles.commentTitle, { color: colors.text }]}>{t('comments.title')}</Text>
                <Text numberOfLines={1} style={[styles.commentContext, { color: colors.textMuted }]}>
                  {t('comments.context', { author, spot: post ? spotName(post.spot) : '' })}
                </Text>
              </View>
              <Pressable
                accessibilityLabel={t('common.close')}
                accessibilityRole="button"
                hitSlop={8}
                onPress={onClose}
                style={styles.closeButton}>
                <Ionicons color={colors.text} name="close" size={21} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.commentList} keyboardShouldPersistTaps="handled">
              {(post?.commentCount ?? 0) > 0 ? (
                <>
                  <CommentRow author={t('comments.sample.one.author')} body={t('comments.sample.one.body')} />
                  {(post?.commentCount ?? 0) > 1 ? (
                    <CommentRow author={t('comments.sample.two.author')} body={t('comments.sample.two.body')} />
                  ) : null}
                </>
              ) : (
                <Text style={[styles.commentEmpty, { color: colors.textMuted }]}>{t('comments.empty')}</Text>
              )}
              {comments.map((comment, index) => (
                <CommentRow author={t('feed.you')} body={comment} key={`${post?.id}-${index}`} mine />
              ))}
            </ScrollView>

            <View style={[styles.composer, { borderColor: colors.borderSubtle }]}>
              <View style={[styles.composerAvatar, { backgroundColor: colors.avatarDefault }]} />
              <TextInput
                accessibilityLabel={t('comments.placeholder')}
                multiline
                onChangeText={setBody}
                placeholder={t('comments.placeholder')}
                placeholderTextColor={colors.textSubtle}
                style={[styles.commentInput, { backgroundColor: colors.surfaceMuted, color: colors.text }]}
                value={body}
              />
              <Pressable
                accessibilityLabel={t('comments.send')}
                accessibilityRole="button"
                accessibilityState={{ disabled: !body.trim() }}
                disabled={!body.trim()}
                onPress={submit}
                style={({ pressed }) => [
                  styles.sendButton,
                  { backgroundColor: body.trim() ? colors.inverseSurface : colors.surfaceMuted, opacity: pressed ? 0.75 : 1 },
                ]}>
                <Ionicons color={body.trim() ? colors.onInverse : colors.textSubtle} name="arrow-up" size={18} />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function CommentRow({ author, body, mine = false }: { author: string; body: string; mine?: boolean }) {
  const { colors } = useNookaTheme();
  return (
    <View style={styles.commentRow}>
      <View style={[styles.commentAvatar, { backgroundColor: mine ? colors.accentSoft : colors.avatarDefault }]} />
      <View style={styles.commentCopy}>
        <Text style={[styles.commentAuthor, { color: colors.text }]}>{author}</Text>
        <Text style={[styles.commentBody, { color: colors.text }]}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  socialRow: { width: '100%', minHeight: 48, flexDirection: 'row' },
  socialRowCompact: { minHeight: 42 },
  socialAction: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  socialLabel: { fontSize: 12.5, lineHeight: 17, fontWeight: '600' },
  socialCount: { fontSize: 11.5, lineHeight: 16, fontWeight: '600' },
  visibilityBadge: {
    minHeight: 26,
    borderRadius: 999,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  visibilityText: { fontSize: 10.5, lineHeight: 14, fontWeight: '700' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheetAnchor: { justifyContent: 'flex-end' },
  commentSheet: { maxHeight: '82%', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 10 },
  sheetGrip: { width: 42, height: 4, borderRadius: 2, alignSelf: 'center' },
  commentHeader: { minHeight: 64, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  commentHeaderCopy: { flex: 1, minWidth: 0 },
  commentTitle: { fontSize: 20, lineHeight: 26, fontWeight: '800', letterSpacing: -0.4 },
  commentContext: { marginTop: 2, fontSize: 12.5, lineHeight: 17, fontWeight: '500' },
  closeButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  commentList: { minHeight: 190, paddingHorizontal: 20, paddingTop: 6, paddingBottom: 18, gap: 16 },
  commentEmpty: { paddingVertical: 42, textAlign: 'center', fontSize: 14, lineHeight: 21, fontWeight: '500' },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  commentAvatar: { width: 32, height: 32, borderRadius: 16 },
  commentCopy: { flex: 1, minWidth: 0 },
  commentAuthor: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  commentBody: { marginTop: 2, fontSize: 13.5, lineHeight: 20, fontWeight: '500' },
  composer: { borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, flexDirection: 'row', alignItems: 'flex-end', gap: 9 },
  composerAvatar: { width: 32, height: 32, borderRadius: 16, marginBottom: 4 },
  commentInput: { flex: 1, minHeight: 42, maxHeight: 96, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, lineHeight: 20 },
  sendButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
});

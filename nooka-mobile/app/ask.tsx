import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NookaSprite } from '@/components/nooka/nooka-sprite';
import { Chip, CircleButton, ResultRow, ScreenShell } from '@/components/nooka/ui';
import { checkinLine, formatDistance, spotName, tagLabel, tagSynonyms } from '@/features/nooka/labels';
import { MASCOT_MOVE, isWaiting, type MascotState } from '@/features/nooka/mascot';
import { explainTags, matchTags, rankSpots, spotTags } from '@/features/nooka/ranking';
import { INTENT_IDS, SPOTS, TAG_IDS, type IntentId, type SpotId, type TagId } from '@/features/nooka/spots';
import { useMascotStage } from '@/hooks/use-mascot-stage';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';
import { useNookaDemo } from '@/providers/nooka-demo-provider';

/**
 * Hỏi Nooka — Intent Mode (§4 và §6.2 của spec), dựng thành một đoạn hội thoại.
 *
 * Vì sao là chat chứ không phải form: **trí nhớ**. Bản form cũ coi mỗi câu hỏi
 * là một lần bắt đầu lại, muốn sửa một ý phải gõ lại cả câu. Ở đây tag của lượt
 * trước vẫn còn hiệu lực nên hỏi tiếp là thu hẹp thêm, không phải hỏi lại.
 *
 * **Ranh giới AI là ràng buộc hình thức, không phải một dòng chữ nhỏ.** Lượt của
 * Nooka chỉ nói nó vừa làm gì — đọc bao nhiêu review, hiểu ra tag nào, còn mấy
 * chỗ. Mọi câu mô tả một quán đều nằm trong `ResultRow` và thuộc về người thật.
 * Thêm một câu kiểu "chỗ này hợp để làm việc" vào bong bóng là phá đúng thứ
 * §6.2 khoá.
 */

type Turn =
  | { kind: 'ask'; id: number; text: string }
  | { kind: 'answer'; id: number; tags: TagId[]; spots: SpotId[]; read: number };

/**
 * Nooka ở thanh nhắn tin có **một** lớp phủ và hai điểm neo, không phải hai chỗ
 * dựng riêng: chỗ ở là bên trái ô nhập, chỗ trốn là sau ô nhập. Đi từ chỗ này
 * sang chỗ kia là một phép dịch trên chính lớp đó — dựng hai nơi thì lúc chuyển
 * là một con biến mất và một con hiện ra, không ai đọc ra đó là cùng nhân vật.
 *
 * **Ô nhập không đổi kích cỡ.** Chỗ của Nooka được chừa cứng bằng `paddingLeft`
 * trong `inputRow`; Nooka đi hay trốn thì ô nhập vẫn đúng bề ngang đó. Ô nhập
 * co giãn theo bước chân của một món trang trí là thứ mắt bắt được ngay, và nó
 * kéo theo cả nút gửi nhích qua nhích lại.
 */
const MASCOT_SIZE = 46;
/** Bề ngang chừa cho Nooka bên trái ô nhập, tính cả khoảng thở. */
const MASCOT_SLOT = MASCOT_SIZE + 10;
/**
 * Chỗ trốn lệch so với chỗ ở: đi ngang hẳn vào vùng ô nhập rồi mới nhô lên.
 * `x` phải vượt qua `MASCOT_SLOT` — chưa qua khỏi mép trái ô nhập thì không có
 * gì che, và cú nhô lên diễn ra giữa thanh trống.
 */
const BEHIND_OFFSET = { x: MASCOT_SLOT + 10, y: 30 };

export default function AskNookaScreen() {
  const router = useRouter();
  const { colors } = useNookaTheme();
  const insets = useSafeAreaInsets();
  const demo = useNookaDemo();
  const scroller = useRef<ScrollView>(null);
  const nextId = useRef(0);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [tags, setTags] = useState<TagId[]>([]);
  const [mascot, setMascot] = useState<MascotState>('idle');

  const synonyms = useMemo(() => tagSynonyms(TAG_IDS), []);
  const answered = turns.length > 0;
  const padBottom = Math.max(insets.bottom, 6) + 16;

  // Chờ thì Nooka được đi lang thang; đang đọc review hay vừa reo mừng thì
  // `useMascotStage` giữ nó ở bên trái ô nhập để còn thấy nó đang làm gì.
  const stage = useMascotStage(isWaiting(mascot));
  const behind = stage.spot === 'behind';

  // Hai đoạn, **không bao giờ chạy cùng lúc**: đi ngang vào sau ô nhập rồi mới
  // nhô lên; và hạ xuống hết rồi mới đi ngang về. Chạy song song thì Nooka đi
  // chéo và cú lên xuống lộ ra ngay bên trái ô nhập, chỗ chẳng có gì che.
  const walked = useSharedValue(0);
  const lifted = useSharedValue(0);
  useEffect(() => {
    const { walk: walkMs, lift: liftMs } = MASCOT_MOVE;
    if (behind) {
      walked.value = withTiming(1, { duration: walkMs });
      lifted.value = withDelay(walkMs, withTiming(1, { duration: liftMs }));
      return;
    }
    lifted.value = withTiming(0, { duration: liftMs });
    walked.value = withDelay(liftMs, withTiming(0, { duration: walkMs }));
  }, [behind, walked, lifted]);

  const walk = useAnimatedStyle(() => ({
    transform: [
      { translateX: walked.value * BEHIND_OFFSET.x },
      { translateY: -lifted.value * BEHIND_OFFSET.y },
    ],
  }));

  useEffect(() => () => {
    if (pending.current) clearTimeout(pending.current);
  }, []);

  /** Xếp hạng lại với tập tag hiện có rồi nối một lượt trả lời. */
  const answer = useCallback(
    (nextTags: TagId[]) => {
      const spots = rankSpots(nextTags, demo.extraTags, 3);
      // "Đọc bao nhiêu review" là số người đã gắn đúng những tag này — con số
      // có thật, không phải hiệu ứng.
      const read = spots.reduce(
        (total, id) =>
          total +
          spotTags(id, demo.extraTags)
            .filter((tag) => nextTags.includes(tag.id))
            .reduce((sum, tag) => sum + tag.count, 0),
        0,
      );
      nextId.current += 1;
      setTurns((current) => [
        ...current,
        { kind: 'answer', id: nextId.current, tags: nextTags, spots, read },
      ]);
      setMascot('found');
    },
    [demo.extraTags],
  );

  /** Nooka "đọc review" một nhịp rồi mới trả lời — chỗ này là nơi gọi API thật sau này. */
  const think = useCallback(
    (nextTags: TagId[], ms: number) => {
      setMascot('searching');
      if (pending.current) clearTimeout(pending.current);
      pending.current = setTimeout(() => answer(nextTags), ms);
    },
    [answer],
  );

  const send = useCallback(
    (text: string, intent: IntentId | null = null) => {
      const clean = text.trim();
      if (!clean && !intent) return;

      nextId.current += 1;
      setTurns((current) => [
        ...current,
        { kind: 'ask', id: nextId.current, text: clean || t(`search.intents.${intent}`) },
      ]);
      setDraft('');

      const merged = [...new Set([...tags, ...matchTags(clean, synonyms, intent)])];
      setTags(merged);
      think(merged, 900);
    },
    [synonyms, tags, think],
  );

  const dropTag = useCallback(
    (tag: TagId) => {
      const merged = tags.filter((item) => item !== tag);
      setTags(merged);
      think(merged, 600);
    },
    [tags, think],
  );

  const restart = useCallback(() => {
    if (pending.current) clearTimeout(pending.current);
    setTurns([]);
    setTags([]);
    setDraft('');
    setMascot('idle');
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(timer);
  }, [turns, mascot]);

  return (
    <ScreenShell testID="ask-nooka-screen">
      <View style={styles.header}>
        <CircleButton
          accessibilityLabel={t('common.back')}
          icon="arrow-back"
          onPress={() => router.back()}
          tone="muted"
        />
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: colors.text }]}>{t('search.title')}</Text>
          <View style={styles.subtitleRow}>
            <View style={[styles.liveDot, { backgroundColor: colors.accentStrong }]} />
            <Text numberOfLines={1} style={[styles.subtitle, { color: colors.textMuted }]}>
              {t('search.subtitle')}
            </Text>
          </View>
        </View>
        {answered ? (
          <CircleButton
            accessibilityLabel={t('search.restart')}
            icon="refresh"
            onPress={restart}
            tone="muted"
          />
        ) : null}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
        style={styles.fill}>
        <ScrollView
          contentContainerStyle={styles.thread}
          keyboardShouldPersistTaps="handled"
          ref={scroller}
          showsVerticalScrollIndicator={false}>
          <NookaTurn>
            <Bubble>{t('search.opening')}</Bubble>
          </NookaTurn>

          {turns.length === 0 ? (
            <View style={styles.block}>
              <Text style={[styles.label, { color: colors.textSubtle }]}>{t('search.quickPick')}</Text>
              <View style={styles.chips}>
                {INTENT_IDS.map((intent) => (
                  <Chip
                    key={intent}
                    label={t(`search.intents.${intent}`)}
                    onPress={() => send('', intent)}
                  />
                ))}
              </View>
              <Text style={[styles.footnote, { color: colors.textSubtle }]}>{t('search.noAnswer')}</Text>
            </View>
          ) : null}

          {turns.map((turn) =>
            turn.kind === 'ask' ? (
              <View key={turn.id} style={styles.askRow}>
                <View style={[styles.bubble, styles.askBubble, { backgroundColor: colors.inverseSurface }]}>
                  <Text style={[styles.bubbleText, { color: colors.onInverse }]}>{turn.text}</Text>
                </View>
              </View>
            ) : (
              <AnswerTurn key={turn.id} onDropTag={dropTag} turn={turn} />
            ),
          )}

          {mascot === 'searching' ? (
            <NookaTurn>
              <View style={styles.readingRow}>
                <View style={[styles.readingBar, { backgroundColor: colors.surfaceMuted }]}>
                  <View style={[styles.readingFill, { backgroundColor: colors.accentStrong }]} />
                </View>
                <Text style={[styles.reading, { color: colors.textMuted }]}>{t('search.reading')}</Text>
              </View>
            </NookaTurn>
          ) : null}
        </ScrollView>

        {/* `ScreenShell` chỉ chừa lề an toàn phía trên, nên thanh nhắn tin phải
            tự nâng khỏi vạch home. Cộng thêm 16 để nó không dính sát mép. */}
        <View
          style={[
            styles.composer,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.borderSubtle,
              paddingBottom: padBottom,
            },
          ]}>
          {/* Nooka nằm **trước** hàng nhập trong cây JSX nên hàng nhập vẽ đè lên.
              Đó là toàn bộ cơ chế "nấp": đi sang vùng ô nhập là bị chính ô nhập
              che nửa dưới thân, rồi mới nhô lên hay chìm xuống. Đứng ở chỗ ở thì
              lớp này nằm trong khoảng đã chừa nên không bị che gì. Không nhận
              chạm để không cướp vùng bấm của ô nhập. */}
          <Animated.View
            pointerEvents="none"
            style={[styles.mascotLayer, { bottom: padBottom }, walk]}>
            <NookaSprite onSettled={setMascot} size={MASCOT_SIZE} stage={stage} state={mascot} />
          </Animated.View>

          <View style={styles.inputRow}>
            <TextInput
              accessibilityLabel={t('search.composer')}
              onChangeText={setDraft}
              onSubmitEditing={() => send(draft)}
              placeholder={t('search.composer')}
              placeholderTextColor={colors.textSubtle}
              returnKeyType="send"
              style={[
                styles.field,
                {
                  backgroundColor: colors.surface,
                  borderColor: draft.trim() ? colors.accentStrong : colors.borderSubtle,
                  color: colors.text,
                },
              ]}
              value={draft}
            />
            <Pressable
              accessibilityLabel={t('search.send')}
              accessibilityRole="button"
              accessibilityState={{ disabled: !draft.trim() }}
              disabled={!draft.trim()}
              onPress={() => send(draft)}
              style={({ pressed }) => [
                styles.send,
                {
                  backgroundColor: draft.trim() ? colors.inverseSurface : colors.surfaceMuted,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}>
              <Ionicons
                color={draft.trim() ? colors.onInverse : colors.textSubtle}
                name="arrow-up"
                size={19}
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

function NookaTurn({ children }: { children: React.ReactNode }) {
  const { colors } = useNookaTheme();
  return (
    <View style={styles.block}>
      <View style={styles.who}>
        <View style={[styles.ring, { borderColor: colors.accentStrong }]} />
        <Text style={[styles.whoName, { color: colors.textMuted }]}>{t('brand.name')}</Text>
      </View>
      {children}
    </View>
  );
}

function Bubble({ children }: { children: React.ReactNode }) {
  const { colors } = useNookaTheme();
  return (
    <View style={[styles.bubble, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
      <Text style={[styles.bubbleText, { color: colors.text }]}>{children}</Text>
    </View>
  );
}

function AnswerTurn({
  turn,
  onDropTag,
}: {
  turn: Extract<Turn, { kind: 'answer' }>;
  onDropTag: (tag: TagId) => void;
}) {
  const router = useRouter();
  const { colors } = useNookaTheme();
  const { extraTags } = useNookaDemo();

  return (
    <>
      <NookaTurn>
        <Bubble>
          {/* Không khớp tag nào thì "Đọc 0 review" nghe như hỏng. Nói thẳng là
              chưa hiểu, rồi vẫn đưa ra thứ hữu ích nhất còn lại. */}
          {turn.tags.length === 0
            ? t('search.noTags')
            : `${t('search.readCount', { count: turn.read })} ${t('search.leftCount', { count: turn.spots.length })}`}
        </Bubble>
      </NookaTurn>

      {turn.tags.length ? (
        <View style={styles.block}>
          <Text style={[styles.label, { color: colors.textSubtle }]}>{t('search.understood')}</Text>
          <View style={styles.chips}>
            {turn.tags.map((tag) => (
              <Chip key={tag} label={tagLabel(tag)} onPress={() => onDropTag(tag)} selected trailing="✕" />
            ))}
          </View>
        </View>
      ) : null}

      {turn.spots.length ? (
        <View style={[styles.results, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          {turn.spots.map((id, index) => (
            <View key={id} style={index ? [styles.divider, { borderTopColor: colors.borderSubtle }] : null}>
              <ResultRow
                distance={formatDistance(SPOTS[id].distanceM)}
                onPress={() => router.push({ pathname: '/spot/[id]', params: { id } })}
                rank={index + 1}
                reason={checkinLine(id)}
                tags={explainTags(id, turn.tags, extraTags)
                  .slice(0, 2)
                  .map((tag) => tagLabel(tag.id))
                  .join(' · ')}
                tint={SPOTS[id].photoTint}
                title={spotName(id)}
              />
            </View>
          ))}
        </View>
      ) : (
        <Text style={[styles.footnote, { color: colors.textMuted }]}>{t('search.nothingLeft')}</Text>
      )}

      <Text style={[styles.footnote, { color: colors.textSubtle }]}>{t('search.aiBoundary')}</Text>
    </>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { minHeight: 44, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { fontSize: 19, lineHeight: 25, fontWeight: '800', letterSpacing: -0.4 },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  subtitle: { flex: 1, fontSize: 11.5, lineHeight: 16, fontWeight: '600' },
  thread: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 20, gap: 16 },
  block: { gap: 9 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  ring: { width: 14, height: 14, borderRadius: 7, borderWidth: 2.5 },
  whoName: { fontSize: 10.5, lineHeight: 14, fontWeight: '800', letterSpacing: 1.2 },
  bubble: {
    alignSelf: 'flex-start',
    maxWidth: '92%',
    borderRadius: 20,
    borderBottomLeftRadius: 7,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  bubbleText: { fontSize: 14.5, lineHeight: 21, fontWeight: '600', letterSpacing: -0.2 },
  askRow: { alignItems: 'flex-end' },
  askBubble: {
    alignSelf: 'flex-end',
    borderColor: 'transparent',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 7,
  },
  label: { fontSize: 10.5, lineHeight: 14, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  results: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14 },
  divider: { borderTopWidth: 1 },
  footnote: { fontSize: 12, lineHeight: 17, fontWeight: '500' },
  readingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  readingBar: { width: 92, height: 4, borderRadius: 2, overflow: 'hidden' },
  readingFill: { width: '62%', height: '100%', borderRadius: 2 },
  reading: { fontSize: 12.5, lineHeight: 17, fontWeight: '600' },
  composer: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  // `left` khớp `composer.paddingHorizontal`: chỗ ở là mép trái của hàng nhập.
  mascotLayer: { position: 'absolute', left: 16 },
  // `paddingLeft` là chỗ chừa cứng cho Nooka — cố định nên ô nhập và nút gửi
  // đứng yên dù nhân vật đang đi, đang nấp hay đang chìm.
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: MASCOT_SLOT },
  field: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1.4,
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: '600',
  },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});

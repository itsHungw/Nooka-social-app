import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';

import { spotName } from '@/features/nooka/labels';
import type { ExtraTagCounts } from '@/features/nooka/ranking';
import {
  INITIAL_FEED,
  SPOTS,
  type FeedPost,
  type IntentId,
  type ReviewQuestionId,
  type SpotId,
  type TagId,
} from '@/features/nooka/spots';
import { t } from '@/lib/i18n';

/**
 * Toàn bộ trạng thái của prototype: feed, Muốn đi / Đã đi, tag người dùng thêm,
 * bản nháp check-in và câu hỏi cho Nooka.
 *
 * Chưa có API contract (xem luật "API" trong `AGENTS.md`) nên mọi thứ sống
 * trong bộ nhớ và mất khi mở lại app — đúng phạm vi của một prototype. Khi có
 * contract thật, thay ruột của provider này chứ không phải từng màn hình.
 */
type DemoState = {
  feed: FeedPost[];
  saved: SpotId[];
  been: SpotId[];
  extraTags: ExtraTagCounts;
  draftSpot: SpotId;
  shots: number;
  caption: string;
  /** Bài vừa đăng, đang chờ chọn tag ở bottom sheet. */
  sheetPostId: string | null;
  sheetTags: TagId[];
  reviewSpot: SpotId;
  reviewAnswers: Partial<Record<ReviewQuestionId, string>>;
  query: string;
  intent: IntentId | null;
  answered: boolean;
  locationAsked: boolean;
  toast: string | null;
};

const INITIAL: DemoState = {
  feed: INITIAL_FEED,
  saved: [],
  been: [],
  extraTags: {},
  draftSpot: 'workshop',
  shots: 0,
  caption: '',
  sheetPostId: null,
  sheetTags: [],
  reviewSpot: 'workshop',
  reviewAnswers: {},
  query: '',
  intent: null,
  answered: false,
  locationAsked: false,
  toast: null,
};

const toggle = <T,>(list: T[], value: T) =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

function addTags(extra: ExtraTagCounts, spot: SpotId, tags: TagId[]): ExtraTagCounts {
  if (!tags.length) return extra;
  const forSpot = { ...(extra[spot] ?? {}) };
  for (const tag of tags) forSpot[tag] = (forSpot[tag] ?? 0) + 1;
  return { ...extra, [spot]: forSpot };
}

export type NookaDemo = ReturnType<typeof useDemoValue>;

const DemoContext = createContext<NookaDemo | null>(null);

function useDemoValue() {
  const [state, setState] = useState(INITIAL);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const flash = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setState((prev) => ({ ...prev, toast: message }));
    toastTimer.current = setTimeout(() => setState((prev) => ({ ...prev, toast: null })), 2100);
  }, []);

  const actions = useMemo(
    () => ({
      flash,

      toggleSave(spot: SpotId) {
        setState((prev) => {
          const saved = toggle(prev.saved, spot);
          flash(t(saved.includes(spot) ? 'toast.saved' : 'toast.unsaved'));
          return { ...prev, saved };
        });
      },

      toggleBeen(spot: SpotId) {
        setState((prev) => {
          const been = toggle(prev.been, spot);
          if (been.includes(spot)) flash(t('toast.been', { spot: spotName(spot) }));
          return { ...prev, been };
        });
      },

      /** Luồng check-in: camera → (đổi chỗ) → caption → đăng. */
      allowLocation: () => setState((prev) => ({ ...prev, locationAsked: true })),
      denyLocation() {
        setState((prev) => ({ ...prev, locationAsked: true }));
        flash(t('toast.noLocation'));
      },
      startDraft: () => setState((prev) => ({ ...prev, shots: 0, caption: '', sheetPostId: null })),
      shoot: () => setState((prev) => ({ ...prev, shots: Math.min(prev.shots + 1, 5) })),
      setDraftSpot: (draftSpot: SpotId) => setState((prev) => ({ ...prev, draftSpot })),
      setCaption: (caption: string) => setState((prev) => ({ ...prev, caption })),

      post() {
        const id = `mine-${Date.now()}`;
        setState((prev) => ({
          ...prev,
          feed: [
            {
              id,
              friend: null,
              spot: prev.draftSpot,
              timeKey: 'time.justNow',
              caption: prev.caption.trim() || t('feed.myCaption', { spot: spotName(prev.draftSpot) }),
              tags: [],
            },
            ...prev.feed,
          ],
          been: prev.been.includes(prev.draftSpot) ? prev.been : [...prev.been, prev.draftSpot],
          reviewSpot: prev.draftSpot,
          shots: 0,
          caption: '',
          sheetPostId: id,
          sheetTags: [],
        }));
      },

      toggleSheetTag: (tag: TagId) =>
        setState((prev) => ({ ...prev, sheetTags: toggle(prev.sheetTags, tag) })),

      /** Đóng sheet và ghi tag vừa chọn vào trang địa điểm. */
      commitSheetTags() {
        setState((prev) => {
          const post = prev.feed.find((item) => item.id === prev.sheetPostId);
          if (!post) return { ...prev, sheetPostId: null };
          if (prev.sheetTags.length) flash(t('toast.tagsAdded'));
          return {
            ...prev,
            feed: prev.feed.map((item) =>
              item.id === post.id ? { ...item, tags: prev.sheetTags.slice(0, 3) } : item,
            ),
            extraTags: addTags(prev.extraTags, post.spot, prev.sheetTags),
            sheetPostId: null,
          };
        });
      },

      openReviewFor: (reviewSpot: SpotId) =>
        setState((prev) => ({ ...prev, reviewSpot, sheetPostId: null, reviewAnswers: {} })),
      setReviewAnswer: (question: ReviewQuestionId, answer: string) =>
        setState((prev) => ({ ...prev, reviewAnswers: { ...prev.reviewAnswers, [question]: answer } })),

      /**
       * Trả lời "không bị nhắc" và "rẻ" biến thành tag thật trên trang địa
       * điểm — đây là điểm mà review đóng vòng lại với xếp hạng.
       */
      submitReview() {
        setState((prev) => {
          const earned: TagId[] = [];
          if (prev.reviewAnswers.stay === 'no') earned.push('workFriendly');
          if (prev.reviewAnswers.price === 'cheap') earned.push('goodPrice');
          return {
            ...prev,
            extraTags: addTags(prev.extraTags, prev.reviewSpot, earned),
            reviewAnswers: {},
          };
        });
        flash(t('toast.reviewSent'));
      },

      setQuery: (query: string) => setState((prev) => ({ ...prev, query, answered: false })),
      pickIntent: (intent: IntentId) =>
        setState((prev) => ({ ...prev, intent: prev.intent === intent ? null : intent, answered: true })),
      ask: () => setState((prev) => ({ ...prev, answered: true })),
      /** Mở lại ô hỏi để sửa câu — nút "Sửa" trên thanh câu hỏi đã thu gọn. */
      reopen: () => setState((prev) => ({ ...prev, answered: false })),
    }),
    [flash],
  );

  return useMemo(
    () => ({
      ...state,
      ...actions,
      isSaved: (spot: SpotId) => state.saved.includes(spot),
      isBeen: (spot: SpotId) => state.been.includes(spot),
      myPosts: state.feed.filter((post) => post.friend === null),
      draft: SPOTS[state.draftSpot],
    }),
    [state, actions],
  );
}

export function NookaDemoProvider({ children }: PropsWithChildren) {
  return <DemoContext.Provider value={useDemoValue()}>{children}</DemoContext.Provider>;
}

export function useNookaDemo(): NookaDemo {
  const value = useContext(DemoContext);
  if (!value) throw new Error('useNookaDemo must be used inside NookaDemoProvider');
  return value;
}

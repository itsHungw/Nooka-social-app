import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';

import { spotName } from '@/features/nooka/labels';
import {
  draftDaysRemaining,
  limitHashtagText,
  parseHashtags,
  readCheckinDraft,
  removeCheckinDraft,
  writeCheckinDraft,
  type CheckinDraft,
} from '@/features/nooka/checkin-draft';
import type { ExtraTagCounts } from '@/features/nooka/ranking';
import {
  INITIAL_FEED,
  SPOTS,
  type FeedPost,
  type IntentId,
  type PhotoTint,
  type PostVisibility,
  type ReviewQuestionId,
  type SpotId,
  type TagId,
} from '@/features/nooka/spots';
import { t } from '@/lib/i18n';

/**
 * Toàn bộ trạng thái của prototype: feed, Muốn đi / Đã đi, xác nhận tag có kiểm soát,
 * bản nháp check-in và câu hỏi cho Nooka.
 *
 * Chưa có API contract (xem luật "API" trong `AGENTS.md`) nên mọi thứ sống
 * trong bộ nhớ và mất khi mở lại app — đúng phạm vi của một prototype. Khi có
 * contract thật, thay ruột của provider này chứ không phải từng màn hình. Draft là ngoại lệ
 * duy nhất được lưu local để prototype kiểm thử đúng vòng đời 7 ngày.
 */
type DemoState = {
  feed: FeedPost[];
  wantToGo: SpotId[];
  been: SpotId[];
  reactedPostIds: string[];
  commentsByPostId: Partial<Record<string, string[]>>;
  extraTags: ExtraTagCounts;
  draftSpot: SpotId;
  draftPhotos: PhotoTint[];
  caption: string;
  hashtagText: string;
  draftVisibility: PostVisibility;
  lastPostVisibility: PostVisibility;
  savedDraft: CheckinDraft | null;
  /** Bài vừa đăng, đang chờ chọn tag ở bottom sheet. */
  sheetPostId: string | null;
  sheetTags: TagId[];
  /** Chỉ có khi Spot vừa đăng vốn đã nằm trong Want to go. */
  visitIntentPromptSpot: SpotId | null;
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
  wantToGo: ['bloom'],
  been: ['muoi43'],
  reactedPostIds: [],
  commentsByPostId: {},
  extraTags: {},
  draftSpot: 'workshop',
  draftPhotos: [],
  caption: '',
  hashtagText: '',
  draftVisibility: 'FOLLOWERS',
  lastPostVisibility: 'FOLLOWERS',
  savedDraft: null,
  sheetPostId: null,
  sheetTags: [],
  visitIntentPromptSpot: null,
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
  const stateRef = useRef(state);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  stateRef.current = state;

  useEffect(() => {
    let active = true;
    void readCheckinDraft().then((savedDraft) => {
      if (active) setState((prev) => ({ ...prev, savedDraft }));
    });
    return () => { active = false; };
  }, []);

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

      toggleWantToGo(spot: SpotId) {
        setState((prev) => {
          const wantToGo = toggle(prev.wantToGo, spot);
          flash(t(wantToGo.includes(spot) ? 'toast.wantAdded' : 'toast.wantRemoved'));
          return { ...prev, wantToGo };
        });
      },

      togglePostReaction(postId: string) {
        setState((prev) => ({ ...prev, reactedPostIds: toggle(prev.reactedPostIds, postId) }));
      },

      addPostComment(postId: string, body: string) {
        const comment = body.trim();
        if (!comment) return;
        setState((prev) => ({
          ...prev,
          commentsByPostId: {
            ...prev.commentsByPostId,
            [postId]: [...(prev.commentsByPostId[postId] ?? []), comment],
          },
        }));
      },

      /** Luồng check-in: camera → (đổi chỗ) → caption → đăng. */
      allowLocation: () => setState((prev) => ({ ...prev, locationAsked: true })),
      denyLocation() {
        setState((prev) => ({ ...prev, locationAsked: true }));
        flash(t('toast.noLocation'));
      },
      startDraft: () => setState((prev) => ({
        ...prev,
        draftPhotos: [],
        caption: '',
        hashtagText: '',
        draftVisibility: prev.feed.some((post) => post.friend === null) ? prev.lastPostVisibility : 'PUBLIC',
        sheetPostId: null,
        visitIntentPromptSpot: null,
      })),
      shoot: () => setState((prev) => {
        if (prev.draftPhotos.length >= 5) return prev;
        const palette: PhotoTint[] = ['photoWarm', 'photoSand', 'photoSage', 'photoClay'];
        return { ...prev, draftPhotos: [...prev.draftPhotos, palette[prev.draftPhotos.length % palette.length]] };
      }),
      addFromLibrary: () => setState((prev) => {
        if (prev.draftPhotos.length >= 5) return prev;
        const palette: PhotoTint[] = ['photoSage', 'photoClay', 'photoWarm', 'photoSand'];
        return { ...prev, draftPhotos: [...prev.draftPhotos, palette[prev.draftPhotos.length % palette.length]] };
      }),
      removeDraftPhoto: (index: number) => setState((prev) => ({
        ...prev,
        draftPhotos: prev.draftPhotos.filter((_, photoIndex) => photoIndex !== index),
      })),
      setDraftSpot: (draftSpot: SpotId) => setState((prev) => ({ ...prev, draftSpot })),
      setCaption: (caption: string) => setState((prev) => ({ ...prev, caption })),
      setHashtagText: (hashtagText: string) =>
        setState((prev) => ({ ...prev, hashtagText: limitHashtagText(hashtagText) })),
      setDraftVisibility: (draftVisibility: PostVisibility) =>
        setState((prev) => ({ ...prev, draftVisibility })),

      async saveDraft() {
        const current = stateRef.current;
        const savedDraft: CheckinDraft = {
          spot: current.draftSpot,
          photos: current.draftPhotos,
          caption: current.caption,
          hashtagText: current.hashtagText,
          visibility: current.draftVisibility,
          updatedAt: Date.now(),
        };
        await writeCheckinDraft(savedDraft);
        setState((prev) => ({ ...prev, savedDraft }));
      },

      resumeSavedDraft() {
        setState((prev) => prev.savedDraft ? ({
          ...prev,
          draftSpot: prev.savedDraft.spot,
          draftPhotos: prev.savedDraft.photos,
          caption: prev.savedDraft.caption,
          hashtagText: prev.savedDraft.hashtagText,
          draftVisibility: prev.savedDraft.visibility,
        }) : prev);
      },

      discardDraft() {
        void removeCheckinDraft();
        setState((prev) => ({
          ...prev,
          draftPhotos: [],
          caption: '',
          hashtagText: '',
          savedDraft: null,
        }));
      },

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
              hashtags: parseHashtags(prev.hashtagText),
              photoTints: prev.draftPhotos.length ? prev.draftPhotos : [SPOTS[prev.draftSpot].photoTint],
              tags: [],
              reactionCount: 0,
              commentCount: 0,
              visibility: prev.draftVisibility,
            },
            ...prev.feed,
          ],
          been: prev.been.includes(prev.draftSpot) ? prev.been : [...prev.been, prev.draftSpot],
          reviewSpot: prev.draftSpot,
          draftPhotos: [],
          caption: '',
          hashtagText: '',
          lastPostVisibility: prev.draftVisibility,
          draftVisibility: prev.draftVisibility,
          savedDraft: null,
          sheetPostId: id,
          sheetTags: [],
          visitIntentPromptSpot: prev.wantToGo.includes(prev.draftSpot) ? prev.draftSpot : null,
        }));
        void removeCheckinDraft();
      },

      keepWantToGoForRevisit() {
        // Backend sẽ clear source_post_id sau khi đã copy attribution sang Post mới.
        setState((prev) => ({ ...prev, visitIntentPromptSpot: null }));
      },

      removeCompletedWantToGo() {
        setState((prev) => ({
          ...prev,
          wantToGo: prev.visitIntentPromptSpot
            ? prev.wantToGo.filter((spot) => spot !== prev.visitIntentPromptSpot)
            : prev.wantToGo,
          visitIntentPromptSpot: null,
        }));
        flash(t('toast.wantRemoved'));
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
            // Đóng sheet/Back mặc định giữ Spot để quay lại.
            visitIntentPromptSpot: null,
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
      shots: state.draftPhotos.length,
      hasDraftChanges: state.draftPhotos.length > 0 || Boolean(state.caption.trim()) || Boolean(state.hashtagText.trim()),
      savedDraftDaysRemaining: state.savedDraft ? draftDaysRemaining(state.savedDraft) : 0,
      wantsToGo: (spot: SpotId) => state.wantToGo.includes(spot),
      isBeen: (spot: SpotId) => state.been.includes(spot),
      isPostReacted: (postId: string) => state.reactedPostIds.includes(postId),
      postComments: (postId: string) => state.commentsByPostId[postId] ?? [],
      postCommentCount: (post: FeedPost) => post.commentCount + (state.commentsByPostId[post.id]?.length ?? 0),
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

import type { Colors } from '@/constants/theme';

/**
 * Dữ liệu giả cho prototype. Không có API contract nên tất cả sống ở đây —
 * xem luật "API" trong `AGENTS.md`. Chuỗi hiển thị nằm ở `locales/`, file này
 * chỉ giữ id, số và token màu.
 */

export type PhotoTint = 'photoWarm' | 'photoSand' | 'photoSage' | 'photoClay';
export type ColorToken = keyof (typeof Colors)['light'];

export const TAG_IDS = [
  'quiet',
  'workFriendly',
  'outdoor',
  'goodPrice',
  'noisyWeekend',
  'openLate',
  'niceView',
  'quietMusic',
  'fast',
  'takeaway',
] as const;

export type TagId = (typeof TAG_IDS)[number];

/** Tag người dùng được chọn sau khi đăng bài (sheet "Đã lên feed"). */
export const PICKABLE_TAG_IDS: TagId[] = [
  'quiet',
  'workFriendly',
  'outdoor',
  'goodPrice',
  'noisyWeekend',
  'openLate',
  'niceView',
];

export const INTENT_IDS = ['firstDate', 'work', 'lateNight', 'visitor'] as const;
export type IntentId = (typeof INTENT_IDS)[number];

export const INTENT_TAGS: Record<IntentId, TagId[]> = {
  firstDate: ['quiet', 'niceView'],
  work: ['workFriendly', 'quiet'],
  lateNight: ['openLate', 'fast'],
  visitor: ['niceView', 'outdoor'],
};

export type Spot = {
  id: SpotId;
  photoTint: PhotoTint;
  distanceM: number;
  checkins: number;
  reviews: number;
  friends: number;
  isNew?: boolean;
  hasReview: boolean;
  tags: { id: TagId; count: number }[];
  /**
   * Địa điểm này *hợp* tới mức nào với từng tag, không phụ thuộc số người đã
   * nói. Tách khỏi `tags.count` vì hai thứ khác nhau: "Muối 43 đúng là chỗ ăn
   * khuya" không giống "7 người đã nói nó mở muộn". Thiếu tag nào thì coi là 1.
   */
  fit: Partial<Record<TagId, number>>;
};

export const SPOT_IDS = ['workshop', 'bloom', 'sansau', 'muoi43'] as const;
export type SpotId = (typeof SPOT_IDS)[number];

export const SPOTS: Record<SpotId, Spot> = {
  workshop: {
    id: 'workshop',
    photoTint: 'photoWarm',
    distanceM: 400,
    checkins: 118,
    reviews: 12,
    friends: 6,
    hasReview: true,
    tags: [
      { id: 'quiet', count: 34 },
      { id: 'workFriendly', count: 21 },
      { id: 'outdoor', count: 12 },
      { id: 'noisyWeekend', count: 5 },
    ],
    fit: { quiet: 3, workFriendly: 3, outdoor: 2 },
  },
  bloom: {
    id: 'bloom',
    photoTint: 'photoSand',
    distanceM: 1200,
    checkins: 64,
    reviews: 9,
    friends: 3,
    hasReview: true,
    tags: [
      { id: 'niceView', count: 28 },
      { id: 'quietMusic', count: 19 },
      { id: 'openLate', count: 11 },
    ],
    fit: { niceView: 3, quietMusic: 3, openLate: 1 },
  },
  sansau: {
    id: 'sansau',
    photoTint: 'photoSage',
    distanceM: 250,
    checkins: 1,
    reviews: 0,
    friends: 0,
    isNew: true,
    hasReview: false,
    tags: [
      { id: 'quiet', count: 1 },
      { id: 'goodPrice', count: 1 },
    ],
    fit: { quiet: 2, goodPrice: 2, workFriendly: 2 },
  },
  muoi43: {
    id: 'muoi43',
    photoTint: 'photoClay',
    distanceM: 120,
    checkins: 9,
    reviews: 3,
    friends: 1,
    hasReview: true,
    tags: [
      { id: 'openLate', count: 7 },
      { id: 'fast', count: 6 },
      { id: 'goodPrice', count: 5 },
      { id: 'takeaway', count: 4 },
    ],
    fit: { openLate: 4, fast: 3, takeaway: 3, goodPrice: 2 },
  },
};

export type FriendId = 'linh' | 'nam' | 'trang' | 'huy';

/** Dải check-in trên đầu feed. `live` = còn đang ở đó. */
export const FRIENDS: { id: FriendId; spot: SpotId; tint: PhotoTint; live: boolean }[] = [
  { id: 'linh', spot: 'workshop', tint: 'photoWarm', live: true },
  { id: 'nam', spot: 'bloom', tint: 'photoSage', live: true },
  { id: 'trang', spot: 'muoi43', tint: 'photoClay', live: false },
  { id: 'huy', spot: 'sansau', tint: 'photoSand', live: false },
];

export type FeedPost = {
  id: string;
  /** `null` = bài của mình, tên lấy từ i18n. */
  friend: FriendId | null;
  spot: SpotId;
  timeKey: string;
  /** Bài mẫu dùng caption từ i18n; bài mình đăng giữ text người dùng gõ. */
  captionKey?: string;
  caption?: string;
  hashtagsKey?: string;
  tags: TagId[];
};

export const INITIAL_FEED: FeedPost[] = [
  {
    id: 'seed-linh',
    friend: 'linh',
    spot: 'workshop',
    timeKey: 'time.justNow',
    captionKey: 'feed.linh.caption',
    hashtagsKey: 'feed.linh.hashtags',
    tags: ['quiet', 'workFriendly', 'outdoor'],
  },
  {
    id: 'seed-nam',
    friend: 'nam',
    spot: 'bloom',
    timeKey: 'time.twoHours',
    captionKey: 'feed.nam.caption',
    hashtagsKey: 'feed.nam.hashtags',
    tags: ['quietMusic', 'niceView'],
  },
];

export const REVIEW_QUESTIONS = [
  { id: 'power', options: ['yes', 'no'] },
  { id: 'stay', options: ['yes', 'no'] },
  { id: 'price', options: ['cheap', 'fair', 'high'] },
] as const;

export type ReviewQuestionId = (typeof REVIEW_QUESTIONS)[number]['id'];

/** Ghim trên bản đồ — toạ độ là phần trăm của khung, không phải toạ độ thật. */
export const MAP_PINS: { spot: SpotId; left: string; top: string }[] = [
  { spot: 'muoi43', left: '12%', top: '58%' },
  { spot: 'bloom', left: '56%', top: '22%' },
  { spot: 'workshop', left: '30%', top: '74%' },
];

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  POST_VISIBILITIES,
  SPOT_IDS,
  type PhotoTint,
  type PostVisibility,
  type SpotId,
} from './spots.ts';

const DRAFT_STORAGE_KEY = '@nooka/checkin-draft';
export const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type CheckinDraft = {
  spot: SpotId;
  photos: PhotoTint[];
  caption: string;
  hashtagText: string;
  visibility: PostVisibility;
  updatedAt: number;
};

function isDraft(value: unknown): value is CheckinDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Partial<CheckinDraft>;
  return (
    SPOT_IDS.includes(draft.spot as SpotId) &&
    Array.isArray(draft.photos) &&
    draft.photos.length <= 5 &&
    typeof draft.caption === 'string' &&
    typeof draft.hashtagText === 'string' &&
    POST_VISIBILITIES.includes(draft.visibility as PostVisibility) &&
    typeof draft.updatedAt === 'number'
  );
}

export async function readCheckinDraft(now = Date.now()): Promise<CheckinDraft | null> {
  const raw = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isDraft(parsed) || now - parsed.updatedAt >= DRAFT_TTL_MS) {
      await AsyncStorage.removeItem(DRAFT_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    await AsyncStorage.removeItem(DRAFT_STORAGE_KEY);
    return null;
  }
}

export async function writeCheckinDraft(draft: CheckinDraft): Promise<void> {
  await AsyncStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

export async function removeCheckinDraft(): Promise<void> {
  await AsyncStorage.removeItem(DRAFT_STORAGE_KEY);
}

export function draftDaysRemaining(draft: CheckinDraft, now = Date.now()): number {
  return Math.max(1, Math.ceil((DRAFT_TTL_MS - (now - draft.updatedAt)) / (24 * 60 * 60 * 1000)));
}

export function parseHashtags(input: string): string[] {
  const unique = new Map<string, string>();
  for (const token of input.split(/[\s,]+/u)) {
    const hashtag = token.replace(/^#+/u, '').trim().normalize('NFC');
    if (!hashtag) continue;
    const searchKey = hashtag.toLocaleLowerCase('vi-VN');
    if (!unique.has(searchKey)) unique.set(searchKey, hashtag);
    if (unique.size === 10) break;
  }
  return [...unique.values()];
}

export function limitHashtagText(input: string): string {
  const tokens = input.split(/[\s,]+/u).filter(Boolean);
  return tokens.length <= 10 ? input : tokens.slice(0, 10).join(' ');
}

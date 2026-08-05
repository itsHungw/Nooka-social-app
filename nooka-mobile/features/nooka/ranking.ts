import { INTENT_TAGS, SPOTS, SPOT_IDS, type IntentId, type SpotId, type TagId } from './spots.ts';

/** Tag do người dùng thêm sau khi check-in, cộng dồn lên số có sẵn của địa điểm. */
export type ExtraTagCounts = Partial<Record<SpotId, Partial<Record<TagId, number>>>>;

export type SpotTag = { id: TagId; count: number };

/** Tag của một địa điểm sau khi cộng đóng góp của người dùng, nhiều nhất trước. */
export function spotTags(spotId: SpotId, extra: ExtraTagCounts = {}): SpotTag[] {
  const added = extra[spotId] ?? {};
  const merged = new Map<TagId, number>(SPOTS[spotId].tags.map((tag) => [tag.id, tag.count]));

  for (const [id, count] of Object.entries(added) as [TagId, number][]) {
    merged.set(id, (merged.get(id) ?? 0) + count);
  }

  return [...merged].map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count);
}

/**
 * Câu hỏi tự do + intent đã chọn → danh sách tag.
 *
 * `synonyms` đến từ locale đang dùng nên việc khớp chữ đi theo ngôn ngữ; logic
 * xếp hạng không biết gì về tiếng Việt hay tiếng Anh.
 */
export function matchTags(
  query: string,
  synonyms: Partial<Record<TagId, string[]>>,
  intent: IntentId | null = null,
): TagId[] {
  const haystack = query.trim().toLowerCase();
  const matched = new Set<TagId>(intent ? INTENT_TAGS[intent] : []);

  if (haystack) {
    for (const [id, words] of Object.entries(synonyms) as [TagId, string[]][]) {
      if (words.some((word) => word && haystack.includes(word.toLowerCase()))) matched.add(id);
    }
  }

  return [...matched];
}

/**
 * Điểm của một địa điểm: mỗi tag khớp góp phần độ hợp do biên tập chấm, cộng
 * thêm phần theo số người đã nói tag đó. Số check-in chỉ dùng để phá hoà.
 */
export function scoreSpot(spotId: SpotId, matched: TagId[], extra: ExtraTagCounts = {}): number {
  const spot = SPOTS[spotId];
  const score = spotTags(spotId, extra)
    .filter((tag) => matched.includes(tag.id))
    .reduce((total, tag) => total + (spot.fit[tag.id] ?? 1) * 2 + tag.count / 12, 0);

  return score + Math.min(spot.checkins, 120) / 400;
}

export function rankSpots(matched: TagId[], extra: ExtraTagCounts = {}, limit = 3): SpotId[] {
  return [...SPOT_IDS]
    .sort((a, b) => scoreSpot(b, matched, extra) - scoreSpot(a, matched, extra))
    .slice(0, limit);
}

/** Tag dùng để giải thích kết quả: cái khớp trước, phần còn lại sau. */
export function explainTags(spotId: SpotId, matched: TagId[], extra: ExtraTagCounts = {}): SpotTag[] {
  const tags = spotTags(spotId, extra);
  const hit = tags.filter((tag) => matched.includes(tag.id));
  return [...hit, ...tags.filter((tag) => !hit.includes(tag))];
}

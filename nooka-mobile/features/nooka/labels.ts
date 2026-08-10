import { t } from '@/lib/i18n';

import { SPOTS, type SpotId, type TagId } from './spots.ts';

/**
 * Dưới 1 km thì đọc theo mét, trên thì theo km một chữ số thập phân.
 *
 * ponytail: dấu thập phân luôn là dấu chấm, kể cả ở locale dùng dấu phẩy. Đổi
 * sang `Intl.NumberFormat` khi khoảng cách là dữ liệu thật chứ không phải demo.
 */
export function formatDistance(meters: number): string {
  return meters < 1000
    ? t('unit.meters', { value: meters })
    : t('unit.kilometers', { value: (meters / 1000).toFixed(1) });
}

/**
 * Dòng "bao nhiêu người đã check-in ở đây" — dùng chung ở hàng kết quả, ghim
 * và preview card, để cùng một địa điểm không đọc ra hai con số khác nhau.
 *
 * Chỗ mới (≤ 1 check-in) không hiện số: "1 người đã check-in" nghe như địa
 * điểm đã có bằng chứng, trong khi thật ra chưa có gì.
 */
export function checkinLine(id: SpotId): string {
  const spot = SPOTS[id];
  if (spot.checkins <= 1) return t('spot.newNoReview');

  // Hai vế ghép từ hai key riêng, không phải một key có hai biến: i18n-js chỉ
  // chia số nhiều theo `count`, nên nhét `friends` vào cùng một chuỗi sẽ cho ra
  // "1 friends have been" khi số check-in là số nhiều còn số bạn là một.
  const checkins = t('spot.checkins', { count: spot.checkins });
  if (spot.friends < 1) return checkins;
  return `${checkins} · ${t('spot.friendsBeen', { count: spot.friends })}`;
}

/** Hai tag nhiều người nói nhất, dạng "Yên tĩnh · Thân thiện làm việc". */
export const spotTagLine = (id: SpotId) =>
  SPOTS[id].tags.slice(0, 2).map((tag) => tagLabel(tag.id)).join(' · ');

export const spotName = (id: SpotId) => t(`spots.${id}.name`);
export const spotShortName = (id: SpotId) => t(`spots.${id}.shortName`);
export const spotDistrict = (id: SpotId) => t(`spots.${id}.district`);
export const tagLabel = (id: TagId) => t(`tags.${id}`);

/** Been + Want to go là "muốn quay lại", không phải một trạng thái loại trừ nhau. */
export function wantToGoLabel(hasBeen: boolean, wantsToGo: boolean): string {
  if (hasBeen) return t(wantsToGo ? 'actions.wantReturnDone' : 'actions.wantReturn');
  return t(wantsToGo ? 'actions.wantDone' : 'actions.want');
}

export function wantToGoAccessibilityLabel(hasBeen: boolean, wantsToGo: boolean): string {
  if (!wantsToGo) return wantToGoLabel(hasBeen, false);
  return t(hasBeen ? 'actions.wantReturnRemove' : 'actions.wantRemove');
}

/** Danh sách từ khoá theo locale, dùng cho khớp câu hỏi ở `ranking.ts`. */
export function tagSynonyms(ids: readonly TagId[]): Partial<Record<TagId, string[]>> {
  return Object.fromEntries(
    ids.map((id) => [id, t(`search.synonyms.${id}`).split(',').map((word) => word.trim())]),
  );
}

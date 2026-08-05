import { t } from '@/lib/i18n';

import type { SpotId, TagId } from './spots.ts';

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

export const spotName = (id: SpotId) => t(`spots.${id}.name`);
export const spotShortName = (id: SpotId) => t(`spots.${id}.shortName`);
export const spotDistrict = (id: SpotId) => t(`spots.${id}.district`);
export const tagLabel = (id: TagId) => t(`tags.${id}`);

/** Danh sách từ khoá theo locale, dùng cho khớp câu hỏi ở `ranking.ts`. */
export function tagSynonyms(ids: readonly TagId[]): Partial<Record<TagId, string[]>> {
  return Object.fromEntries(
    ids.map((id) => [id, t(`search.synonyms.${id}`).split(',').map((word) => word.trim())]),
  );
}

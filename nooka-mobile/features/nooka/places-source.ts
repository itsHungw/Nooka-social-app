import type { Coordinate } from './geo.ts';

export type GooglePlace = {
  placeId: string;
  name: string;
  vicinity: string;
  lat: number;
  lng: number;
  types: string[];
  rating?: number;
  userRatingsTotal?: number;
  icon?: string;
  iconBackgroundColor?: string;
  openNow?: boolean;
};

export type Source = 'google' | 'empty';

export interface SpotSource {
  nearby(
    center: Coordinate,
    opts: { radius: number },
  ): Promise<{ places: GooglePlace[]; source: Source }>;
}

/**
 * Fallback `SpotSource` trả về danh sách rỗng.
 *
 * Dùng khi thiếu API key, khi gọi Google Places thất bại, hoặc khi muốn tắt
 * nguồn ngoài để chỉ hiển thị 4 spot hardcoded ở `spots.ts`. Không ném lỗi —
 * giao diện vẫn render được, chỉ là không có ghim từ Google.
 */
export class EmptySource implements SpotSource {
  async nearby(
    _center: Coordinate,
    _opts: { radius: number },
  ): Promise<{ places: GooglePlace[]; source: 'empty' }> {
    return { places: [], source: 'empty' };
  }
}
import type { Colors } from '@/constants/theme';

/**
 * Style của Google Maps, dựng từ token trong `constants/theme.ts`.
 *
 * Không có màu cứng ở đây — nếu có thì bản đồ sẽ chỉ đúng ở một chế độ, đúng
 * cái bẫy mà luật light/dark trong `AGENTS.md` chặn. Truyền `colors` của theme
 * đang chạy vào là bản đồ tự đổi theo.
 *
 * `customMapStyle` chỉ có tác dụng với `PROVIDER_GOOGLE`. Trên iOS khi rơi về
 * Apple Maps, prop này bị bỏ qua và bản đồ giữ màu mặc định của hệ thống —
 * chấp nhận được, ghim và sheet vẫn theo theme.
 */

type Styler = { color?: string; visibility?: 'on' | 'off' | 'simplified'; weight?: number };

export type MapStyleElement = {
  featureType?: string;
  elementType?: string;
  stylers: Styler[];
};

type NookaColors = (typeof Colors)['light'];

export function nookaMapStyle(colors: NookaColors): MapStyleElement[] {
  const paint = (color: string): Styler[] => [{ color }];
  const hide: Styler[] = [{ visibility: 'off' }];

  return [
    { elementType: 'geometry', stylers: paint(colors.mapBackground) },
    { elementType: 'labels.text.fill', stylers: paint(colors.textMuted) },
    { elementType: 'labels.text.stroke', stylers: paint(colors.mapBackground) },
    { elementType: 'labels.icon', stylers: hide },

    { featureType: 'administrative', elementType: 'geometry', stylers: hide },
    { featureType: 'administrative.land_parcel', stylers: hide },
    { featureType: 'administrative.neighborhood', elementType: 'labels', stylers: hide },

    { featureType: 'landscape.man_made', elementType: 'geometry', stylers: paint(colors.mapBlock) },
    { featureType: 'landscape.natural', elementType: 'geometry', stylers: paint(colors.mapPark) },

    { featureType: 'poi', elementType: 'geometry', stylers: paint(colors.mapBlock) },
    { featureType: 'poi', elementType: 'labels', stylers: hide },
    { featureType: 'poi.park', elementType: 'geometry', stylers: paint(colors.mapPark) },

    { featureType: 'road', elementType: 'geometry', stylers: paint(colors.mapRoad) },
    { featureType: 'road', elementType: 'labels.icon', stylers: hide },
    { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: paint(colors.textSubtle) },
    { featureType: 'road.highway', elementType: 'geometry', stylers: paint(colors.mapRoad) },
    { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: paint(colors.mapBlock) },
    { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: paint(colors.textMuted) },
    { featureType: 'road.local', elementType: 'labels', stylers: hide },

    { featureType: 'transit', stylers: hide },

    { featureType: 'water', elementType: 'geometry', stylers: paint(colors.mapWater) },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: paint(colors.textSubtle) },
  ];
}

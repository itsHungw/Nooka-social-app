/**
 * Hàm thuần cho phần địa lý. Không import gì từ React hay react-native-maps —
 * `Region` ở đây là kiểu cấu trúc, trùng hình dạng với `Region` của
 * react-native-maps nhưng không phụ thuộc vào nó, để file này chạy được bằng
 * `node --test`.
 */

export type Coordinate = { latitude: number; longitude: number };

export type Region = Coordinate & { latitudeDelta: number; longitudeDelta: number };

const EARTH_RADIUS_M = 6_371_000;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Haversine. Đủ chính xác ở khoảng cách trong một thành phố. */
export function distanceMeters(from: Coordinate, to: Coordinate): number {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Decode Google's encoded polyline format into map coordinates. */
export function decodePolyline(encoded: string): Coordinate[] {
  const coordinates: Coordinate[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    const latitudeDelta = decodePolylineValue(encoded, () => encoded.charCodeAt(index++));
    const longitudeDelta = decodePolylineValue(encoded, () => encoded.charCodeAt(index++));
    latitude += latitudeDelta;
    longitude += longitudeDelta;
    coordinates.push({ latitude: latitude / 100_000, longitude: longitude / 100_000 });
  }

  return coordinates;
}

function decodePolylineValue(encoded: string, readCode: () => number): number {
  let result = 0;
  let shift = 0;
  let code: number;

  do {
    code = readCode() - 63;
    result |= (code & 0x1f) << shift;
    shift += 5;
  } while (code >= 0x20);

  return (result & 1) === 1 ? ~(result >> 1) : result >> 1;
}
/**
 * Khung nhìn ôm trọn danh sách điểm.
 *
 * `minDelta` chặn trường hợp chỉ có một điểm — không có nó thì delta bằng 0 và
 * bản đồ zoom tới mức thấy từng viên gạch. `padding` là tỉ lệ nới thêm mỗi bên
 * để ghim không dính mép màn hình.
 */
export function regionFor(
  points: readonly Coordinate[],
  { padding = 0.35, minDelta = 0.006 }: { padding?: number; minDelta?: number } = {},
): Region | null {
  if (!points.length) return null;

  let minLat = points[0].latitude;
  let maxLat = points[0].latitude;
  let minLon = points[0].longitude;
  let maxLon = points[0].longitude;

  for (const point of points) {
    minLat = Math.min(minLat, point.latitude);
    maxLat = Math.max(maxLat, point.latitude);
    minLon = Math.min(minLon, point.longitude);
    maxLon = Math.max(maxLon, point.longitude);
  }

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: Math.max(minDelta, (maxLat - minLat) * (1 + padding * 2)),
    longitudeDelta: Math.max(minDelta, (maxLon - minLon) * (1 + padding * 2)),
  };
}

/** Khung nhìn quanh một điểm, dùng khi người dùng chọn một ghim hoặc bấm định vị lại. */
export function regionAround(center: Coordinate, delta = 0.008): Region {
  return { ...center, latitudeDelta: delta, longitudeDelta: delta };
}

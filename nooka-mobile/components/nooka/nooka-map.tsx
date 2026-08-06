import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, type Region } from 'react-native-maps';

import { GooglePin } from '@/components/nooka/google-pin';
import { regionAround, regionFor, type Coordinate } from '@/features/nooka/geo';
import { spotName } from '@/features/nooka/labels';
import { nookaMapStyle } from '@/features/nooka/map-style';
import type { GooglePlace } from '@/features/nooka/places-source';
import { SPOTS, SPOT_IDS, USER_LOCATION, type SpotId } from '@/features/nooka/spots';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';

/**
 * Bản đồ thật cho tab Tìm. `FakeMap` giờ chỉ còn dùng ở màn đặt pin khi check-in.
 *
 * `PROVIDER_GOOGLE` ở cả hai nền tảng: Expo Go đã có sẵn Google Maps SDK nên
 * không cần API key lúc dev. Bản build độc lập thì cần key riêng — xem
 * `app.config.js` và mục "Bản đồ" trong `AGENTS.md`.
 *
 * §13 của spec: **không có real-time location tracking.** Chấm vị trí vẽ từ
 * hằng số `USER_LOCATION`, không phải từ GPS, và `showsUserLocation` cố tình để
 * tắt — bật nó lên là bắt đầu đọc vị trí liên tục.
 *
 * ---
 *
 * **Vì sao ghim không phải là `<Marker>`.**
 *
 * `<Marker>` có view con thì Android + New Architecture vẽ sai: nội dung bị xén
 * theo một khổ cố định, mất nửa phải và mất luôn mép bo. Đây là lỗi của thư
 * viện, không phải của layout ở đây — react-native-maps issue #5877, đúng tổ
 * hợp Expo SDK 54 / RN 0.81 / Fabric, và đã bị đóng "not planned". iOS không
 * dính vì nó gắn view thật thay vì chụp bitmap.
 *
 * Cách duy nhất issue đó nêu là tắt New Architecture — không dùng được, vì Expo
 * Go bản SDK 54 chỉ chạy New Architecture, tắt đi là cả team mất Expo Go.
 *
 * Nên ghim ở đây là **view thường nằm trong một lớp phủ trên bản đồ**, toạ độ
 * chiếu sang toạ độ màn hình theo `region`. Đổi lại: ghim là RN view bình
 * thường nên vẽ đúng, bắt chạm tốt, style theo theme như mọi chỗ khác. Cái mất
 * là ghim bám theo `onRegionChange` nên khi vuốt rất nhanh có thể trễ một nhịp
 * so với bản đồ. Với vài ghim thì không thấy; nếu sau này có hàng trăm ghim,
 * đây là chỗ phải làm lại (chuyển sang Reanimated hoặc chờ thư viện sửa).
 */

export type NookaMapHandle = {
  /**
   * `bottomInset` là chiều cao sheet **sắp** có, không phải chiều cao hiện tại.
   * Chọn ghim thì sheet nhảy nấc và `focusSpot` chạy cùng một tick, nên nếu đọc
   * `mapPadding` từ prop thì đó là giá trị của nấc cũ — ghim sẽ được canh vào
   * đúng chỗ mà sheet chuẩn bị che.
   */
  focusSpot: (id: SpotId, bottomInset?: number) => void;
  recenter: () => void;
  fitAll: () => void;
};

type Inset = { top?: number; right?: number; bottom?: number; left?: number };

export type GooglePlacePin = {
  placeId: string;
  coordinate: Coordinate;
  name: string;
};

type NookaMapProps = {
  spots?: readonly SpotId[];
  selectedSpot?: SpotId | null;
  onSelectSpot?: (id: SpotId) => void;
  onPressMap?: () => void;
  /** Chỗ bị thanh tìm kiếm và sheet che, dùng để canh tâm khi focus vào một ghim. */
  mapPadding?: Inset;
  style?: StyleProp<ViewStyle>;
  pins?: GooglePlace[];
};

/**
 * Mở tab ra là thấy khu mình đang đứng, không phải cả tỉnh.
 *
 * Trước đây chỗ này ôm trọn mọi địa điểm bằng `regionFor`. Nghe hợp lý nhưng
 * sai trên máy thật: dữ liệu demo trải 3,4 km, màn hình thì cao và hẹp, nên
 * Google phải nới bề dọc cho vừa bề ngang rồi làm tròn lên mức zoom kế tiếp —
 * kết quả là bản đồ lùi ra tận Long An và bốn ghim dồn thành một cục.
 *
 * Nên mặc định là bán kính quanh người dùng. `fitAll()` vẫn còn cho ai muốn
 * xem hết một lượt.
 */
const INITIAL_REGION = regionAround(USER_LOCATION, 0.022);

const ALL_REGION =
  regionFor([USER_LOCATION, ...SPOT_IDS.map((id) => SPOTS[id].coordinate)]) ??
  regionAround(USER_LOCATION);

export const NookaMap = forwardRef<NookaMapHandle, NookaMapProps>(function NookaMap(
  { spots = SPOT_IDS, selectedSpot = null, onSelectSpot, onPressMap, mapPadding, style, pins = [] },
  ref,
) {
  const { colors, colorScheme } = useNookaTheme();
  const mapRef = useRef<MapView>(null);
  const mapStyle = useMemo(() => nookaMapStyle(colors), [colors]);

  const [region, setRegion] = useState<Region>(INITIAL_REGION);
  const [size, setSize] = useState({ width: 0, height: 0 });

  /**
   * Bản sao của `region` để đọc lúc remount.
   *
   * Đổi light/dark làm `MapView` remount (xem `key` bên dưới), mà `initialRegion`
   * chỉ được đọc đúng một lần lúc mount. Truyền hằng số vào đó thì mỗi lần đổi
   * theme bản đồ lại nhảy về vùng mặc định, vứt luôn chỗ người dùng đang xem.
   * Đọc từ ref nên remount xong camera vẫn ở nguyên chỗ cũ.
   */
  const regionRef = useRef(region);
  const trackRegion = useCallback((next: Region) => {
    regionRef.current = next;
    setRegion(next);
  }, []);

  /**
   * Đặt lại camera mỗi khi native map sẵn sàng.
   *
   * `initialRegion` không đủ: khi remount vì đổi theme, Fabric tái dùng view có
   * sẵn trong pool nên prop "chỉ đọc lúc mount" bị bỏ qua, và bản đồ hiện ra ở
   * camera thừa kế của view cũ — thực tế là lùi ra tận Long An. Cùng họ với lỗi
   * marker ở trên: prop mount-only không đáng tin trên Fabric.
   */
  const restoreCamera = useCallback(() => {
    mapRef.current?.animateToRegion(regionRef.current, 0);
  }, []);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  }, []);

  /**
   * Đưa tâm lệch lên trên phần bị sheet che, để ghim vừa chọn không nằm dưới
   * sheet. Quy đổi pixel sang độ theo tỉ lệ của `region` hiện tại.
   */
  const offsetCenter = useCallback(
    (coordinate: Coordinate, delta: number, bottomInset?: number): Coordinate => {
      const bottom = bottomInset ?? mapPadding?.bottom ?? 0;
      const hidden = bottom - (mapPadding?.top ?? 0);
      if (!size.height || !hidden) return coordinate;
      return {
        ...coordinate,
        latitude: coordinate.latitude - (hidden / 2 / size.height) * delta,
      };
    },
    [mapPadding?.bottom, mapPadding?.top, size.height],
  );

  useImperativeHandle(ref, () => ({
    focusSpot(id, bottomInset) {
      const delta = 0.008;
      const center = offsetCenter(SPOTS[id].coordinate, delta, bottomInset);
      mapRef.current?.animateToRegion(regionAround(center, delta), 350);
    },
    focusPin(id: string) {
      const pin = pins?.find((p) => p.placeId === id);
      if (!pin) return;
      mapRef.current?.animateToRegion(regionAround({ latitude: pin.lat, longitude: pin.lng }, 0.005), 350);
    },
    recenter() {
      const delta = 0.012;
      mapRef.current?.animateToRegion(regionAround(offsetCenter(USER_LOCATION, delta), delta), 350);
    },
    fitAll() {
      mapRef.current?.animateToRegion(ALL_REGION, 350);
    },
  }));

  // Chiếu toạ độ địa lý sang toạ độ màn hình. Nội suy tuyến tính: ở khoảng cách
  // trong một thành phố, méo Mercator theo vĩ độ nhỏ hơn một pixel.
  const project = useCallback(
    (coordinate: Coordinate) => {
      const west = region.longitude - region.longitudeDelta / 2;
      const north = region.latitude + region.latitudeDelta / 2;
      return {
        x: ((coordinate.longitude - west) / region.longitudeDelta) * size.width,
        y: ((north - coordinate.latitude) / region.latitudeDelta) * size.height,
      };
    },
    [region, size.width, size.height],
  );

  const ready = size.width > 0 && size.height > 0;

  return (
    <View onLayout={onLayout} style={[styles.fill, style]}>
      <MapView
        customMapStyle={mapStyle}
        initialRegion={regionRef.current}
        onMapReady={restoreCamera}
        onPress={onPressMap}
        onRegionChange={trackRegion}
        onRegionChangeComplete={trackRegion}
        pitchEnabled={false}
        provider={PROVIDER_GOOGLE}
        ref={mapRef}
        rotateEnabled={false}
        showsCompass={false}
        showsMyLocationButton={false}
        showsUserLocation={false}
        style={StyleSheet.absoluteFill}
        toolbarEnabled={false}
        // Đổi theme phải remount: Android không áp lại `customMapStyle` khi chỉ
        // đổi prop.
        key={colorScheme}
      />

      {ready ? (
        // Lớp phủ chỉ cao tới mép sheet và `overflow: hidden`: ghim nằm dưới
        // sheet thì bị cắt hẳn, không bao giờ vẽ đè lên nội dung sheet.
        <View
          pointerEvents="box-none"
          style={[styles.overlay, { bottom: mapPadding?.bottom ?? 0 }]}>
          {pins.length > 0 ? (
            <GooglePin
              count={pins.length}
              onPress={() => {
                const coords = pins.map((p) => ({ latitude: p.lat, longitude: p.lng }));
                const region = regionFor(coords);
                if (region) mapRef.current?.animateToRegion(region, 350);
              }}
            />
          ) : null}
          <UserDot point={project(USER_LOCATION)} viewport={size} />
          {spots.map((id) => (
            <CheckinPin
              key={id}
              onPress={() => onSelectSpot?.(id)}
              point={project(SPOTS[id].coordinate)}
              selected={selectedSpot === id}
              spotId={id}
              viewport={size}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
});

type Point = { x: number; y: number };
type Viewport = { width: number; height: number };

/** Bỏ vẽ những gì đã ra ngoài khung, chừa một lề rộng để ghim không biến mất sớm. */
const onScreen = (point: Point, viewport: Viewport, margin = 260) =>
  point.x > -margin &&
  point.x < viewport.width + margin &&
  point.y > -margin &&
  point.y < viewport.height + margin;

/**
 * Ghim mang tên địa điểm và **số người đã check-in tại đó** — con số là lý do
 * ghim tồn tại, không phải chú thích.
 */
function CheckinPin({
  spotId,
  selected,
  onPress,
  point,
  viewport,
}: {
  spotId: SpotId;
  selected: boolean;
  onPress: () => void;
  point: Point;
  viewport: Viewport;
}) {
  const { colors } = useNookaTheme();
  const [box, setBox] = useState({ width: 0, height: 0 });
  const spot = SPOTS[spotId];
  const name = spotName(spotId);

  if (!onScreen(point, viewport)) return null;

  return (
    <Pressable
      accessibilityLabel={t('map.pinLabel', { count: spot.checkins, spot: name })}
      accessibilityRole="button"
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setBox((current) =>
          current.width === width && current.height === height ? current : { width, height },
        );
      }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pin,
        {
          left: point.x,
          top: point.y,
          // Mũi ghim nằm đúng toạ độ: dịch sang trái nửa bề ngang, lên trên
          // trọn bề cao.
          marginLeft: -box.width / 2,
          marginTop: -box.height,
          opacity: pressed ? 0.85 : 1,
          zIndex: selected ? 20 : 1,
        },
      ]}>
      <View
        style={[
          styles.pill,
          {
            backgroundColor: selected ? colors.inverseSurface : colors.surface,
            borderColor: selected ? colors.inverseSurface : colors.borderSubtle,
            shadowColor: colors.shadow,
          },
        ]}>
        <View style={[styles.pinDot, { backgroundColor: selected ? colors.accent : colors.accentStrong }]} />
        <Text style={[styles.pinName, { color: selected ? colors.onInverse : colors.text }]}>{name}</Text>
        <Text style={[styles.pinCount, { color: selected ? colors.accent : colors.accentInk }]}>
          {String(spot.checkins)}
        </Text>
      </View>
      <View
        style={[
          styles.stem,
          { height: selected ? 15 : 9, backgroundColor: selected ? colors.inverseSurface : colors.surface },
        ]}
      />
      <View
        style={[
          styles.head,
          selected ? styles.headSelected : styles.headRest,
          {
            backgroundColor: selected ? colors.accent : colors.surface,
            borderColor: selected ? colors.inverseSurface : colors.accentStrong,
          },
        ]}
      />
    </Pressable>
  );
}

function UserDot({ point, viewport }: { point: Point; viewport: Viewport }) {
  const { colors } = useNookaTheme();

  if (!onScreen(point, viewport, 80)) return null;

  return (
    <View
      accessibilityLabel={t('map.youAreHere')}
      pointerEvents="none"
      style={[styles.userWrap, { left: point.x - 22, top: point.y - 22 }]}>
      <View style={[styles.halo, { backgroundColor: colors.locationDot }]} />
      <View style={[styles.userDot, { backgroundColor: colors.locationDot, borderColor: colors.surface }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  overlay: { position: 'absolute', left: 0, right: 0, top: 0, overflow: 'hidden' },
  pin: { position: 'absolute', alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingLeft: 10,
    paddingRight: 12,
    paddingVertical: 7,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 4,
  },
  pinDot: { width: 8, height: 8, borderRadius: 4 },
  // Không đặt maxWidth và không `numberOfLines`: ghim phải ôm trọn tên thật.
  pinName: { fontSize: 12.5, lineHeight: 17, fontWeight: '700', letterSpacing: -0.2 },
  pinCount: { fontSize: 12, lineHeight: 17, fontWeight: '700' },
  stem: { width: 2 },
  head: { borderRadius: 999 },
  headRest: { width: 9, height: 9, borderWidth: 2.5 },
  headSelected: { width: 15, height: 15, borderWidth: 3 },
  // Halo là anh em với chấm, không phải cha — opacity của cha sẽ nhân xuống con.
  userWrap: { position: 'absolute', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  halo: { ...StyleSheet.absoluteFillObject, borderRadius: 22, opacity: 0.22 },
  userDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 3 },
});

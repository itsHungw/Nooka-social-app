import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { ladderHeight, ladderSprite, ladderWidth } from '@/features/nooka/ladder';
import { useNookaTheme } from '@/hooks/use-nooka-theme';

/**
 * Chiếc thang nhôm Nooka vác ra khi ô nhập cao quá tầm với.
 *
 * **Không có khung hình sinh sẵn.** Khác con linh vật, chiều cao chiếc thang chỉ
 * biết lúc chạy — nó phụ thuộc người dùng gõ mấy dòng. `ladderSprite` dựng lưới
 * đúng số bậc cần rồi nhớ lại theo số bậc, nên vẽ lại không tốn gì và ô pixel
 * luôn vuông. Kéo dãn một khung hình cố định thì ô thành hình chữ nhật dẹt và
 * cả món đồ hết là pixel art.
 *
 * Vẽ bằng SVG vì đúng lý do của `NookaSprite`: gộp theo màu thì cả chiếc thang
 * còn một view native, thay vì vài trăm `View` cho mỗi ô.
 *
 * Là đồ trang trí thuần: không nhận chạm, và **không có nhãn riêng cho trình
 * đọc màn hình** — việc đang xảy ra đã nằm trong nhãn của `NookaSprite`
 * ("Nooka đang trèo lên"). Đọc thêm một nhãn "cái thang" là kể hai lần.
 */
export function NookaLadder({ rungs, style }: { rungs: number; style?: StyleProp<ViewStyle> }) {
  const { colors } = useNookaTheme();
  const sprite = ladderSprite(rungs);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[{ width: ladderWidth(), height: ladderHeight(rungs) }, style]}>
      <Svg height="100%" viewBox={`0 0 ${sprite.w} ${sprite.h}`} width="100%">
        {sprite.paths.map((path) => (
          <Path d={path.d} fill={colors[path.token]} key={path.token} />
        ))}
      </Svg>
    </View>
  );
}

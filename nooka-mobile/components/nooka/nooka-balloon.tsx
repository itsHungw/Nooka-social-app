import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { balloonHeight, balloonSprite, balloonWidth } from '@/features/nooka/balloon';
import { useNookaTheme } from '@/hooks/use-nooka-theme';

/**
 * Quả bóng bay — phương tiện thứ hai để Nooka lên tới mép ô nhập, bốc thăm với
 * chiếc thang mỗi lượt.
 *
 * Cùng lý lẽ với `NookaLadder`: **không có khung hình sinh sẵn**, vì dây phải
 * dài theo cỡ linh vật để thân bóng nổi hẳn trên đỉnh đầu. `balloonSprite` dựng
 * lưới đúng độ dài dây cần rồi nhớ lại, nên ô pixel luôn vuông.
 *
 * Là đồ trang trí thuần: không nhận chạm, và không có nhãn riêng cho trình đọc
 * màn hình — việc đang xảy ra đã nằm trong nhãn của `NookaSprite`.
 */
export function NookaBalloon({ tail, style }: { tail: number; style?: StyleProp<ViewStyle> }) {
  const { colors } = useNookaTheme();
  const sprite = balloonSprite(tail);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[{ width: balloonWidth(), height: balloonHeight(tail) }, style]}>
      <Svg height="100%" viewBox={`0 0 ${sprite.w} ${sprite.h}`} width="100%">
        {sprite.paths.map((path) => (
          <Path d={path.d} fill={colors[path.token]} key={path.token} />
        ))}
      </Svg>
    </View>
  );
}

import { Image, StyleSheet } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

/**
 * Mascot Nooka — nhân vật cắt ra từ clip, đứng ở cuối thanh "Hỏi Nooka".
 *
 * Ảnh xuất sẵn ba mật độ (`@1x/@2x/@3x`), Metro tự chọn theo màn hình nên chỉ
 * `require` bản gốc. Nền clip là đen tuyền và đã được un-matte khi xuất ảnh —
 * không có quầng sáng, đọc được trên cả nền bar sáng lẫn tối.
 *
 * Nhịp trôi lên xuống lấy đúng chu kỳ idle của clip: 850ms một chiều, đảo
 * chiều liên tục thành một vòng 1.7s. Biên độ cố ý nhỏ (±1.5) vì ở 36px thì
 * chuyển động lớn hơn trông giật chứ không mượt.
 */

/** Tỉ lệ w/h của ảnh xuất từ clip. Đổi ảnh thì đổi luôn số này. */
const ASPECT = 28 / 40;

const FLOAT = {
  from: { transform: [{ translateY: 1.5 }] },
  to: { transform: [{ translateY: -1.5 }] },
};

export function NookaMascot({ size = 36 }: { size?: number }) {
  const reduceMotion = useReducedMotion();

  return (
    <Animated.View
      style={[
        { width: Math.round(size * ASPECT), height: size },
        reduceMotion
          ? null
          : {
              animationName: FLOAT,
              animationDuration: '850ms',
              animationDirection: 'alternate',
              animationIterationCount: 'infinite',
              animationTimingFunction: 'ease-in-out',
            },
      ]}>
      <Image resizeMode="contain" source={require('@/assets/images/nooka/nooka-mascot.png')} style={styles.image} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', height: '100%' },
});

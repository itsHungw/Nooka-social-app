import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import {
  ASCENT_MOVE,
  ascentPhaseMs,
  ascentResting,
  nextAscentPhase,
  onFrame,
  pickMeans,
  restingDwell,
  type AscentMeans,
  type AscentPhase,
} from '@/features/nooka/ascent';

/**
 * Kích thước đạo cụ cho một lượt, **chốt lúc mở màn và không đổi nữa**.
 *
 * Người dùng gõ thêm dòng giữa lúc Nooka đang trèo thì chiếc thang **không** dài
 * ra: Nooka trèo hết thang, nhảy bám vào khung ô nhập rồi bò tiếp dọc mép. Đó
 * là cách màn kịch xử lý ô nhập cao thêm — và cũng là lý do một chiếc thang
 * đang có người đứng trên không tự mọc thêm bậc dưới chân họ.
 */
export type AscentPlan = {
  /** Số bậc thang. Không có nghĩa gì với quả bóng. */
  rungs: number;
  /** Gót Nooka lên tới đâu khi hết đạo cụ, tính bằng pt. */
  rise: number;
};

export type AscentTrip = AscentPlan & {
  phase: AscentPhase;
  /** Phương tiện của lượt này. Bốc một lần lúc rời `away`, không đổi giữa chừng. */
  means: AscentMeans;
  /**
   * Đang hướng lên hay hướng xuống.
   *
   * Phải trả ra ngoài vì `hopping` **dùng chung cho cả hai chiều**, nên chỉ nhìn
   * chặng thì không biết cú nhảy đang đi sang khung hay đang quay về đạo cụ.
   * Và đây không suy được từ hoàn cảnh: ô nhập vẫn cao trong suốt lượt Nooka tự
   * tụt xuống nghỉ.
   */
  wants: boolean;
};

/**
 * Màn kịch "lên tới mép ô nhập", chạy theo đồng hồ.
 *
 * `possible` là **hoàn cảnh**, không phải mệnh lệnh: ô nhập còn cao hơn tầm với
 * thì Nooka *được phép* lên. Có lên hay không là ý của nhân vật, và hook giữ ý
 * đó ở `urge`.
 *
 * **Nooka tự quyết định lúc nào xuống.** Treo trên khung một lúc thì nó mỏi và
 * tụt xuống nghỉ, nghỉ chán thì lại leo lên — không đợi người dùng gửi tin.
 * Đồng hồ chỉ chạy ở **hai chặng nghỉ** (`ascentResting`): bấm giờ ngay lúc mới
 * có ý định thì quãng lấy đạo cụ và leo lên ăn mất một phần lượt treo, và chiếc
 * thang vừa dựng xong đã phải dọn đi.
 *
 * `restless` là "còn đang thức". Tắt nó thì Nooka đứng nguyên chỗ đang ở, dù
 * trên khung hay dưới đất — **đang ngủ thì không đổi ý**. Nhận từ ngoài chứ
 * không tự tính vì cơn buồn ngủ đếm theo thời gian *người dùng* để yên, không
 * theo chặng của màn kịch này.
 *
 * Hook chỉ đẩy máy trạng thái đi từng chặng và hẹn giờ cho chặng kế; luật đường
 * đi nằm ở `nextAscentPhase` và có test giữ.
 *
 * **Đổi ý giữa chừng là chuyện thường** — người dùng xoá bớt chữ trong lúc Nooka
 * còn đang trèo. Effect dựng lại khi `wants` đổi, đồng hồ cũ bị huỷ, và bước kế
 * tiếp lấy theo ý định mới ngay tại chặng đang đứng. Không chặng nào bị bỏ qua
 * nên đạo cụ không bao giờ biến mất dưới chân Nooka.
 *
 * **"Giảm chuyển động" thì không có màn kịch nào.** Ô nhập cao lên chỉ che phần
 * sau nó, mà chỗ ở của Nooka là bên trái ô nhập — đứng yên tại chỗ thì vẫn thấy
 * nhân vật, chỉ là không có thang và không có bóng.
 */
export function useNookaAscent(
  possible: boolean,
  restless: boolean,
  planFor: (means: AscentMeans) => AscentPlan,
): AscentTrip {
  const reduceMotion = useReducedMotion();
  const [trip, setTrip] = useState<AscentTrip>({
    phase: 'away',
    means: 'ladder',
    rungs: 0,
    rise: 0,
    wants: false,
  });
  // Ý của nhân vật, tách khỏi hoàn cảnh. Hết cớ thì tắt hẳn; còn cớ thì nó tự
  // bật tắt theo nhịp riêng.
  const [urge, setUrge] = useState(false);

  // Vòng lặp tự hẹn giờ nên phải đọc được lượt hiện tại mà không cần dựng lại
  // effect sau mỗi bước — dựng lại là mỗi bước reset đồng hồ của bước sau.
  const current = useRef(trip);
  const go = useCallback((next: AscentTrip) => {
    current.current = next;
    setTrip(next);
  }, []);

  // Kích thước đạo cụ chỉ đo **một lần** lúc mở màn, nên hàm đo phải đi qua ref:
  // đưa nó vào deps thì mỗi phím gõ dựng lại effect và đẩy máy trạng thái đi
  // thêm một chặng — Nooka nhảy vọt lên đỉnh. Gán lại mỗi lần render nên lúc
  // gọi nó vẫn đọc được chiều cao ô nhập hiện tại.
  const measure = useRef(planFor);
  measure.current = planFor;

  // Vừa có cớ là muốn lên ngay; hết cớ là xuống ngay. Ở giữa hai mốc đó thì
  // đồng hồ dưới quyết định.
  useEffect(() => {
    setUrge(possible);
  }, [possible]);

  // Chán chỗ đang đứng thì đổi chỗ. Chỉ chạy ở hai chặng nghỉ, và dựng lại mỗi
  // lần tới một chặng nghỉ mới nên mỗi lượt bốc một quãng thời gian riêng.
  //
  // `restless` tắt là **đứng nguyên chỗ đang ở**, dù trên khung hay dưới đất:
  // Nooka đang ngủ thì không đổi ý. Thiếu vế này thì người dùng để yên một lúc
  // là có một nhân vật vừa ngủ vừa trèo thang lên xuống.
  useEffect(() => {
    if (!possible || !restless || !ascentResting(trip.phase)) return;
    const timer = setTimeout(() => setUrge(!onFrame(trip.phase)), restingDwell(trip.phase));
    return () => clearTimeout(timer);
  }, [possible, restless, trip.phase]);

  const active = urge && possible && !reduceMotion;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const run = (after: number) => {
      timer = setTimeout(() => {
        const { phase, means, rungs, rise } = current.current;
        const next = nextAscentPhase(phase, active);
        if (next === phase) return; // tới nơi rồi, đứng đó chờ ý định đổi

        // Mở màn: bốc phương tiện rồi đo đạo cụ theo nó. Cả hai đứng yên tới
        // hết lượt — đổi phương tiện giữa chừng là một con đang trèo thang bỗng
        // thành một con đang cầm bóng.
        const opening = phase === 'away';
        const nextMeans = opening ? pickMeans() : means;
        const plan = opening ? measure.current(nextMeans) : { rungs, rise };

        go({ phase: next, means: nextMeans, wants: active, ...plan });
        run(ascentPhaseMs(next, nextMeans, plan.rungs));
      }, after);
    };

    // Nooka phải về tới chỗ ở rồi mới với được đạo cụ. Chỉ chờ ở nhịp đầu —
    // mọi chặng sau đều nối tiếp ngay.
    run(active && current.current.phase === 'away' ? ASCENT_MOVE.lead : 0);
    return () => clearTimeout(timer);
  }, [active, go]);

  // `wants` phải là ý định **hiện tại**, không phải ý định lúc chốt chặng gần
  // nhất: người dùng xoá bớt chữ ngay giữa cú nhảy thì chiều phải đổi tại chỗ,
  // chứ không đợi sang chặng sau mới biết mình đang đi đâu.
  return trip.wants === active ? trip : { ...trip, wants: active };
}

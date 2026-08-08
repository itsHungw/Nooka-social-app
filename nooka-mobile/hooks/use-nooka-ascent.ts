import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import {
  ASCENT_MOVE,
  ascentPhaseMs,
  ascentResting,
  duckDwell,
  nextAscentPhase,
  nextRimSpot,
  onFrame,
  perchPoseDwell,
  pickMeans,
  restingDwell,
  type AscentMeans,
  type AscentPhase,
  type RimSpot,
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

export type Ascent = AscentTrip & {
  /** Đang tụt xuống trốn sau bức tường chữ, ngay tại chỗ bám. */
  ducked: boolean;
  /** Đang bám ở đâu dọc mép. Đổi mỗi lượt nấp, và chỉ đổi lúc đang chìm. */
  rimSpot: RimSpot;
  /**
   * Đang đu lên đứng trên mép vẫy tay.
   *
   * Không phải một chặng của chuyến đi — Nooka vẫn ở nguyên trên mép, chỉ là
   * nhấc mình lên khỏi nó. Màn hình lo phần nhấc (`RIM_LIFT`), vì không ai vẫy
   * tay trong lúc treo người bằng hai bàn tay.
   */
  waving: boolean;
  /**
   * Trốn ngay tại mép — buông tay tụt xuống, rồi tự trèo lại lên nhìn.
   *
   * **Trả `false` khi Nooka không ở trên mép**, và người gọi phải có phản ứng
   * khác. Đây là bản sinh đôi của `hide` ở `useMascotStage`: cùng một ý muốn
   * ("đi trốn"), hai động tác khác nhau vì hai chỗ đứng khác nhau. Ở đâu thì
   * hệ sở hữu chỗ đó lo — dưới đất là hệ đi lại, trên mép là màn kịch này.
   * Cho hệ đi lại dịch ngang một Nooka đang bám mép thì nó rời khỏi mép.
   */
  duck: () => boolean;
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
): Ascent {
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
  // Đang trốn tại mép. Tách khỏi `phase` vì nó không phải một chặng của chuyến
  // đi — Nooka vẫn đang bám mép, chỉ là thả người xuống cho khuất.
  const [ducked, setDucked] = useState(false);
  // Chỗ bám dọc mép. Ref đi kèm vì máy trạng thái phải đọc được nó lúc dựng lại
  // effect mà không nhận nó làm dependency — nhận thì mỗi lần đổi chỗ bám là
  // máy bị đá đi một chặng.
  const [waving, setWaving] = useState(false);
  const [rimSpot, setRimSpot] = useState<RimSpot>(0);
  const rimRef = useRef(rimSpot);
  rimRef.current = rimSpot;

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
  //
  // `ducked` cũng khoá đồng hồ này: đang trốn thì lượt treo tạm dừng, hết trốn
  // mới đếm lại từ đầu. Thiếu vế đó thì có lúc Nooka đang chìm nghỉm sau bức
  // tường chữ đã tới giờ tụt xuống, và nó trồi lên chỉ để lập tức nhảy về đạo cụ
  // — người dùng thấy nhân vật giật lên một cái rồi biến mất.
  useEffect(() => {
    if (!possible || !restless || ducked || !ascentResting(trip.phase)) return;
    const timer = setTimeout(() => setUrge(!onFrame(trip.phase)), restingDwell(trip.phase));
    return () => clearTimeout(timer);
  }, [possible, restless, ducked, trip.phase]);

  const perched = onFrame(trip.phase);

  /**
   * Trốn xong thì trèo lại lên nhìn.
   *
   * **Không** phụ thuộc `restless`, khác mọi đồng hồ còn lại ở hook này: đây là
   * một chuyến do cú chạm của người dùng mở ra, và chuyến đã đi thì phải về.
   * Gắn nó vào "còn thức không" thì người dùng chạm vào Nooka rồi ngồi im chín
   * giây là nhân vật ngủ quên trong lúc đang chìm nghỉm — không có gì trên màn
   * hình nữa, và cũng không còn gì để chạm cho nó tỉnh.
   */
  useEffect(() => {
    if (!ducked) return;
    const timer = setTimeout(() => setDucked(false), duckDwell());
    return () => clearTimeout(timer);
  }, [ducked]);

  const duck = useCallback((): boolean => {
    // Đọc chặng từ ref chứ không từ state: cú chạm tới bất cứ lúc nào, kể cả
    // giữa hai lần render.
    if (reduceMotion || !onFrame(current.current.phase)) return false;
    setDucked(true);
    // Chốt chỗ bám mới **ngay lúc chìm xuống**, không đợi lúc trồi lên: màn hình
    // hoãn cú dịch đúng một nhịp `dip` nên nó diễn trọn vẹn trong lúc Nooka còn
    // khuất. Đợi tới lúc trồi mới đổi thì cú dịch chạy trước mắt người dùng.
    setRimSpot(nextRimSpot);
    return true;
  }, [reduceMotion]);

  const active = urge && possible && !reduceMotion;

  /**
   * Hết cớ ở lại trên mép, hoặc đã rời mép: về chỗ bám gốc và thôi nấp.
   *
   * Đường xuống bắt đầu từ **trên đầu đạo cụ**, nên trước khi nhảy về Nooka phải
   * trồi lên khỏi chỗ nấp rồi bò dọc mép về đó. Máy trạng thái bên dưới chờ đúng
   * `ASCENT_MOVE.rimHome` cho hai việc ấy — hai vế phải đi cùng nhau, đặt lệch
   * một bên là nhân vật nhảy đi từ chỗ nó chưa kịp bò tới.
   *
   * Vế `!perched` lo nốt trường hợp đã rời mép vì lý do khác: để sót `ducked`
   * hay `rimSpot` bật thì phép dịch của cú nấp đi theo Nooka suốt đường xuống,
   * và nó tụt thang ở một chỗ lệch hẳn khỏi cái thang.
   */
  useEffect(() => {
    if (active && perched) return;
    setDucked(false);
    setRimSpot(0);
  }, [active, perched]);

  /**
   * Trên mép thì đổi tư thế theo nhịp riêng: treo yên nhìn qua, rồi đu lên vẫy
   * một lúc, rồi lại treo.
   *
   * Cùng vai trò với `nextPeekPose` ở hệ đi lại — chỉ khác là trên mép chỉ có
   * hai tư thế nên "khác tư thế hiện tại" thành ra đổi qua lại. Nhịp thì lấy
   * chung `PEEK_DWELL`: cùng một nhân vật, không nên đổi ý nhanh chậm tuỳ chỗ
   * đang đứng.
   *
   * Ba cửa đóng: rời mép (không còn mép để đứng), đang nấp (đang khuất thì vẫy
   * cho ai xem), và ngủ hẳn (`restless`). Mỗi cửa đóng đều **đưa về tư thế treo**
   * chứ không giữ nguyên — bỏ sót thì Nooka mang quãng nhấc người ấy đi khắp nơi
   * và nó tụt thang trong lúc lơ lửng cao hơn mặt đất một đoạn.
   */
  useEffect(() => {
    if (!perched || ducked || !restless) {
      setWaving(false);
      return;
    }
    const timer = setTimeout(() => setWaving((on) => !on), perchPoseDwell());
    return () => clearTimeout(timer);
  }, [perched, ducked, restless, waving]);

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

    // Hai chỗ phải chờ nhân vật đi tới nơi trước, và **chỉ** hai chỗ đó — mọi
    // chặng khác nối tiếp ngay:
    //
    //   lead    — dưới đất: về tới chỗ ở rồi mới với được đạo cụ
    //   rimHome — trên mép: trồi lên khỏi chỗ nấp và bò về trên đầu đạo cụ rồi
    //             mới nhảy về được
    const opening = current.current.phase === 'away';
    const stranded = !active && onFrame(current.current.phase) && rimRef.current !== 0;
    run(active && opening ? ASCENT_MOVE.lead : stranded ? ASCENT_MOVE.rimHome : 0);
    return () => clearTimeout(timer);
  }, [active, go]);

  // `wants` phải là ý định **hiện tại**, không phải ý định lúc chốt chặng gần
  // nhất: người dùng xoá bớt chữ ngay giữa cú nhảy thì chiều phải đổi tại chỗ,
  // chứ không đợi sang chặng sau mới biết mình đang đi đâu.
  return { ...trip, wants: active, ducked, rimSpot, waving, duck };
}

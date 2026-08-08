import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NookaBalloon } from '@/components/nooka/nooka-balloon';
import { NookaLadder } from '@/components/nooka/nooka-ladder';
import { NookaSprite } from '@/components/nooka/nooka-sprite';
import { Chip, CircleButton, ResultRow, ScreenShell } from '@/components/nooka/ui';
import { checkinLine, formatDistance, spotName, tagLabel, tagSynonyms } from '@/features/nooka/labels';
import {
  ASCENT_MOVE,
  ASCENT_SLACK,
  PAW_RATIO,
  ascentAct,
  ascentLength,
  ascentOnStage,
  ascentPhaseMs,
  ascentPins,
  ascentSettling,
  climbStop,
  gripRise,
  needsAscent,
  onFrame,
  perchSink,
  risingUp,
} from '@/features/nooka/ascent';
import {
  BALLOON_BOB,
  BALLOON_HAND_GRIP,
  BALLOON_HAND_SIT,
  BALLOON_LEAN,
  BALLOON_SWAY,
  balloonHeight,
  balloonHold,
  balloonTail,
  balloonWidth,
} from '@/features/nooka/balloon';
import { ladderRungs, ladderWidth } from '@/features/nooka/ladder';
import { MASCOT_H, MASCOT_MOVE, MASCOT_W, isWaiting, type MascotState } from '@/features/nooka/mascot';
import { MOOD_SETTLE, isAsleep, isDrowsy } from '@/features/nooka/mood';
import { explainTags, matchTags, rankSpots, spotTags } from '@/features/nooka/ranking';
import { INTENT_IDS, SPOTS, TAG_IDS, type IntentId, type SpotId, type TagId } from '@/features/nooka/spots';
import { useMascotStage } from '@/hooks/use-mascot-stage';
import { useNookaAscent } from '@/hooks/use-nooka-ascent';
import { useNookaMood } from '@/hooks/use-nooka-mood';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';
import { useNookaDemo } from '@/providers/nooka-demo-provider';

/**
 * Hỏi Nooka — Intent Mode (§4 và §6.2 của spec), dựng thành một đoạn hội thoại.
 *
 * Vì sao là chat chứ không phải form: **trí nhớ**. Bản form cũ coi mỗi câu hỏi
 * là một lần bắt đầu lại, muốn sửa một ý phải gõ lại cả câu. Ở đây tag của lượt
 * trước vẫn còn hiệu lực nên hỏi tiếp là thu hẹp thêm, không phải hỏi lại.
 *
 * **Ranh giới AI là ràng buộc hình thức, không phải một dòng chữ nhỏ.** Lượt của
 * Nooka chỉ nói nó vừa làm gì — đọc bao nhiêu review, hiểu ra tag nào, còn mấy
 * chỗ. Mọi câu mô tả một quán đều nằm trong `ResultRow` và thuộc về người thật.
 * Thêm một câu kiểu "chỗ này hợp để làm việc" vào bong bóng là phá đúng thứ
 * §6.2 khoá.
 */

type Turn =
  | { kind: 'ask'; id: number; text: string }
  | { kind: 'answer'; id: number; tags: TagId[]; spots: SpotId[]; read: number };

/**
 * Nooka ở thanh nhắn tin có **một** lớp phủ và hai điểm neo, không phải hai chỗ
 * dựng riêng: chỗ ở là bên trái ô nhập, chỗ trốn là sau ô nhập. Đi từ chỗ này
 * sang chỗ kia là một phép dịch trên chính lớp đó — dựng hai nơi thì lúc chuyển
 * là một con biến mất và một con hiện ra, không ai đọc ra đó là cùng nhân vật.
 *
 * **Ô nhập không đổi kích cỡ.** Chỗ của Nooka được chừa cứng bằng `paddingLeft`
 * trong `inputRow`; Nooka đi hay trốn thì ô nhập vẫn đúng bề ngang đó. Ô nhập
 * co giãn theo bước chân của một món trang trí là thứ mắt bắt được ngay, và nó
 * kéo theo cả nút gửi nhích qua nhích lại.
 */
const MASCOT_SIZE = 46;
/** Chiều cao suy ra từ tỉ lệ lưới, đúng như `NookaSprite` tự tính. */
const MASCOT_HEIGHT = Math.round((MASCOT_SIZE * MASCOT_H) / MASCOT_W);
/** Bề ngang chừa cho Nooka bên trái ô nhập, tính cả khoảng thở. */
const MASCOT_SLOT = MASCOT_SIZE + 10;
/**
 * Chỗ trốn lệch so với chỗ ở: đi ngang hẳn vào vùng ô nhập rồi mới nhô lên.
 * `x` phải vượt qua `MASCOT_SLOT` — chưa qua khỏi mép trái ô nhập thì không có
 * gì che, và cú nhô lên diễn ra giữa thanh trống.
 */
const BEHIND_OFFSET = { x: MASCOT_SLOT + 10, y: 30 };
const RIGHT_OFFSET = { x: 210, y: 30 };
/** `minHeight` của ô nhập — chiều cao lúc mới vào, trước khi đo được thật. */
const FIELD_MIN = 44;

/**
 * Nhô lên tới đâu khi **chưa có đạo cụ**: đúng mép ô nhập hiện tại, chặn ở hết
 * tầm kiễng chân.
 *
 * `BEHIND_OFFSET.y` một mình chỉ đúng ở **đúng một** chiều cao — lúc ô nhập ở
 * `minHeight`, chỗ hai bàn tay vừa chạm mép (có test ở `ascent.test.ts`). Gõ
 * sang dòng thứ hai là mép cao lên mà quãng nhô vẫn y nguyên, và tư thế `grip`
 * bám vào khoảng không dưới mép. Chặn trên đặt đúng bằng ngưỡng của
 * `needsAscent` nên hai bên nối liền nhau, không có khe: còn trong tầm thì kiễng
 * chân là tới mép, quá tầm thì đã có đạo cụ lo.
 */
const PEEK_REACH = BEHIND_OFFSET.y + ASCENT_SLACK;

/**
 * Phép dịch của hệ **đi lại quanh ô nhập** — đi trốn, và nhô lên khỏi mép.
 *
 * Cả Nooka lẫn quả bóng đọc từ đây. Quả bóng đang **được cầm trên tay**, nên mọi
 * phép dịch tác động lên nhân vật phải tác động lên nó y hệt; để lớp bóng chỉ
 * chịu phép dịch của màn kịch leo thì mỗi bước Nooka đi trốn là sợi dây tuột
 * khỏi tay đúng bằng ngần ấy, và cả hai cùng bay lên trong lúc cách nhau một
 * quãng. Viết hai lần ở hai lớp thì tới lúc sửa một bên sẽ có một bên bị bỏ
 * quên, và dấu hiệu vẫn đúng là sợi dây đó.
 *
 * `reach` là mép ô nhập hiện tại đã chặn ở tầm với — xem `PEEK_REACH`.
 */
function stageShift(walked: number, lifted: number, reach: number) {
  'worklet';
  return {
    x:
      walked <= 1
        ? walked * BEHIND_OFFSET.x
        : BEHIND_OFFSET.x + (walked - 1) * (RIGHT_OFFSET.x - BEHIND_OFFSET.x),
    y: -lifted * reach,
  };
}

/**
 * Chiếc thang nhôm của Nooka đứng **thẳng đứng** ngay cạnh ô nhập (không nghiêng chéo).
 *
 * Chân thang đứng ở vị trí Nooka bên trái ô nhập, đầu thang hướng thẳng đứng lên.
 * Nooka trèo thẳng đứng lên theo thân thang rồi mới nhảy bám sang mép ô nhập.
 */
const ASCENT_RUN = 0;
/** Chỗ bám: cùng chỗ trốn cũ, tức là đã lọt vào sau ô nhập. */
const GRIP_X = BEHIND_OFFSET.x;
/** Cú nhảy vồng lên bao nhiêu ở giữa chừng. Nhảy phẳng lì thì đó là trôi ngang. */
const HOP_ARC = 12;

/**
 * Đạo cụ đứng ở đâu theo bề ngang:
 *
 * - Chân thang nằm giữa vị trí Nooka.
 * - Quả bóng **neo vào bàn tay trái** của Nooka, không phải vào giữa thân.
 *   `balloonHold` trả về đúng chỗ đáy dây phải rơi; lớp bóng lùi lại nửa bề
 *   ngang để **đáy dây**, chứ không phải mép trái ảnh, trùng vào bàn tay đó.
 *   Neo bằng mép ảnh là quả bóng lệch đi đúng nửa bề ngang của nó, và dây rơi
 *   vào giữa bụng — đó là cái làm nó trông như bị cắm vào người.
 */
const LADDER_LEFT = 16 + (MASCOT_SIZE - ladderWidth()) / 2;
const BALLOON_HOLD = balloonHold(MASCOT_SIZE, MASCOT_HEIGHT);
const BALLOON_LEFT = 16 + BALLOON_HOLD.x - balloonWidth() / 2;

/**
 * Bám vào khung là **đổi tư thế**: hai bàn tay hạ xuống và dạt ra, nên chỗ neo
 * dây dời theo. Chênh lệch này chạy cùng `perched` — tức là quả bóng theo tay
 * suốt cú nhảy chứ không giật một nhịp lúc đổi khung hình.
 */
const BALLOON_HOLD_GRIP = balloonHold(MASCOT_SIZE, MASCOT_HEIGHT, BALLOON_HAND_GRIP);
const BALLOON_SHIFT = {
  x: BALLOON_HOLD_GRIP.x - BALLOON_HOLD.x,
  drop: BALLOON_HOLD.y - BALLOON_HOLD_GRIP.y,
};

/**
 * Quãng đu người lên **khỏi mép**, dùng chung cho hai việc Nooka không làm được
 * trong lúc treo bằng hai bàn tay: **ngủ** và **vẫy tay**.
 *
 * Cả hai đều là "đưa cả người lên trên mép", nên đều là đúng một quãng: khoảng
 * mà tư thế treo **thấp hơn** mép. Treo thì bàn tay đặt lên mép và thân chìm sau
 * ô nhập; nhấc ngần này thì gót chạm mép và cả người ở trên. Xem `PAW_RATIO`.
 *
 * Tên cũ là `SIT_LIFT` — đổi khi cú vẫy dùng chung, vì "ngồi" chỉ còn đúng một
 * nửa số chỗ gọi nó.
 */
const RIM_LIFT = MASCOT_HEIGHT * PAW_RATIO;

/**
 * Trốn **ngay tại mép**: buông tay thả người xuống sau bức tường chữ.
 *
 * Dưới đất Nooka trốn bằng cách đi ngang vào sau ô nhập — trên mép thì đi ngang
 * là rời khỏi mép. Quãng thả suy ra từ hình (xem `perchSink`) nên đỉnh đầu hạ
 * xuống khít mép ô nhập, và ô nhập vẽ **sau** lớp linh vật nên nó che nốt phần
 * còn lại. Không cần xén, không cần lớp phủ riêng: bức tường chữ vốn đã là thứ
 * Nooka nấp sau.
 */
const PERCH_SINK = perchSink(MASCOT_HEIGHT);

/**
 * Nấp xong thì **trồi lên ở chỗ khác**: lệch sang phải một quãng dọc mép.
 *
 * Rộng hơn chính Nooka một chút nên cú đổi chỗ đọc ra ngay là "nó vừa đi đâu đó"
 * chứ không phải "hình bị lệch". Nhưng cũng **không rộng hơn nhiều**: quãng này
 * là quãng cú nhảy về phải gánh thêm nếu Nooka còn đứng lệch, và ở đây nó không
 * gánh — `ASCENT_MOVE.rimHome` bắt nó bò về trước. Giữ nhỏ để lỡ có ngày ai đó
 * bỏ quãng chờ đó thì hỏng cũng còn nhẹ.
 */
const RIM_STEP = MASCOT_SLOT;

/** Ngồi thì hai tay buông xuống, chỗ neo dây bóng dời theo lần nữa. */
const BALLOON_HOLD_SIT = balloonHold(MASCOT_SIZE, MASCOT_HEIGHT, BALLOON_HAND_SIT);
const BALLOON_SIT_SHIFT = {
  x: BALLOON_HOLD_SIT.x - BALLOON_HOLD_GRIP.x,
  drop: BALLOON_HOLD_GRIP.y - BALLOON_HOLD_SIT.y,
};
/**
 * Quãng đạo cụ trượt vào. Đủ để **cả chân thang** cũng nằm ngoài mép trái màn
 * hình lúc chưa dùng tới — chỉ đẩy khuất phần trên thì lúc bắt đầu vẫn thấy một
 * mẩu thang đứng sẵn ở đó.
 */
const PROP_TRAVEL = LADDER_LEFT + ladderWidth() + 10;
/**
 * Quả bóng đi quãng **ngắn hơn** chiếc thang, vì nó vốn đứng gần mép trái hơn.
 * Dùng chung một quãng thì hơn nửa thời gian dạt tới diễn ra ngoài màn hình và
 * quả bóng như bật ra từ hư không ở nhịp cuối.
 */
const BALLOON_TRAVEL = BALLOON_LEFT + balloonWidth() + 10;

/**
 * Dây bóng dài theo cỡ linh vật; đáy dây rơi đúng tâm bàn tay trái đang giơ lên
 * — hàng 32 cột 7 của lưới sprite, xem `BALLOON_HAND` ở `balloon.ts`.
 */
const BALLOON_TAIL = balloonTail(MASCOT_HEIGHT);
const BALLOON_BOTTOM = BALLOON_HOLD.y;

export default function AskNookaScreen() {
  const router = useRouter();
  const { colors } = useNookaTheme();
  const insets = useSafeAreaInsets();
  const demo = useNookaDemo();
  const scroller = useRef<ScrollView>(null);
  const nextId = useRef(0);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [tags, setTags] = useState<TagId[]>([]);
  const [mascot, setMascot] = useState<MascotState>('idle');
  const [fieldH, setFieldH] = useState(FIELD_MIN);
  /**
   * Mốc của phím gõ cuối cùng — đồng hồ buồn ngủ đếm từ đây.
   *
   * Là state chứ không phải `Date.now()` đọc lúc render: đọc trực tiếp thì nó
   * đổi mỗi lần vẽ, đồng hồ reset liên tục và Nooka không bao giờ ngủ được.
   */
  const [typedAt, setTypedAt] = useState(0);

  const synonyms = useMemo(() => tagSynonyms(TAG_IDS), []);
  const answered = turns.length > 0;
  const padBottom = Math.max(insets.bottom, 6) + 4;

  /**
   * Ô nhập là multiline nên nó cao dần theo số dòng người dùng gõ. Tới một lúc
   * mép trên vượt hẳn tầm với của Nooka và nhân vật chìm nghỉm sau bức tường
   * chữ — đó là lúc đạo cụ có việc.
   *
   * Đo bằng `onLayout` chứ không tính từ số ký tự: xuống dòng, dán một đoạn dài
   * hay đổi cỡ chữ hệ thống đều làm ô nhập cao lên, và chỉ chiều cao thật mới
   * kể đúng cả ba.
   */
  const rise = gripRise(fieldH, MASCOT_HEIGHT);

  /**
   * **Hoàn cảnh, không phải mệnh lệnh.** Ô nhập cao quá tầm với thì Nooka *được
   * phép* lên; lên hay xuống lúc nào là ý của nhân vật và do `useNookaAscent`
   * giữ. Nó tự tụt xuống nghỉ rồi tự leo lại, không đợi người dùng gửi tin.
   */
  const canAscend = needsAscent(rise, BEHIND_OFFSET.y) && isWaiting(mascot);

  /**
   * Buồn ngủ đếm theo **thời gian người dùng để yên**, từ phím gõ cuối cùng —
   * xem `useNookaMood`. Cố ý không phụ thuộc vào Nooka đang ở chặng nào: cơn
   * buồn ngủ là chuyện của người dùng, còn chỗ đứng chỉ quyết định vẽ tư thế
   * nào. Tính trước cả `useNookaAscent` vì màn kịch leo cần biết nó còn thức
   * hay không — mà nếu chờ có chặng rồi mới tính thì hai bên phụ thuộc vòng.
   */
  const mood = useNookaMood(typedAt, isWaiting(mascot));
  const drowsy = isDrowsy(mood);

  // Đo đạo cụ **một lần lúc mở màn**. Hook giữ hàm này trong ref và chỉ gọi khi
  // rời `away`, nên nó đọc đúng chiều cao ô nhập ở khoảnh khắc đó rồi thôi:
  // người dùng gõ thêm dòng sau đó thì chiếc thang không dài ra, Nooka bám vào
  // khung mà bò tiếp.
  /**
   * **Lim dim vẫn đổi ý được; ngủ hẳn mới đứng nguyên chỗ.**
   *
   * `restless` từng nhận `!drowsy`, và đó là chỗ làm mất hai trong ba việc Nooka
   * biết làm: mốc lim dim (9s) tới trước *mọi* lượt treo, nên người dùng ngồi
   * yên là nó luôn luôn ngủ tại chỗ đang đứng — không bao giờ kịp tự tụt xuống
   * nghỉ hay tự leo lên lại. Lấy mốc `sleep` thì cả ba việc cùng đua với đồng hồ
   * ngủ, và lần nào thấy cái nào là ngẫu nhiên. Xem `PERCH_DWELL`.
   *
   * Hệ đi lại quanh ô nhập vẫn dừng ở `drowsy` — đó là chuyện khác: đi lang
   * thang với đôi mắt lim dim thì đọc ra là nhân vật đang mộng du.
   */
  const trip = useNookaAscent(canAscend, !isAsleep(mood), () => ({
    rise,
    // Thang dựa nghiêng nên chiều dài đo theo **cạnh huyền**, không phải quãng
    // dọc — thang ngắn hơn khoảng nó phải bắc qua là thang chống lên không khí.
    rungs: ladderRungs(ascentLength(ASCENT_RUN, rise)),
  }));
  const { phase, means, rungs, duck } = trip;
  const act = ascentAct(phase, means, trip.waving);

  /**
   * Biểu cảm chỉ **hiện ra khi Nooka đang nghỉ tại chỗ**: bám mép ô nhập, hoặc
   * đứng dưới đất. Đang kéo thang, đang trèo hay đang nhảy thì nó có việc, và
   * `null` ở đây là cách nói với `NookaSprite` rằng đừng diễn tư thế ngủ.
   *
   * Cơn buồn ngủ vẫn chạy nền suốt thời gian đó — chỗ đứng chỉ chọn tư thế thân,
   * không quyết định nhân vật buồn ngủ tới đâu.
   */
  const perch = onFrame(phase) ? 'frame' : ascentOnStage(phase) ? null : 'ground';

  /**
   * **Chỗ đứng của Nooka do đúng một hệ quyết định tại một thời điểm.**
   *
   * `ascentPins` là cả cái luật đó, viết một lần: còn cớ để lên (`canAscend`,
   * **hoàn cảnh** chứ không phải chặng — ô nhập còn cao thì sau ô nhập là chỗ
   * không ai nhìn thấy gì, kể cả trong lượt Nooka đang nghỉ dưới đất giữa hai
   * lần leo), hoặc đạo cụ còn trên màn hình. Trong suốt quãng đó, hệ đi lại
   * không được dời nhân vật đi đâu — kể cả khi người dùng chạm vào nó.
   *
   * Ba điều kiện, **một** tham số: `pinned`, `isWaiting` (đang đọc review hay
   * vừa reo mừng thì phải đứng trọn con bên trái để còn thấy nó làm gì) và
   * `drowsy` (đã ngủ thì không đi đâu nữa). Cộng lại thành quyền dời Nooka, và
   * `useMascotStage` đọc đúng quyền đó cho **cả** đồng hồ đi lang thang lẫn cửa
   * sau `hide` — xem hook. Tách cú chạm ra một điều kiện riêng là chép lại danh
   * sách này lần thứ hai: bản chép thiếu vế nào thì đúng vế đó dời được Nooka
   * khỏi chỗ mà không ai còn đưa nó về, và phép dịch bỏ quên ấy cộng thẳng vào
   * màn kịch leo.
   */
  const pinned = ascentPins(phase, canAscend);
  const { stage, hide } = useMascotStage(isWaiting(mascot) && !pinned && !drowsy);

  // Hai đoạn, **không bao giờ chạy cùng lúc**: đi ngang vào sau ô nhập rồi mới
  // nhô lên; và hạ xuống hết rồi mới đi ngang về. Chạy song song thì Nooka đi
  // chéo và cú lên xuống lộ ra ngay bên trái ô nhập, chỗ chẳng có gì che.
  const walked = useSharedValue(0);
  const lifted = useSharedValue(0);
  useEffect(() => {
    const { walk: walkMs, lift: liftMs } = MASCOT_MOVE;
    if (stage.spot === 'behind') {
      walked.value = withTiming(1, { duration: walkMs });
      lifted.value = withDelay(walkMs, withTiming(1, { duration: liftMs }));
      return;
    }
    if (stage.spot === 'right') {
      walked.value = withTiming(2, { duration: walkMs });
      lifted.value = withDelay(walkMs, withTiming(1, { duration: liftMs }));
      return;
    }
    lifted.value = withTiming(0, { duration: liftMs });
    walked.value = withDelay(liftMs, withTiming(0, { duration: walkMs }));
  }, [stage.spot, walked, lifted]);

  /**
   * Đạo cụ vào chỗ: 0 là còn ngoài mép trái màn hình, 1 là đã tựa vào khung ô
   * nhập. Một giá trị chạy cả hai chuyện — trượt vào và ngả dựa — vì đó là
   * **một** động tác đặt, không phải hai.
   *
   * Chạy theo `ascentSettling` chứ không phải `ascentInPlace`: cú trượt vào phải
   * diễn **trong** chặng `arriving`. Lấy mốc "đã tới nơi" thì đạo cụ đứng im
   * suốt chặng đó rồi mới lết vào lúc Nooka đã bắt đầu trèo.
   */
  const propIn = useSharedValue(0);
  const settling = ascentSettling(phase);
  useEffect(() => {
    propIn.value = withTiming(settling ? 1 : 0, {
      duration: settling ? ascentPhaseMs('arriving', means, rungs) : ASCENT_MOVE.stow,
    });
  }, [settling, means, rungs, propIn]);

  /**
   * Quãng đã đi dọc đạo cụ: 0 dưới đất, 1 ở đầu thang / hết tầm quả bóng.
   *
   * Thang thì `Easing.steps` làm cú lên giật từng nấc đúng một bậc một nhịp —
   * trôi mượt thì trông như đang bay lên cạnh cái thang chứ không phải trèo nó.
   * Quả bóng thì ngược lại, phải mượt: một quả bóng bay giật cục là quả bóng
   * đang bị ai đó kéo dây.
   */
  const travel = useSharedValue(0);
  const going = risingUp(phase);
  useEffect(() => {
    travel.value = withTiming(going ? 1 : 0, {
      duration: ascentPhaseMs('climbing', means, rungs),
      easing: means === 'ladder' ? Easing.steps(rungs, true) : Easing.inOut(Easing.sin),
    });
  }, [going, means, rungs, travel]);

  /**
   * Cú nhảy sang bám khung: 0 là còn ở đầu đạo cụ, 1 là đã bám vào mép ô nhập.
   *
   * Chiều của cú nhảy đọc từ **ý định hiện tại**, không phải từ tên chặng —
   * `hopping` dùng chung cho cả nhảy sang lẫn nhảy về. Nhờ vậy người dùng xoá
   * bớt chữ ngay giữa lúc Nooka đang bay ngang thì nó quay đầu tại chỗ.
   */
  const perched = useSharedValue(0);
  const toFrame = onFrame(phase) || (phase === 'hopping' && trip.wants);
  useEffect(() => {
    perched.value = withTiming(toFrame ? 1 : 0, { duration: ASCENT_MOVE.hop });
  }, [toFrame, perched]);

  /** Vồng lên giữa cú nhảy rồi hạ lại. Nhảy phẳng lì thì đó là trôi ngang. */
  const arc = useSharedValue(0);
  useEffect(() => {
    if (phase !== 'hopping') return;
    arc.value = withSequence(
      withTiming(HOP_ARC, { duration: ASCENT_MOVE.hop / 2 }),
      withTiming(0, { duration: ASCENT_MOVE.hop / 2 }),
    );
  }, [phase, arc]);

  /**
   * Hai độ cao, và đây là chỗ cả màn kịch có nghĩa:
   *
   * - `top` là đầu đạo cụ. **Chốt lúc mở màn** và đứng yên — một chiếc thang
   *   đang có người đứng trên thì không tự mọc thêm bậc dưới chân họ.
   * - `rim` là mép ô nhập **hiện tại**, chạy theo từng dòng người dùng gõ.
   *
   * Đang treo trên khung mà người dùng gõ thêm thì `rim` cao lên và Nooka bò
   * theo — đó là toàn bộ cách màn kịch xử lý ô nhập cao thêm sau khi đạo cụ đã
   * hết tầm.
   */
  // Nooka dừng thấp hơn đầu đạo cụ một quãng để cú nhảy còn là nhảy **lên** —
  // xem `climbStop`. Cả hai con số dưới đây chỉ đổi lúc mở màn.
  const reach = climbStop(ascentLength(ASCENT_RUN, trip.rise));
  const climbRun = ASCENT_RUN * reach;

  const top = useSharedValue(0);
  useEffect(() => {
    // Chỉ đổi lúc mở màn, mà lúc đó `travel` còn bằng 0 nên gán thẳng không lộ.
    top.value = trip.rise * reach;
  }, [trip.rise, reach, top]);

  const rim = useSharedValue(0);
  useEffect(() => {
    rim.value = withTiming(rise, { duration: ASCENT_MOVE.step });
  }, [rise, rim]);

  /**
   * Đu người lên ngồi trên mép: 0 là còn treo bằng hai bàn tay, 1 là đã ngồi hẳn
   * lên mép. Chỉ có việc khi Nooka **đang ở trên khung** — ngủ dưới đất thì nó
   * ngồi ngay tại chỗ, không phải nhấc đi đâu.
   */
  const sat = useSharedValue(0);
  // Đang trốn thì không ngồi lên mép: chỗ ngồi ở **trên** mép, mà trốn là đang
  // ở dưới. Cộng cả hai thì Nooka ngủ ngồi lơ lửng nửa trong nửa ngoài bức
  // tường chữ.
  const napping = perch === 'frame' && mood === 'sleep' && !trip.ducked;
  useEffect(() => {
    sat.value = withTiming(napping ? 1 : 0, { duration: MOOD_SETTLE });
  }, [napping, sat]);

  /**
   * Đu lên đứng hẳn trên mép để vẫy tay: 0 là còn treo, 1 là đã đứng trên mép.
   *
   * **Không ai vẫy tay trong lúc treo người bằng hai bàn tay** — cùng lý do làm
   * cho "ngủ là ngồi", nên cũng đúng một quãng nhấc (`RIM_LIFT`) và cùng nhịp
   * (`MOOD_SETTLE`) với cú đu lên ngồi. Nhờ vậy tư thế vẫy dùng lại được nguyên
   * khung `IDLE` sẵn có: đứng trên mép thì cả cánh tay nằm trên nền trống.
   *
   * Không bao giờ chồng với `sat`: vẫy đòi Nooka còn thức (`restless`), mà ngồi
   * ngủ thì đã qua mức đó rồi.
   */
  const stood = useSharedValue(0);
  useEffect(() => {
    stood.value = withTiming(trip.waving ? 1 : 0, { duration: MOOD_SETTLE });
  }, [trip.waving, stood]);

  /**
   * Thả người xuống trốn sau bức tường chữ: 0 là còn treo nhìn qua mép, 1 là đã
   * khuất hẳn. Dùng chung nhịp `dip` với cú trốn dưới đất — cùng một động tác
   * chìm xuống, chỉ khác chỗ đứng, nên không đáng có hai con số.
   *
   * **Cả hai lớp đọc từ đây**, y như `stageShift`: quả bóng đang nằm trong tay
   * Nooka nên nó phải tụt theo đúng ngần ấy. Để mỗi lớp tự tính thì sợi dây tuột
   * khỏi tay đúng bằng quãng thả, và quả bóng ở lại lơ lửng trên mép trong lúc
   * người cầm nó đã khuất.
   */
  const sunk = useSharedValue(0);
  useEffect(() => {
    sunk.value = withTiming(trip.ducked ? 1 : 0, { duration: MASCOT_MOVE.dip });
  }, [trip.ducked, sunk]);

  /**
   * Chỗ bám dọc mép: 0 là ngay trên đầu đạo cụ, 1 là lệch sang phải `RIM_STEP`.
   *
   * **Hoãn đúng một nhịp `dip`** để cú dịch ngang diễn ra trọn vẹn trong lúc
   * Nooka còn khuất sau bức tường chữ — chìm xuống xong mới đi, đi xong mới trồi
   * lên. Cùng luật "ba đoạn không bao giờ chạy cùng lúc" với `walk`/`lift`/`dip`
   * ở hệ đi lại: một nhân vật đang bám mép bằng hai tay mà lướt ngang giữa thanh
   * thiên bạch nhật thì mắt đọc ra ngay là sai.
   *
   * Nhịp hoãn đó đúng cho **cả hai chiều**: lúc đi là chờ chìm xuống, lúc về là
   * chờ trồi lên. `ASCENT_MOVE.rimHome` đã tính đủ cả hai.
   */
  const rimAt = useSharedValue(0);
  useEffect(() => {
    rimAt.value = withDelay(
      MASCOT_MOVE.dip,
      withTiming(trip.rimSpot, { duration: MASCOT_MOVE.walk }),
    );
  }, [trip.rimSpot, rimAt]);

  const walk = useAnimatedStyle(() => {
    const along = travel.value * top.value;
    const shift = stageShift(walked.value, lifted.value, Math.min(rim.value, PEEK_REACH));
    return {
      transform: [
        {
          translateX:
            shift.x +
            travel.value * climbRun +
            // Chỗ lệch dọc mép nằm **trong** ngoặc của `perched`: nó là một phần
            // của chỗ bám, nên buông mép là nó tự tan theo. Cộng ra ngoài thì
            // Nooka mang quãng lệch ấy xuống tận mặt đất.
            perched.value * (GRIP_X - climbRun + rimAt.value * RIM_STEP),
        },
        {
          translateY:
            shift.y -
            (along + perched.value * (rim.value - along)) -
            arc.value -
            (sat.value + stood.value) * RIM_LIFT +
            sunk.value * PERCH_SINK,
        },
      ],
    };
  });

  /**
   * Thang trượt vào từ mép trái màn hình, đứng **thẳng đứng** vuông góc với khung ô nhập.
   */
  const haul = useAnimatedStyle(() => ({
    transform: [{ translateX: (propIn.value - 1) * PROP_TRAVEL }, { rotate: '0deg' }],
  }));

  /** Quả bóng bồng bềnh tại chỗ, và nghiêng theo — dây mềm thì bóng phải đưa. */
  const bob = useSharedValue(0);
  useEffect(() => {
    bob.value = withRepeat(withTiming(1, { duration: BALLOON_BOB.ms }), -1, true);
  }, [bob]);

  /**
   * Quả bóng **đi theo Nooka**: nó đang được cầm, nên phải chịu đúng phép dịch
   * của nhân vật rồi mới cộng thêm cú trượt vào và nhịp bồng bềnh của riêng nó.
   * Dựng nó thành một lớp độc lập thì lúc Nooka bay lên, quả bóng đứng lại.
   */
  const balloonPivot = balloonHeight(BALLOON_TAIL) / 2;
  const float = useAnimatedStyle(() => {
    const along = travel.value * top.value;
    // Cùng phép dịch với nhân vật, không phải một phép dịch riêng: quả bóng đang
    // nằm trong tay nó. Xem `stageShift`.
    const shift = stageShift(walked.value, lifted.value, Math.min(rim.value, PEEK_REACH));
    return {
      transform: [
        {
          translateX:
            shift.x +
            (propIn.value - 1) * BALLOON_TRAVEL +
            travel.value * climbRun +
            // Đi đâu thì quả bóng theo đó, kể cả cú dịch dọc mép lúc nấp.
            perched.value * (GRIP_X - climbRun + BALLOON_SHIFT.x + rimAt.value * RIM_STEP) +
            sat.value * BALLOON_SIT_SHIFT.x -
            // Đu lên vẫy là về đúng tư thế giơ tay của `IDLE`, mà `BALLOON_HAND`
            // vốn đo từ chính bàn tay ấy — nên chỗ neo **trả lại** đúng phần đã
            // lệch đi lúc bám mép, không phải cộng thêm một lệch thứ ba.
            stood.value * BALLOON_SHIFT.x,
        },
        {
          translateY:
            shift.y -
            (along + perched.value * (rim.value - along)) -
            arc.value -
            bob.value * BALLOON_BOB.travel +
            perched.value * BALLOON_SHIFT.drop -
            sat.value * (RIM_LIFT - BALLOON_SIT_SHIFT.drop) -
            // Đu lên vẫy: bàn tay đi lên cùng cả người (`RIM_LIFT`) **và** trở
            // lại chỗ giơ cao, tức trả lại quãng đã hạ xuống lúc bám mép.
            stood.value * (RIM_LIFT + BALLOON_SHIFT.drop) +
            // Quả bóng đang nằm trong tay Nooka, nên nó tụt xuống trốn cùng —
            // cùng một quãng, đọc từ cùng một chỗ.
            sunk.value * PERCH_SINK,
        },
        // Ngả và đưa qua đưa lại quanh **đáy dây**, tức là quanh bàn tay đang
        // nắm: dịch xuống nửa chiều cao để tâm xoay rơi vào đáy ảnh, xoay, rồi
        // dịch ngược lên. Xoay quanh tâm mặc định thì bàn tay chạy theo quả
        // bóng thay vì ngược lại, và dây tuột khỏi tay ngay nhịp đầu.
        { translateY: balloonPivot },
        { rotate: `${BALLOON_LEAN + (bob.value - 0.5) * 2 * BALLOON_SWAY}deg` },
        { translateY: -balloonPivot },
      ],
    };
  });

  useEffect(() => () => {
    if (pending.current) clearTimeout(pending.current);
  }, []);

  /**
   * Khi người dùng chạm vào Nooka: tỉnh ngủ ngay (nếu đang ngủ gật), và bốc
   * ngẫu nhiên 50/50 — hoặc reo mừng tại chỗ (`found`), hoặc bỏ đi trốn.
   *
   * **Đi trốn là một ý muốn, hai động tác** — chỗ đứng quyết định động tác nào,
   * và hệ sở hữu chỗ đó lo phần việc:
   *
   * - dưới đất: `hide` đưa nó đi ngang vào sau ô nhập (`useMascotStage`);
   * - trên mép: `duck` cho nó buông tay tụt xuống sau bức tường chữ, mang theo
   *   quả bóng đang cầm (`useNookaAscent`).
   *
   * Gọi nối tiếp bằng `||` là đủ, không cần hỏi Nooka đang ở đâu: mỗi hàm tự từ
   * chối khi không phải chỗ của mình, nên nhiều nhất một cái chạy. Hỏi trước rồi
   * mới gọi là dựng lại điều kiện của hai hook ở đây, và bản dựng lại sẽ lệch
   * ngay lần đầu một trong hai đổi luật.
   *
   * **Vẫn có lúc cả hai cùng từ chối**, và đó là nhánh hay chạy chứ không phải
   * trường hợp hiếm: đang vác thang, đang trèo, đang nhảy — chỗ đứng lúc ấy
   * thuộc về một chuyến đi đang dở, không phải một chỗ để trốn.
   *
   * Reo mừng là phản ứng đúng chứ không phải chỗ trú tạm: `found` làm Nooka hết
   * "đang chờ", tức là hết cớ để lên, nên nó tụt xuống và cất đạo cụ **theo đúng
   * đường đã lên** — máy trạng thái ở `ascent.ts` vốn không có lối tắt. Xong
   * lượt reo là `resting`, có cớ trở lại, và nó leo lên lại.
   */
  const handleMascotPress = useCallback(() => {
    setTypedAt(Date.now());
    if (Math.random() < 0.5 && (hide() || duck())) {
      setMascot('resting');
      return;
    }
    setMascot('found');
  }, [hide, duck]);

  /** Xếp hạng lại với tập tag hiện có rồi nối một lượt trả lời. */
  const answer = useCallback(
    (nextTags: TagId[]) => {
      const spots = rankSpots(nextTags, demo.extraTags, 3);
      // "Đọc bao nhiêu review" là số người đã gắn đúng những tag này — con số
      // có thật, không phải hiệu ứng.
      const read = spots.reduce(
        (total, id) =>
          total +
          spotTags(id, demo.extraTags)
            .filter((tag) => nextTags.includes(tag.id))
            .reduce((sum, tag) => sum + tag.count, 0),
        0,
      );
      nextId.current += 1;
      setTurns((current) => [
        ...current,
        { kind: 'answer', id: nextId.current, tags: nextTags, spots, read },
      ]);
      setMascot('found');
    },
    [demo.extraTags],
  );

  /** Nooka "đọc review" một nhịp rồi mới trả lời — chỗ này là nơi gọi API thật sau này. */
  const think = useCallback(
    (nextTags: TagId[], ms: number) => {
      setMascot('searching');
      if (pending.current) clearTimeout(pending.current);
      pending.current = setTimeout(() => answer(nextTags), ms);
    },
    [answer],
  );

  const send = useCallback(
    (text: string, intent: IntentId | null = null) => {
      const clean = text.trim();
      if (!clean && !intent) return;

      nextId.current += 1;
      setTurns((current) => [
        ...current,
        { kind: 'ask', id: nextId.current, text: clean || t(`search.intents.${intent}`) },
      ]);
      setDraft('');

      const merged = [...new Set([...tags, ...matchTags(clean, synonyms, intent)])];
      setTags(merged);
      think(merged, 900);
    },
    [synonyms, tags, think],
  );

  const dropTag = useCallback(
    (tag: TagId) => {
      const merged = tags.filter((item) => item !== tag);
      setTags(merged);
      think(merged, 600);
    },
    [tags, think],
  );

  const restart = useCallback(() => {
    if (pending.current) clearTimeout(pending.current);
    setTurns([]);
    setTags([]);
    setDraft('');
    setMascot('idle');
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(timer);
  }, [turns, mascot]);

  return (
    <ScreenShell testID="ask-nooka-screen">
      <View style={styles.header}>
        <CircleButton
          accessibilityLabel={t('common.back')}
          icon="arrow-back"
          onPress={() => router.back()}
          tone="muted"
        />
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: colors.text }]}>{t('search.title')}</Text>
          <View style={styles.subtitleRow}>
            <View style={[styles.liveDot, { backgroundColor: colors.accentStrong }]} />
            <Text numberOfLines={1} style={[styles.subtitle, { color: colors.textMuted }]}>
              {t('search.subtitle')}
            </Text>
          </View>
        </View>
        {answered ? (
          <CircleButton
            accessibilityLabel={t('search.restart')}
            icon="refresh"
            onPress={restart}
            tone="muted"
          />
        ) : null}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
        style={styles.fill}>
        <ScrollView
          contentContainerStyle={styles.thread}
          keyboardShouldPersistTaps="handled"
          ref={scroller}
          showsVerticalScrollIndicator={false}>
          <NookaTurn>
            <Bubble>{t('search.opening')}</Bubble>
          </NookaTurn>

          {turns.length === 0 ? (
            <View style={styles.block}>
              <Text style={[styles.label, { color: colors.textSubtle }]}>{t('search.quickPick')}</Text>
              <View style={styles.chips}>
                {INTENT_IDS.map((intent) => (
                  <Chip
                    key={intent}
                    label={t(`search.intents.${intent}`)}
                    onPress={() => send('', intent)}
                  />
                ))}
              </View>
              <Text style={[styles.footnote, { color: colors.textSubtle }]}>{t('search.noAnswer')}</Text>
            </View>
          ) : null}

          {turns.map((turn) =>
            turn.kind === 'ask' ? (
              <View key={turn.id} style={styles.askRow}>
                <View style={[styles.bubble, styles.askBubble, { backgroundColor: colors.inverseSurface }]}>
                  <Text style={[styles.bubbleText, { color: colors.onInverse }]}>{turn.text}</Text>
                </View>
              </View>
            ) : (
              <AnswerTurn key={turn.id} onDropTag={dropTag} turn={turn} />
            ),
          )}

          {mascot === 'searching' ? (
            <NookaTurn>
              <View style={styles.readingRow}>
                <View style={[styles.readingBar, { backgroundColor: colors.surfaceMuted }]}>
                  <View style={[styles.readingFill, { backgroundColor: colors.accentStrong }]} />
                </View>
                <Text style={[styles.reading, { color: colors.textMuted }]}>{t('search.reading')}</Text>
              </View>
            </NookaTurn>
          ) : null}
        </ScrollView>

        {/* `ScreenShell` chỉ chừa lề an toàn phía trên, nên thanh nhắn tin phải
            tự nâng khỏi vạch home. Cộng thêm 16 để nó không dính sát mép. */}
        <View
          style={[
            styles.composer,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.borderSubtle,
              paddingBottom: padBottom,
            },
          ]}>
          {/* Đạo cụ vẽ **trước** Nooka nên nhân vật đứng trước nó: trèo là bám
              mặt trước hai thanh dọc, và dây bóng chạy sau đầu, đúng như nhìn từ
              phía người xem. Chỉ dựng khi có mặt trên sân khấu — không cần giữ
              một lớp rỗng suốt đời màn hình cho món chỉ ra lúc gõ dài. */}
          {ascentOnStage(phase) && means === 'ladder' ? (
            <Animated.View
              pointerEvents="none"
              style={[styles.ladderLayer, { bottom: padBottom }, haul]}>
              <NookaLadder rungs={rungs} />
            </Animated.View>
          ) : null}

          {ascentOnStage(phase) && means === 'balloon' ? (
            <Animated.View
              pointerEvents="none"
              style={[styles.balloonLayer, { bottom: padBottom + BALLOON_BOTTOM }, float]}>
              <NookaBalloon tail={BALLOON_TAIL} />
            </Animated.View>
          ) : null}

          {/* Nooka nằm **trước** hàng nhập trong cây JSX nên hàng nhập vẽ đè lên.
              Đó là toàn bộ cơ chế "nấp": đi sang vùng ô nhập là bị chính ô nhập
              che nửa dưới thân, rồi mới nhô lên hay chìm xuống. Đứng ở chỗ ở thì
              lớp này nằm trong khoảng đã chừa nên không bị che gì. Không nhận
              chạm để không cướp vùng bấm của ô nhập. */}
          <Animated.View
            pointerEvents="box-none"
            style={[styles.mascotLayer, { bottom: padBottom }, walk]}>
            <NookaSprite
              act={act}
              mood={mood}
              onPress={handleMascotPress}
              onSettled={setMascot}
              perch={perch}
              size={MASCOT_SIZE}
              stage={stage}
              state={mascot}
            />
          </Animated.View>

          <View style={styles.inputRow}>
            <TextInput
              accessibilityLabel={t('search.composer')}
              multiline
              // Gõ một phím là Nooka tỉnh: đồng hồ buồn ngủ đếm lại từ đầu.
              onChangeText={(text) => {
                setDraft(text);
                setTypedAt(Date.now());
              }}
              // Chiều cao thật của ô nhập là thứ quyết định Nooka có phải vác
              // thang ra không — xem `rise` ở trên.
              onLayout={(event) => setFieldH(event.nativeEvent.layout.height)}
              onSubmitEditing={() => send(draft)}
              placeholder={t('search.composer')}
              placeholderTextColor={colors.textSubtle}
              returnKeyType="send"
              style={[
                styles.field,
                {
                  backgroundColor: colors.surface,
                  borderColor: draft.trim() ? colors.accentStrong : colors.borderSubtle,
                  color: colors.text,
                },
              ]}
              value={draft}
            />
            <Pressable
              accessibilityLabel={t('search.send')}
              accessibilityRole="button"
              accessibilityState={{ disabled: !draft.trim() }}
              disabled={!draft.trim()}
              onPress={() => send(draft)}
              style={({ pressed }) => [
                styles.send,
                {
                  backgroundColor: draft.trim() ? colors.inverseSurface : colors.surfaceMuted,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}>
              <Ionicons
                color={draft.trim() ? colors.onInverse : colors.textSubtle}
                name="arrow-up"
                size={19}
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

function NookaTurn({ children }: { children: React.ReactNode }) {
  const { colors } = useNookaTheme();
  return (
    <View style={styles.block}>
      <View style={styles.who}>
        <Image source={require('@/assets/images/nooka-avatar.png')} style={styles.avatarMini} />
        <Text style={[styles.whoName, { color: colors.textMuted }]}>{t('brand.name')}</Text>
      </View>
      {children}
    </View>
  );
}

function Bubble({ children }: { children: React.ReactNode }) {
  const { colors } = useNookaTheme();
  return (
    <View style={[styles.bubble, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
      <Text style={[styles.bubbleText, { color: colors.text }]}>{children}</Text>
    </View>
  );
}

function AnswerTurn({
  turn,
  onDropTag,
}: {
  turn: Extract<Turn, { kind: 'answer' }>;
  onDropTag: (tag: TagId) => void;
}) {
  const router = useRouter();
  const { colors } = useNookaTheme();
  const { extraTags } = useNookaDemo();

  return (
    <>
      <NookaTurn>
        <Bubble>
          {/* Không khớp tag nào thì "Đọc 0 review" nghe như hỏng. Nói thẳng là
              chưa hiểu, rồi vẫn đưa ra thứ hữu ích nhất còn lại. */}
          {turn.tags.length === 0
            ? t('search.noTags')
            : `${t('search.readCount', { count: turn.read })} ${t('search.leftCount', { count: turn.spots.length })}`}
        </Bubble>
      </NookaTurn>

      {turn.tags.length ? (
        <View style={styles.block}>
          <Text style={[styles.label, { color: colors.textSubtle }]}>{t('search.understood')}</Text>
          <View style={styles.chips}>
            {turn.tags.map((tag) => (
              <Chip key={tag} label={tagLabel(tag)} onPress={() => onDropTag(tag)} selected trailing="✕" />
            ))}
          </View>
        </View>
      ) : null}

      {turn.spots.length ? (
        <View style={[styles.results, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          {turn.spots.map((id, index) => (
            <View key={id} style={index ? [styles.divider, { borderTopColor: colors.borderSubtle }] : null}>
              <ResultRow
                distance={formatDistance(SPOTS[id].distanceM)}
                onPress={() => router.push({ pathname: '/spot/[id]', params: { id } })}
                rank={index + 1}
                reason={checkinLine(id)}
                tags={explainTags(id, turn.tags, extraTags)
                  .slice(0, 2)
                  .map((tag) => tagLabel(tag.id))
                  .join(' · ')}
                tint={SPOTS[id].photoTint}
                title={spotName(id)}
              />
            </View>
          ))}
        </View>
      ) : (
        <Text style={[styles.footnote, { color: colors.textMuted }]}>{t('search.nothingLeft')}</Text>
      )}

      <Text style={[styles.footnote, { color: colors.textSubtle }]}>{t('search.aiBoundary')}</Text>
    </>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { minHeight: 44, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { fontSize: 19, lineHeight: 25, fontWeight: '800', letterSpacing: -0.4 },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  subtitle: { flex: 1, fontSize: 11.5, lineHeight: 16, fontWeight: '600' },
  thread: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 20, gap: 16 },
  block: { gap: 9 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  avatarMini: { width: 20, height: 20, borderRadius: 10 },
  whoName: { fontSize: 10.5, lineHeight: 14, fontWeight: '800', letterSpacing: 1.2 },
  bubble: {
    alignSelf: 'flex-start',
    maxWidth: '92%',
    borderRadius: 20,
    borderBottomLeftRadius: 7,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  bubbleText: { fontSize: 14.5, lineHeight: 21, fontWeight: '600', letterSpacing: -0.2 },
  askRow: { alignItems: 'flex-end' },
  askBubble: {
    alignSelf: 'flex-end',
    borderColor: 'transparent',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 7,
  },
  label: { fontSize: 10.5, lineHeight: 14, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  results: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14 },
  divider: { borderTopWidth: 1 },
  footnote: { fontSize: 12, lineHeight: 17, fontWeight: '500' },
  readingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  readingBar: { width: 92, height: 4, borderRadius: 2, overflow: 'hidden' },
  readingFill: { width: '62%', height: '100%', borderRadius: 2 },
  reading: { fontSize: 12.5, lineHeight: 17, fontWeight: '600' },
  composer: { paddingHorizontal: 16, paddingTop: 8, borderTopWidth: 1 },
  // `left` khớp `composer.paddingHorizontal`: chỗ ở là mép trái của hàng nhập.
  mascotLayer: { position: 'absolute', left: 16 },
  // Đạo cụ đặt giữa bề ngang đã chừa cho Nooka: chân thang rơi đúng dưới nhân
  // vật để hai thanh dọc ra ngoài hai bên thân và bàn tay bám được. Lớp bóng
  // thì neo theo **bàn tay trái**, không theo tâm nhân vật — xem `BALLOON_LEFT`.
  ladderLayer: { position: 'absolute', left: LADDER_LEFT },
  balloonLayer: { position: 'absolute', left: BALLOON_LEFT },
  // `paddingLeft` là chỗ chừa cứng cho Nooka — cố định nên ô nhập và nút gửi
  // đứng yên dù nhân vật đang đi, đang nấp hay đang chìm.
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingLeft: MASCOT_SLOT },
  field: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    borderWidth: 1.4,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 11 : 9,
    paddingBottom: Platform.OS === 'ios' ? 11 : 9,
    fontSize: 14,
    fontWeight: '600',
  },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});

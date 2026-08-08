// Dựng sprite Nooka từ primitive rồi sinh ra `features/nooka/mascot-frames.ts`.
//
// Lưới 34 × 44, tỉ lệ chibi: đầu chiếm khoảng nửa chiều cao, thân nhỏ, chân là
// hai mẩu ngắn.
//
//   node scripts/build-mascot-sprite.js              -> ghi đè file frames
//   node scripts/build-mascot-sprite.js out.json     -> xuất JSON để xem thử
//
// Xem lại bằng mắt trước khi commit:
//   node scripts/build-mascot-sprite.js /tmp/f.json && node scripts/preview-mascot-sprite.js /tmp/f.json /tmp/f.png
const fs = require('node:fs');

const W = 34, H = 44, HEADROOM = 3;

const canvas = () => Array.from({ length: H }, () => Array(W).fill('.'));
const put = (g, x, y, ch) => { if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = ch; };
const hline = (g, x0, x1, y, ch) => { for (let x = x0; x <= x1; x++) put(g, x, y, ch); };
const vline = (g, x, y0, y1, ch) => { for (let y = y0; y <= y1; y++) put(g, x, y, ch); };
const rect = (g, x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) hline(g, x0, x1, y, ch); };

/** Khối bo góc bán kính r, viền `outline` ruột `fill`. */
function blob(g, x0, y0, x1, y1, fill, outline, r = 2) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (!inRounded(x, y, x0, y0, x1, y1, r)) continue;
      const edge =
        !inRounded(x - 1, y, x0, y0, x1, y1, r) || !inRounded(x + 1, y, x0, y0, x1, y1, r) ||
        !inRounded(x, y - 1, x0, y0, x1, y1, r) || !inRounded(x, y + 1, x0, y0, x1, y1, r);
      put(g, x, y, edge ? outline : fill);
    }
  }
}

/** Hình tròn đặc, bán kính nhận số lẻ. */
function disc(g, cx, cy, r, ch) {
  const span = Math.ceil(r);
  for (let y = cy - span; y <= cy + span; y++)
    for (let x = cx - span; x <= cx + span; x++)
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) put(g, x, y, ch);
}

function inRounded(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = x < x0 + r ? x0 + r : x > x1 - r ? x1 - r : x;
  const cy = y < y0 + r ? y0 + r : y > y1 - r ? y1 - r : y;
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r + 0.3;
}

/** Đầu: khối **bo góc mềm**, không phải hình tròn — bám theo ảnh mẫu. */
const HEAD_BOX = { x0: 5, y0: 13, x1: 28, y1: 32, r: 7 };
const inHead = (x, y) =>
  inRounded(x, y, HEAD_BOX.x0, HEAD_BOX.y0, HEAD_BOX.x1, HEAD_BOX.y1, HEAD_BOX.r);

function bubble(g) {
  blob(g, 12, 0, 24, 5, 'V', 'V', 2);
  rect(g, 15, 2, 16, 3, 'h');
  rect(g, 18, 2, 19, 3, 'h');
  rect(g, 21, 2, 22, 3, 'h');
  // cuống ăng-ten nối xuống đỉnh đầu
  rect(g, 17, 6, 18, 14, 'g');
  vline(g, 17, 6, 14, 'G');
}

/**
 * Tai mèo — **cao và hẹp**, tách bạch hẳn hai bên, lòng tai bạc hà.
 *
 * Cắt đáy theo `inHead` từng ô: vòm đầu là đường cong nên mỗi cột chạm vỏ ở độ
 * cao khác nhau, cắt phẳng thì hai bên tai thừa ra mẩu viền lơ lửng.
 */
function ear(g, tipX, patch) {
  const TOP = 7;
  for (let i = 0; i < 10; i++) {
    const y = TOP + i;
    // Hệ số nở: tai phải **hẹp hơn** để đầu vẫn là khối lớn nhất. Để 0,32 thì
    // hai tai trải rộng hơn cả bề ngang đầu và lấn át cả nhân vật.
    const half = Math.ceil(i * 0.34);
    const x0 = tipX - half;
    const x1 = tipX + half;
    if (inHead(x0, y) && inHead(x1, y)) break;
    hline(g, x0, x1, y, 'c');
    if (!inHead(x0 - 1, y)) put(g, x0 - 1, y, 'o');
    if (!inHead(x1 + 1, y)) put(g, x1 + 1, y, 'o');
    if (i >= 3) hline(g, x0 + 1, x1 - 1, y, 'q');
    // mảng vàng ở rìa ngoài tai phải
    if (patch && i >= 2) put(g, x1, y, 'G');
  }
  put(g, tipX, TOP - 1, 'o');
}

const ears = (g) => {
  ear(g, 11, false);
  ear(g, 23, true);
};

/** Chụp tai hai bên, áp sát đầu, đối xứng. */
function earPods(g) {
  for (const x of [3, 26]) {
    blob(g, x, 21, x + 5, 28, 'c', 'o', 2);
    blob(g, x + 1, 23, x + 4, 26, 'q', 'o', 1);
  }
}

function head(g, eyeKind) {
  blob(g, HEAD_BOX.x0, HEAD_BOX.y0, HEAD_BOX.x1, HEAD_BOX.y1, 'c', 'o', HEAD_BOX.r);
  // Kính che mặt thụt vào 4 ô mỗi bên: phải còn thấy vành vỏ kem quanh nó,
  // nếu không cả cái đầu thành một mảng nhạt không có hình.
  blob(g, 10, 18, 23, 29, 'v', 'v', 5);
  // đốm bạc hà rải trên trán
  rect(g, 12, 16, 13, 16, 'q');
  rect(g, 20, 16, 21, 16, 'q');
  put(g, 16, 15, 'q');
  eyes(g, eyeKind);
  rect(g, 8, 26, 10, 27, 'b');
  rect(g, 23, 26, 25, 27, 'b');
}

/**
 * Mắt: khối đen lớn, **đốm sáng vuông khoét ở góc trên trái**.
 *
 * Đây là chi tiết làm nên thần thái trong ảnh mẫu — bỏ đốm sáng đi thì mắt
 * thành hai lỗ đen vô hồn.
 *
 * Ba trạng thái, và **biểu cảm chỉ nằm ở đôi mắt** — thân giữ nguyên:
 *
 *   open — mở to
 *   half — mí sụp một nửa, còn thấy đốm sáng: đang buồn ngủ
 *   shut — nhắm hẳn, một đường thẳng nằm ngang: đang ngủ
 */
function eyes(g, kind = 'open') {
  for (const x of [11, 18]) {
    if (kind === 'shut') {
      hline(g, x, x + 4, 22, 'd');
      continue;
    }
    if (kind === 'half') {
      hline(g, x, x + 4, 21, 'd');
      rect(g, x, 22, x + 4, 25, 'd');
      rect(g, x, 22, x + 1, 22, 'h');
      continue;
    }
    rect(g, x, 19, x + 4, 25, 'd');
    rect(g, x, 19, x + 1, 20, 'h');
  }
}

/**
 * Chữ Z nét một ô, để làm dấu ngủ. `size` là bề ngang trừ một.
 *
 * Vẽ tay chứ không dùng font: cả bộ sprite này là lưới ký tự, nhét một ô chữ
 * thật vào là có đúng một món trong khung không đổi màu theo theme.
 */
function zed(g, x, y, size, ch) {
  hline(g, x, x + size, y, ch);
  for (let i = 1; i <= size; i++) put(g, x + size - i, y + i, ch);
  hline(g, x, x + size, y + size + 1, ch);
}

/**
 * Hai chữ Z bay chéo lên khỏi vai phải, nhỏ dần. `beat` đẩy cả hai lên một ô —
 * đó là toàn bộ chuyển động của một nhân vật đang ngủ, và thế là đủ.
 *
 * Đặt ở cột 28 trở ra: vòm đầu hết ở cột 28 và chụp tai hết ở hàng 28, nên chỗ
 * này trống ở cả tư thế đứng lẫn tư thế bám mép.
 */
const sleepMark = (g, beat, drop = 0) => {
  zed(g, 28, 13 - beat + drop, 2, 'q');
  zed(g, 31, 7 - beat + drop, 1, 'q');
};

/** Miệng. Giữ nguyên ba biểu cảm đã chốt. */
function mouth(g, kind) {
  if (kind === 'open') {
    blob(g, 15, 27, 19, 30, 'm', 'm', 1);
    return;
  }
  if (kind === 'think') {
    // Nét ngắn và phẳng — đang bận nghĩ, không phải đang cười.
    hline(g, 16, 18, 28, 'm');
    return;
  }
  if (kind === 'sleep') {
    // Miệng khép nhẹ nhịp hít vào
    hline(g, 16, 18, 28, 'm');
    return;
  }
  if (kind === 'sleep_out') {
    // Miệng hé tròn nhỏ nhịp thở ra
    rect(g, 16, 28, 18, 29, 'm');
    return;
  }
  blob(g, 15, 27, 19, 30, 'm', 'm', 1);
  hline(g, 16, 18, 30, 'v');
}

function torso(g) {
  // cổ áo vàng — dải mỏng ở cổ, không phải mảng lớn
  blob(g, 12, 31, 22, 33, 'g', 'G', 1);
  // thân
  blob(g, 12, 33, 22, 40, 'c', 'o', 3);
  // ống kính bụng: vành vàng, ruột teal. Nhỏ lại để còn thấy vỏ kem quanh nó —
  // to quá thì bụng, cổ áo và áo choàng gộp thành một mảng vàng.
  disc(g, 17, 36, 3.2, 'o');
  disc(g, 17, 36, 2.6, 'g');
  disc(g, 17, 36, 1.6, 't');
  put(g, 16, 35, 'h');
}

/**
 * Áo choàng vàng, buông từ vai phải xuống dưới rồi loe ra.
 *
 * **Nhân vật không có đuôi.** Bản trước tôi vẽ một khối tròn vàng ở đây và nó
 * đọc ra thành đuôi — sai. Đây là áo choàng, và nó phải **nằm sau** thân với
 * tay, nên hàm này gọi trước `torso`.
 */
function cape(g) {
  // Bắt đầu từ cột 24, chừa hẳn một cột viền ngăn với cổ áo. Sát hơn thì hai
  // mảng vàng dính vào nhau và cả khúc dưới đọc thành một khối liền.
  const shape = [
    [32, 24, 26],
    [33, 24, 27],
    [34, 25, 28],
    [35, 25, 29],
    [36, 26, 29],
    [37, 26, 30],
    [38, 27, 30],
    [39, 27, 29],
    [40, 28, 29],
  ];
  for (const [y, x0, x1] of shape) {
    hline(g, x0, x1, y, 'G');
    put(g, x0 - 1, y, 'o');
    put(g, x1 + 1, y, 'o');
  }
  hline(g, 24, 26, 31, 'o');
  hline(g, 28, 29, 41, 'o');
  // ánh sao trên vạt áo, như trong ảnh gốc
  put(g, 28, 35, 'h'); put(g, 29, 36, 'h'); put(g, 28, 37, 'h');
}

/**
 * Vẽ một lớp vào canvas riêng rồi hạ xuống `dy` hàng.
 *
 * Dùng cho tư thế ngồi: cả phần trên phải lún xuống, mà mọi hàm vẽ đầu, tai và
 * miệng đều dùng toạ độ tuyệt đối. Thêm tham số `dy` vào từng hàm là sửa vài
 * chục dòng toạ độ và chỉ cần sai một chỗ là lệch cả hình mà nhìn code không
 * thấy — blit một lần thì không có chỗ nào để sai.
 */
function lower(g, dy, draw) {
  const tmp = canvas();
  draw(tmp);
  for (let y = H - 1; y >= 0; y--) {
    const src = tmp[y - dy];
    if (!src) continue;
    for (let x = 0; x < W; x++) if (src[x] !== '.') g[y][x] = src[x];
  }
}

/**
 * Ngồi thì cả phần trên lún xuống ngần này hàng.
 *
 * **Một hàng, không hơn.** Lưới chỉ có 44 hàng và cái đầu chibi đã chiếm 20;
 * hạ ba hàng thì nửa dưới còn đúng tám hàng cho cả thân, hai tay và hai chân —
 * chúng nén lại thành mấy sợi mảnh và tư thế ngồi hết đọc được. Cái nói ra rằng
 * nhân vật đang ngồi là **hình dáng chân đế**: bè ngang, hai bàn chân duỗi ra
 * trước, hai tay buông chạm đất. Không phải chiều cao.
 */
const SIT_DROP = 1;

/**
 * Thân lúc ngồi: **thấp và bè** hơn thân đứng vì trọng lượng dồn xuống.
 *
 * Vạt áo choàng cuộn lại thành khối tròn bên phải — ngồi thì nó không buông
 * thẳng được nữa. Vẽ trước để nằm sau thân và tay, đúng như `cape` với `torso`.
 */
function torsoSit(g) {
  blob(g, 12, 32, 22, 34, 'g', 'G', 1);
  // Bè hơn thân đứng hai cột mỗi bên và chạm hẳn xuống đất — ngồi thì trọng
  // lượng dồn xuống chứ thân không còn là cái ống dựng đứng.
  blob(g, 10, 33, 24, 43, 'c', 'o', 4);
  // Ống kính bụng đặt cao hơn lúc đứng để hai bàn chân duỗi ra không cắt mất
  // nửa dưới của nó.
  disc(g, 17, 37, 3.2, 'o');
  disc(g, 17, 37, 2.6, 'g');
  disc(g, 17, 37, 1.6, 't');
  put(g, 16, 36, 'h');
}

/** Chân ngắn, bàn chân vàng. */
function legs(g, tuck) {
  const top = tuck ? 40 : 41;
  blob(g, 13, top, 17, 43, 'c', 'o', 1);
  blob(g, 18, top, 22, 43, 'c', 'o', 1);
  hline(g, 14, 16, 43, 'g');
  hline(g, 19, 21, 43, 'g');
}

/**
 * Chân lúc ngồi: hai bàn chân **duỗi ra trước**, nằm cạnh nhau và bè hơn hẳn
 * chân đứng. Đây là chi tiết nói ra rằng nhân vật đang ngồi — chân bằng đúng
 * chân đứng thì nó chỉ là đang đứng khép chân.
 */
function legsSit(g) {
  blob(g, 11, 39, 16, 43, 'c', 'o', 2);
  blob(g, 18, 39, 23, 43, 'c', 'o', 2);
  rect(g, 12, 41, 15, 42, 'p');
  rect(g, 19, 41, 22, 42, 'p');
}

/**
 * Tay lúc ngồi: **đúng mẩu ngắn của `armStubs`**, cùng bề ngang cùng chiều cao,
 * chỉ dịch ra hai cột và xuống ba hàng cho khớp thân ngồi bè và thấp hơn.
 *
 * Giữ nguyên bán kính bo 2 chứ không làm to lên để cắm vào thân: bo góc phụ
 * thuộc bề ngang, nên nới bề ngang là đổi luôn dáng nhìn thấy. Khe hở do bo góc
 * để `stitch` lấp.
 *
 * Đệm bạc hà dày hai hàng ở đây, khác một ô như lúc đứng — nó là chỗ neo dây
 * bóng bay (`BALLOON_HAND_SIT`), mà nhịp thở hạ thân trên một hàng nên một ô
 * đơn thì hai khung thở không có hàng nào chung.
 */
function armSit(g) {
  blob(g, 6, 36, 9, 41, 'c', 'o', 2);
  blob(g, 25, 36, 28, 41, 'c', 'o', 2);
  rect(g, 7, 38, 8, 39, 'p');
  rect(g, 26, 38, 27, 39, 'p');
  stitch(g, 36, 41);
}

/**
 * Vạt áo choàng cuộn lại thành khối tròn dưới bên phải, **vẽ sau cùng**.
 *
 * Ngược thứ tự với `cape` lúc đứng, và có lý do: ngồi thì tay buông hẳn xuống
 * che kín chỗ vạt áo, nên vẽ trước là nó mất hút. Đây là mảng màu duy nhất phá
 * được cái khối kem ở nửa dưới — mất nó thì tư thế ngồi đọc ra thành một cục.
 */
function capeSit(g) {
  // Vạt áo choàng vàng nhỏ gọn, cân đối buông nhẹ bên vai phải
  const shape = [
    [34, 25, 27],
    [35, 25, 28],
    [36, 26, 28],
    [37, 26, 29],
    [38, 26, 29],
    [39, 27, 30],
    [40, 27, 30],
    [41, 27, 29],
    [42, 28, 29],
  ];
  for (const [y, x0, x1] of shape) {
    hline(g, x0, x1, y, 'g');
    put(g, x0 - 1, y, 'G');
    put(g, x1 + 1, y, 'o');
  }
  // Đốm ánh sao lấp lánh xinh xắn
  put(g, 28, 38, 'h');
}

/**
 * Chân lúc leo thang: **so le**, một chân đã lên bậc trên, một chân còn ở bậc
 * dưới. Hai chân ngang nhau thì đọc ra là đang đứng trên thang chứ không phải
 * đang leo — mà đứng yên thì cần gì cái thang.
 */
function legsClimb(g, lead) {
  const a = lead ? 38 : 41;
  const b = lead ? 41 : 38;
  blob(g, 13, a, 17, a + 2, 'c', 'o', 1);
  hline(g, 14, 16, a + 2, 'g');
  blob(g, 18, b, 22, b + 2, 'c', 'o', 1);
  hline(g, 19, 21, b + 2, 'g');
}

/**
 * Cẳng tay **nằm ngang**, dày 2 ô có viền trên dưới.
 *
 * `limb` chỉ dùng được cho tay dốc: nó đi từng bước rồi ghi đè bước trước, nên
 * tay gần ngang bị đứt thành từng khúc rời ở mỗi hàng. Đã vấp đúng lỗi này ở tư
 * thế kéo thang.
 */
function armOut(g, x0, x1, y) {
  hline(g, x0, x1, y - 1, 'o');
  hline(g, x0, x1, y, 'c');
  hline(g, x0, x1, y + 1, 'c');
  hline(g, x0, x1, y + 2, 'o');
}

/** Chi dày 4 ô từ vai tới cổ tay. */
function limb(g, sx, sy, hx, hy) {
  const steps = Math.max(Math.abs(hx - sx), Math.abs(hy - sy)) || 1;
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(sx + ((hx - sx) * i) / steps);
    const y = Math.round(sy + ((hy - sy) * i) / steps);
    put(g, x - 1, y, 'o'); put(g, x, y, 'c'); put(g, x + 1, y, 'c'); put(g, x + 2, y, 'o');
  }
}

/** Bàn chân mèo có đệm bạc hà. */
function paw(g, x, y) {
  blob(g, x, y, x + 4, y + 4, 'c', 'o', 2);
  rect(g, x + 1, y + 2, x + 3, y + 3, 'p');
}

/**
 * Nối chi vào thân: lấp ô trong suốt **kẹp giữa hai mảng đặc** trên cùng một
 * hàng, trong khoảng hàng đã chỉ định.
 *
 * Chi và thân đều bo góc, nên ở mấy hàng bo giữa chúng hở ra đúng một ô và cánh
 * tay đọc thành khối rời lơ lửng. Cách sửa hiển nhiên — nới cánh tay cho cắm
 * vào thân — **làm cánh tay to lên**, vì bo góc phụ thuộc bề ngang nên đổi bề
 * ngang là đổi luôn dáng nhìn thấy. Lấp đúng ô hở thì dáng không suy suyển một
 * ô nào.
 *
 * Lấp bằng màu viền: đó là chỗ hai đường viền gặp nhau, không phải một mảng
 * thân mới. Và chỉ lấp **đúng một ô** — hở rộng hơn nghĩa là đặt sai chỗ chứ
 * không phải khe bo góc, lấp đi là giấu mất một lỗi thật.
 */
function stitch(g, y0, y1) {
  for (let y = y0; y <= y1; y++)
    for (let x = 1; x < W - 1; x++)
      if (g[y][x] === '.' && g[y][x - 1] !== '.' && g[y][x + 1] !== '.') put(g, x, y, 'o');
}

/** Tay lúc đứng yên: mẩu ngắn sát thân, đúng như ảnh mẫu. */
function armStubs(g) {
  blob(g, 8, 33, 11, 38, 'c', 'o', 2);
  blob(g, 23, 33, 26, 38, 'c', 'o', 2);
  put(g, 9, 36, 'p');
  put(g, 24, 36, 'p');
  // Từ hàng 34 — chừa hàng 33, chỗ có khe **cố ý** ngăn cổ áo với áo choàng.
  stitch(g, 34, 38);
}

/** Dấu hỏi nét dày 2 ô — nét 1 ô ở cỡ này gần như biến mất. */
function qmark(g, x, y) {
  rect(g, x, y, x + 3, y + 1, 'q');
  rect(g, x + 3, y + 2, x + 4, y + 3, 'q');
  rect(g, x + 2, y + 4, x + 3, y + 5, 'q');
  rect(g, x + 2, y + 7, x + 3, y + 8, 'q');
}

const questions = (g) => {
  qmark(g, 29, 12);
  qmark(g, 28, 23);
  put(g, 2, 18, 'g'); put(g, 1, 19, 'g'); put(g, 2, 20, 'g');
};

const sparks = (g) => {
  put(g, 1, 20, 'g'); hline(g, 0, 2, 21, 'g'); put(g, 1, 22, 'g');
  put(g, 32, 23, 'g'); hline(g, 31, 33, 24, 'g'); put(g, 32, 25, 'g');
  put(g, 31, 32, 'g'); put(g, 2, 34, 'g');
  put(g, 33, 29, 'g'); put(g, 0, 27, 'g');
};

/** Chừa headroom rồi dịch cả khung — nhảy thì đầu phải đi cùng thân. */
function liftFrame(rows, dy) {
  const blank = '.'.repeat(W);
  const padded = [...Array(HEADROOM).fill(blank), ...rows];
  if (!dy) return padded;
  return padded.map((_, y) => padded[y - dy] ?? blank);
}

/** Hàng đầu tiên của bàn chân trong khung đã chèn headroom. */
const LEG_ROW = 41 + HEADROOM;

/**
 * Nhịp thở: hạ **thân trên** xuống một hàng, giữ nguyên chân.
 *
 * Không dùng transform dịch cả người: trôi lên xuống thì bàn chân rời mặt đất,
 * trông như đang bay chứ không phải đang thở.
 */
function dipUpper(rows) {
  const blank = '.'.repeat(W);
  return rows.map((row, y) => (y >= LEG_ROW ? row : rows[y - 1] ?? blank));
}

function build({ pose, dy = 0, lift = 0, beat = 0, mark = null, mouthKind = 'open', eyeKind = 'open' }) {
  const g = canvas();
  const sit = pose === 'sit';

  // Ngồi thì **cả phần trên lún xuống** `SIT_DROP` hàng, không chỉ đổi hai bàn
  // chân: ngồi là hạ trọng tâm. Giữ nguyên chiều cao thân mà chỉ gấp chân lại
  // thì nhân vật đọc ra là đang đứng khép chân.
  const upper = (t) => {
    bubble(t);
    earPods(t);
    head(t, eyeKind);
    ears(t); // sau `head` — xem ghi chú trong `ear`
    mouth(t, mouthKind);
  };
  if (sit) lower(g, SIT_DROP, upper);
  else upper(g);

  if (sit) {
    torsoSit(g);
    // Tay trước chân: ngồi thì hai chân duỗi ra trước nên chúng ở gần người xem
    // nhất. Vẽ ngược lại là bàn chân bị cánh tay xén mất một mẩu bên trong.
    armSit(g);
    legsSit(g);
    capeSit(g); // sau cùng — xem ghi chú trong hàm
  } else {
    cape(g); // trước `torso`: áo choàng nằm sau thân và tay
    torso(g);
    if (pose === 'climb') legsClimb(g, beat > 0);
    else legs(g, pose === 'up');
    if (pose === 'down') armStubs(g);
  }
  // Cẳng tay lúc giơ chỉ dài 3–4 hàng. Dài hơn là tay vượt quá tỉ lệ thân —
  // thân chibi vốn đã lùn, tay dài làm nhân vật trông như bị kéo dãn.
  if (pose === 'wave') {
    limb(g, 11, 34, 9, 31 - lift); paw(g, 6, 28 - lift);
    blob(g, 22, 33, 25, 38, 'c', 'o', 2); put(g, 23, 36, 'p');
  }
  if (pose === 'up') {
    limb(g, 11, 34, 8, 30); paw(g, 5, 27);
    limb(g, 22, 34, 25, 30); paw(g, 24, 27);
  }
  if (pose === 'grip') {
    // Hai bàn tay vắt lên mép thanh nhập, ngay dưới hai bên đầu. Phần thân dưới
    // sẽ bị chính thanh nhập che nên không cần vẽ gì thêm ở dưới.
    paw(g, 8, 32);
    paw(g, 21, 32);
  }
  // **Không có tư thế "vừa bám mép vừa vẫy tay", và đó là kết luận đã đo.** Lưới
  // rộng 34 ô mà riêng cái đầu chibi đã chiếm cột 3–31, nên hai bên má chỉ còn
  // 2–4 cột trống ở tầm mắt — không đủ cho một cánh tay dày 4 ô. Đã dựng thử ba
  // biến thể và xem bằng mắt: để bàn tay thấp thì nó lọt vào bóng cái đầu và cú
  // vẫy đọc thành một cái má động đậy; đưa lên cao cho thấy rõ thì cánh tay cắt
  // chéo qua mặt và đọc thành một vết xước. Cả ba đều bị trả lại.
  //
  // Cách đi đúng nằm ở `app/ask.tsx`, không nằm ở đây: **không ai vẫy tay trong
  // lúc treo người bằng hai bàn tay** — muốn vẫy thì phải đu lên đã. Nooka nhấc
  // mình lên đứng hẳn trên mép rồi dùng lại đúng khung `IDLE_A`/`IDLE_B`; lúc ấy
  // cả cánh tay nằm trên nền trống và cú vẫy đọc ra ngay. Cùng lối nghĩ với "ngủ
  // là ngồi". Đừng thêm khung mới ở đây cho việc này.
  if (pose === 'think') {
    // Tay phải buông; tay trái gập lên chống cằm, bàn tay dừng ngay dưới miệng.
    blob(g, 22, 33, 25, 38, 'c', 'o', 2); put(g, 23, 36, 'p');
    limb(g, 13, 35, 13, 32);
    paw(g, 12, 28);
  }
  if (pose === 'haul') {
    // Kéo thang: tay trái vươn ngang sang trái nắm lấy thanh dọc, thấp gần sát
    // đất vì lúc này chiếc thang còn đang nằm nghiêng. Tay phải chống hông lấy
    // đà. `beat` là nhịp gồng — cả cánh tay nhích lên một ô mỗi nhịp kéo.
    armOut(g, 5, 12, 35 - beat);
    paw(g, 1, 33 - beat);
    blob(g, 22, 33, 25, 38, 'c', 'o', 2); put(g, 23, 36, 'p');
  }
  if (pose === 'catch') {
    // Với lấy quả bóng bay đang dạt tới từ bên trái, ngang tầm đầu. Khác `haul`
    // ở chỗ tay đưa **chéo lên** chứ không quờ xuống đất — quả bóng bay ngang
    // đầu chứ không nằm dưới chân.
    limb(g, 12, 34, 7, 29 - beat);
    paw(g, 2, 26 - beat);
    blob(g, 22, 33, 25, 38, 'c', 'o', 2); put(g, 23, 36, 'p');
  }
  if (pose === 'float') {
    // Treo dưới quả bóng: hai tay giơ lên nắm dây, **chân buông thõng** — đó là
    // chỗ khác duy nhất so với tư thế nhảy (`up`), mà cũng là chỗ đọc ra được
    // rằng nhân vật đang bị nhấc lên chứ không phải tự bật lên.
    limb(g, 11, 34, 8, 30); paw(g, 5, 27);
    limb(g, 22, 34, 25, 30); paw(g, 24, 27);
  }
  if (pose === 'climb') {
    // Hai tay bám ra hai bên vào hai thanh dọc, so le đúng chiều với chân: tay
    // trái cao thì chân trái đã lên bậc trên.
    //
    // Bàn tay phải nằm **dưới cằm và ngoài mép đầu** — vòm đầu chiếm tới hàng
    // 32 và chụp tai tới hàng 28, giơ cao hơn thì bàn tay dán lên má chứ không
    // đọc ra là đang bám thanh. Cột 4 và 25 rơi đúng vào hai thanh dọc khi
    // chiếc thang rộng `LADDER_GRID_W` ô đặt giữa dưới chân Nooka.
    const lead = beat > 0;
    limb(g, 12, 35, 8, lead ? 33 : 38);
    paw(g, 4, lead ? 31 : 36);
    limb(g, 21, 35, 24, lead ? 38 : 33);
    paw(g, 25, lead ? 36 : 31);
  }

  const rows = liftFrame(g.map((r) => r.join('')), dy);
  if (!mark) return rows;
  const marked = rows.map((r) => r.split(''));
  if (mark === 'question') questions(marked);
  if (mark === 'spark') sparks(marked);
  // Ngồi thì đầu đã lún xuống, nên chữ Z phải lún theo — treo nguyên chỗ cũ là
  // nó bay lơ lửng cách đỉnh đầu ba hàng, đọc ra thành của người khác.
  if (mark === 'sleep') sleepMark(marked, beat, sit ? SIT_DROP : 0);
  return marked.map((r) => r.join(''));
}

const RESTING_BASE = build({ pose: 'down', mouthKind: 'closed' });
const GRIP_BASE = build({ pose: 'grip', mouthKind: 'closed' });

// Biểu cảm buồn ngủ, dựng cho **cả hai chỗ nghỉ**: đứng dưới đất và bám mép ô
// nhập. Cùng một đôi mắt, khác tư thế thân — người dùng để yên một lúc thì Nooka
// lim dim rồi ngủ, dù nó đang ở đâu.
const DOZE_BASE = build({ pose: 'down', mouthKind: 'closed', eyeKind: 'half' });
const GRIP_DOZE_BASE = build({ pose: 'grip', mouthKind: 'closed', eyeKind: 'half' });
const nap = (pose, beat) =>
  build({
    pose,
    mouthKind: beat > 0 ? 'sleep_out' : 'sleep',
    eyeKind: 'shut',
    mark: 'sleep',
    beat,
  });

const frames = {
  // Nấp sau thanh nhập, hai tay bám mép.
  GRIP: GRIP_BASE,
  GRIP_B: dipUpper(GRIP_BASE),
  // Hai khung thở: chân đứng im, thân trên nhún một hàng.
  RESTING: RESTING_BASE,
  RESTING_B: dipUpper(RESTING_BASE),
  IDLE_A: build({ pose: 'wave', lift: 0 }),
  IDLE_B: build({ pose: 'wave', lift: 2 }),
  THINK_A: build({ pose: 'think', mark: 'question', mouthKind: 'think' }),
  THINK_B: build({ pose: 'think', dy: -1, mark: 'question', mouthKind: 'think' }),
  YAY_A: build({ pose: 'up', dy: -1, mark: 'spark' }),
  YAY_B: build({ pose: 'up', dy: -3, mark: 'spark' }),
  // Kéo chiếc thang vào từ mép trái màn hình: hai nhịp gồng, thân nhún theo.
  HAUL_A: build({ pose: 'haul', mouthKind: 'closed' }),
  HAUL_B: build({ pose: 'haul', beat: 1, dy: -1, mouthKind: 'closed' }),
  // Leo: tay và chân so le, đổi bên mỗi bậc.
  CLIMB_A: build({ pose: 'climb', mouthKind: 'closed' }),
  CLIMB_B: build({ pose: 'climb', beat: 1, mouthKind: 'closed' }),
  // Với lấy quả bóng bay đang dạt tới.
  CATCH_A: build({ pose: 'catch' }),
  CATCH_B: build({ pose: 'catch', beat: 1, dy: -1 }),
  // Treo dưới quả bóng, chân buông thõng, bồng bềnh một ô.
  FLOAT_A: build({ pose: 'float' }),
  FLOAT_B: build({ pose: 'float', dy: -1 }),
  // Nhảy sang bám mép ô nhập: chân co, hai tay vươn tới.
  HOP_A: build({ pose: 'up', dy: -2 }),
  HOP_B: build({ pose: 'up', dy: -4 }),
  // Lim dim, đứng dưới đất và bám mép. Vẫn thở, chỉ khác đôi mắt.
  DOZE: DOZE_BASE,
  DOZE_B: dipUpper(DOZE_BASE),
  GRIP_DOZE: GRIP_DOZE_BASE,
  GRIP_DOZE_B: dipUpper(GRIP_DOZE_BASE),
  // Ngủ hẳn. Khung B vừa hạ thân trên một hàng vừa đẩy chữ Z lên hai — thở ra
  // thì Z bay lên, và đó là toàn bộ chuyển động cần có ở một nhân vật đang ngủ.
  //
  // **Ngủ là ngồi, ở đâu cũng vậy** — nên không có khung ngủ riêng cho tư thế
  // bám mép. Không ai ngủ trong lúc treo người bằng hai bàn tay: tới mức này
  // Nooka đu lên ngồi hẳn lên mép ô nhập và dùng đúng bộ khung này. Phần nhấc
  // người là việc của màn hình, xem `SIT_LIFT` ở `app/ask.tsx`.
  NAP: nap('sit', 0),
  NAP_B: dipUpper(nap('sit', 2)),
};

const target = process.argv[2];

if (target && target.endsWith('.json')) {
  fs.writeFileSync(target, JSON.stringify(frames, null, 0));
} else {
  const header = [
    '/**',
    ` * Khung hình pixel của linh vật Nooka — ${W} × ${H + HEADROOM} ô.`,
    ' *',
    ' * **File này sinh ra tự động — đừng sửa tay.** Sửa hình thì sửa',
    ' * `scripts/build-mascot-sprite.js` rồi chạy lại:',
    ' *',
    ' *     node scripts/build-mascot-sprite.js',
    ' *',
    ' * Gõ tay từng ký tự thì lệch một cột là hỏng cả hình mà nhìn code không thấy.',
    ' *',
    ' * Mỗi ký tự là một ô màu, tra ở `MASCOT_PALETTE` trong `mascot.ts`. Dấu chấm',
    ' * là ô trong suốt.',
    ' */',
    'export const MASCOT_FRAMES = {',
  ].join('\n');

  const body = Object.entries(frames)
    .map(([name, rows]) => `  ${name}: [\n${rows.map((r) => `    ${JSON.stringify(r)}`).join(',\n')},\n  ],`)
    .join('\n');

  fs.writeFileSync(`${__dirname}/../features/nooka/mascot-frames.ts`, `${header}\n${body}\n} as const;\n`);
}

for (const [k, v] of Object.entries(frames)) {
  console.log(k.padEnd(9), `${v.length} hàng ×`, `${v[0].length} cột`);
}

import { MASCOT_H, MASCOT_W, spritePaths, type SpritePalette, type SpritePath } from './mascot.ts';

/**
 * Quả bóng bay — phương tiện thứ hai để Nooka lên tới mép ô nhập.
 *
 * Cùng việc với chiếc thang ở `ladder.ts`, khác cách kể: thang là công sức,
 * bóng bay là ăn may. Bốc thăm giữa hai cái nằm ở `pickMeans` trong `ascent.ts`
 * — hai lần gõ dài liên tiếp mà lần nào cũng đúng một màn kịch thì tới lần thứ
 * ba người dùng thôi không nhìn nữa.
 *
 * **Dây dài bao nhiêu là do màn hình quyết định**, giống hệt lý do chiếc thang
 * sinh lưới theo số bậc: quả bóng phải nổi hẳn trên đầu Nooka, mà "trên đầu"
 * tính bằng pt thì phụ thuộc cỡ linh vật. `balloonRows` nhận số ô dây.
 *
 * Toàn bộ file là hàm thuần, không import React — chạy được bằng `node --test`.
 */

export const BALLOON_GRID_W = 13;

/**
 * Ký tự **không đụng** bảng của linh vật lẫn của chiếc thang, trừ `o` (viền) và
 * `h` (đốm sáng) vốn cùng nghĩa ở cả ba. Lý do rất thực dụng: cả ba lưới cùng
 * đi qua một công cụ xem (`scripts/preview-mascot-sprite.js`) với một bảng màu
 * chung, nên trùng ký tự là quả bóng hiện ra màu nhôm mà không ai hiểu vì sao.
 */
export const BALLOON_PALETTE: SpritePalette = {
  o: 'balloonOutline',
  r: 'balloonSkin',
  R: 'balloonShade',
  h: 'balloonGleam',
  y: 'balloonString',
};

/** Bán kính thân bóng, tính bằng ô. Thân vừa khít bề ngang lưới. */
const BODY_R = 6;
/** Hàng thắt nút giữa thân và dây. */
const KNOT = 1;

export const balloonGridH = (tail: number) => BODY_R * 2 + 1 + KNOT + tail;

/**
 * Lưới ký tự của quả bóng với đoạn dây dài `tail` ô.
 *
 * Thân là hình tròn đặc có viền, một mảng bóng đổ ở cung dưới phải và một đốm
 * sáng vuông ở trên trái — đúng ngữ pháp khối cầu của bộ sprite này, không phải
 * gradient. Dây **lượn**: một đường thẳng đứng ở cỡ 2pt đọc ra thành cái que.
 */
export function balloonRows(tail: number): string[] {
  const h = balloonGridH(tail);
  const g = Array.from({ length: h }, () => Array<string>(BALLOON_GRID_W).fill('.'));
  const put = (x: number, y: number, ch: string) => {
    if (y >= 0 && y < h && x >= 0 && x < BALLOON_GRID_W) g[y][x] = ch;
  };

  const cx = BODY_R;
  const cy = BODY_R;
  for (let y = 0; y <= BODY_R * 2; y += 1) {
    for (let x = 0; x < BALLOON_GRID_W; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const r2 = dx * dx + dy * dy;
      if (r2 > BODY_R * BODY_R) continue;
      // Viền là vành ngoài cùng của đĩa, đo bằng chính bán kính — cắt theo ô
      // vuông thì góc trên dưới bị vát phẳng.
      const edge = r2 > (BODY_R - 1) * (BODY_R - 1);
      put(x, y, edge ? 'o' : dx + dy > 2 ? 'R' : 'r');
    }
  }
  // Đốm sáng trên trái.
  put(cx - 3, cy - 3, 'h');
  put(cx - 2, cy - 3, 'h');
  put(cx - 3, cy - 2, 'h');

  // Nút thắt, rồi dây lượn xuống.
  const knotY = BODY_R * 2 + 1;
  put(cx - 1, knotY, 'o');
  put(cx, knotY, 'o');
  put(cx + 1, knotY, 'o');
  for (let i = 0; i < tail; i += 1) {
    put(cx + Math.round(Math.sin(i / 2.2)), knotY + KNOT + i, 'y');
  }

  return g.map((row) => row.join(''));
}

export type BalloonSprite = { tail: number; w: number; h: number; paths: SpritePath[] };

const sprites = new Map<number, BalloonSprite>();

export function balloonSprite(tail: number): BalloonSprite {
  const known = sprites.get(tail);
  if (known) return known;
  const rows = balloonRows(tail);
  const made: BalloonSprite = {
    tail,
    w: BALLOON_GRID_W,
    h: rows.length,
    paths: spritePaths(rows, BALLOON_PALETTE),
  };
  sprites.set(tail, made);
  return made;
}

/** Cạnh một ô pixel, tính bằng pt. Ô **vuông**. */
export const BALLOON_CELL = 2;

export const balloonWidth = () => BALLOON_GRID_W * BALLOON_CELL;
export const balloonHeight = (tail: number) => balloonGridH(tail) * BALLOON_CELL;

/**
 * Quả bóng được **cầm ở một bàn tay**, không phải cắm vào người.
 *
 * Hai con số dưới đây đọc thẳng từ lưới linh vật ở tư thế `FLOAT` (xem `pose ===
 * 'float'` trong `scripts/build-mascot-sprite.js`), và **đã tính 3 hàng
 * headroom** mà `liftFrame` chèn vào — đây đúng là chỗ bản trước tính hụt:
 *
 * - Bàn tay trái giơ lên là khối `paw(5, 27)`, đệm bạc hà rơi vào hàng 32–33
 *   cột 6–8. Tâm đệm là **hàng 32, cột 7**, và đó là chỗ đáy dây phải rơi vào.
 *   Có test khoá đúng ô đó là ô bàn tay.
 * - Chóp tai ở hàng 7. Trên mức đó là bầu trời, nên thân bóng phải vượt qua
 *   hàng này mới không đè lên đầu.
 *
 * Viết thành **hàng/cột của lưới** chứ không phải con số pt: `MASCOT_SIZE` là
 * quyết định của màn hình, mà đóng cứng pt ở đây thì đổi cỡ linh vật là quả
 * bóng tuột khỏi tay mà nhìn code không thấy.
 */
export const BALLOON_HAND = { row: 32, col: 7 };

/**
 * Bàn tay trái ở khung `GRIP` — lúc Nooka đã bám vào mép ô nhập.
 *
 * Bám khung là **đổi tư thế**, hai bàn tay hạ xuống và dạt ra: `paw(8, 32)` cho
 * đệm ở hàng 37–38 cột 9–11. Neo dây vào một chỗ cố định cho cả hai tư thế thì
 * lúc bám khung sợi dây lại rơi vào vai — đúng cái lỗi vừa sửa, chỉ khác chặng.
 *
 * Lấy **hàng 38** chứ không phải 37 vì nhịp thở (`GRIP_B`) hạ thân trên một
 * hàng: hàng 38 là đệm bàn tay ở cả hai khung, hàng 37 thì không.
 */
export const BALLOON_HAND_GRIP = { row: 38, col: 10 };

/**
 * Bàn tay trái ở khung `NAP` — lúc Nooka ngồi ngủ trên mép ô nhập.
 *
 * Ngồi là đổi tư thế lần nữa: hai tay là mẩu ngắn buông xuống, đệm rơi vào hàng
 * 41–42 cột 7–8. Lấy **hàng 42** vì nhịp thở (`NAP_B`) hạ thân trên một hàng —
 * hàng 42 là đệm bàn tay ở cả hai khung, hàng 41 thì không.
 */
export const BALLOON_HAND_SIT = { row: 42, col: 8 };

export const BALLOON_HEAD_ROW = 7;

/** Khoảng hở giữa nút thắt bóng và chóp tai, tính bằng pt. */
export const BALLOON_CLEAR = 10;

/**
 * Bóng **ngả về phía bàn tay đang cầm**, tính bằng độ. Âm là ngả sang trái.
 *
 * Đây không phải chi tiết trang trí mà là chỗ sửa đúng cái lỗi "bóng cắm vào
 * người": bàn tay nằm lọt trong bóng của cái đầu, nên một sợi dây thẳng đứng từ
 * đó chui sau đầu rồi biến mất, còn quả bóng thì ngồi ngay trên trán. Ngả quanh
 * **chính bàn tay** thì cả đoạn dây chạy ra ngoài thân, và mắt đọc ra ngay là
 * nó đang được cầm chứ không phải mọc ra từ người.
 */
export const BALLOON_LEAN = -18;

const LEAN_COS = Math.cos((BALLOON_LEAN * Math.PI) / 180);

/** Chỗ đáy dây phải rơi vào: cách mép trái và cách gót Nooka, tính bằng pt. */
export const balloonHold = (
  mascotW: number,
  mascotH: number,
  hand: { row: number; col: number } = BALLOON_HAND,
) => ({
  x: (mascotW * hand.col) / MASCOT_W,
  y: mascotH * (1 - hand.row / MASCOT_H),
});

/**
 * Dây phải đủ dài để **thân bóng nổi hẳn trên đỉnh đầu**, đo từ bàn tay lên.
 *
 * Chia cho `LEAN_COS` vì dây ngả: đi cùng một quãng dọc thì đoạn dây nghiêng
 * phải dài hơn. Bỏ qua vế này là dây hụt và quả bóng lại đè xuống đầu.
 */
export const balloonTail = (mascotH: number) => {
  const climb = (mascotH * (BALLOON_HAND.row - BALLOON_HEAD_ROW)) / MASCOT_H + BALLOON_CLEAR;
  return Math.max(8, Math.round(climb / LEAN_COS / BALLOON_CELL));
};

/**
 * Quả bóng bồng bềnh tại chỗ: biên độ và nhịp. Nhỏ và chậm — một quả bóng nảy
 * mạnh trông như đang bị giật dây.
 */
export const BALLOON_BOB = { travel: 4, ms: 1400 };

/** Bóng nghiêng nhẹ theo nhịp bồng bềnh, tính bằng độ. */
export const BALLOON_SWAY = 5;

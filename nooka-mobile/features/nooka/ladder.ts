import { spritePaths, type SpritePalette, type SpritePath } from './mascot.ts';

/**
 * Chiếc thang nhôm của Nooka: lưới pixel và hình học. **Màn kịch nằm ở
 * `ascent.ts`** — file này chỉ biết vẽ một cái thang dài bao nhiêu.
 *
 * Thang được dựng **thẳng đứng** bên cạnh khung ô nhập: chân đặt ở chỗ ở của
 * Nooka, đầu thang hướng thẳng đứng lên. Chiều dài được tính bằng `ascentLength`
 * ở `ascent.ts`.
 *
 * **Lưới sinh theo số bậc, không phải một khung hình co giãn.** Quãng phải trèo
 * phụ thuộc ô nhập cao bao nhiêu, tức là chỉ biết lúc chạy. Kéo dãn một khung
 * hình cố định thì ô pixel thành hình chữ nhật dẹt và cả món đồ hết là pixel
 * art. `ladderRows` dựng đúng số bậc cần, ô luôn vuông.
 *
 * Toàn bộ file là hàm thuần, không import React — chạy được bằng `node --test`.
 */

/** Bề ngang lưới: 3 ô thanh dọc + 7 ô bậc + 3 ô thanh dọc. */
export const LADDER_GRID_W = 13;

/** Ký tự trong lưới → tên token màu ở `constants/theme.ts`. */
export const LADDER_PALETTE: SpritePalette = {
  o: 'ladderOutline',
  a: 'ladderRail',
  s: 'ladderShade',
  f: 'ladderFoot',
};

/** Mũ đỏ, có ở cả hai đầu thanh. */
const CAP = 2;
/** Bậc dày mấy hàng: hàng trên bắt sáng, hàng dưới là bóng đổ. */
const BAR = 2;
/** Quãng hở giữa hai bậc. */
const GAP = 3;
/** Mỗi bậc chiếm ngần này hàng trong lưới. */
const PITCH = BAR + GAP;
/**
 * Đoạn thanh trần trên bậc cao nhất — chỗ vịn khi bước qua.
 *
 * Bằng đúng `GAP` để hai đầu thang cân nhau: quãng hở đuôi của bậc thấp nhất
 * chính là đoạn trần ở chân thang, nên chỉ cần khai một lần ở đầu trên. Cộng
 * thêm một `FOOT` riêng là đếm hai lần và đáy thang hở rộng hơn hẳn khoảng giữa
 * các bậc — mắt bắt được ngay.
 */
const HEAD = GAP;

export const ladderGridH = (rungs: number) => CAP + HEAD + rungs * PITCH + CAP;

/**
 * Lưới ký tự của một chiếc thang `rungs` bậc.
 *
 * Thanh dọc ba ô: viền ở mặt ngoài, nhôm ở giữa, bóng ở mặt trong — đủ để đọc
 * ra tiết diện tròn mà không cần thêm màu. Bậc hai hàng: hàng trên bắt sáng,
 * hàng dưới là bóng đổ. Đinh tán là một ô viền trên thanh ngay chỗ bậc cắm vào.
 */
export function ladderRows(rungs: number): string[] {
  const h = ladderGridH(rungs);
  const g = Array.from({ length: h }, () => Array<string>(LADDER_GRID_W).fill('.'));
  const put = (x: number, y: number, ch: string) => {
    if (y >= 0 && y < h && x >= 0 && x < LADDER_GRID_W) g[y][x] = ch;
  };

  for (let y = 0; y < h; y += 1) {
    const capped = y < CAP || y >= h - CAP;
    const rail = capped ? 'f' : 'a';
    const inner = capped ? 'f' : 's';
    put(0, y, 'o');
    put(1, y, rail);
    put(2, y, inner);
    put(LADDER_GRID_W - 3, y, inner);
    put(LADDER_GRID_W - 2, y, rail);
    put(LADDER_GRID_W - 1, y, 'o');
  }

  for (let i = 0; i < rungs; i += 1) {
    const y = CAP + HEAD + i * PITCH;
    for (let x = 3; x <= LADDER_GRID_W - 4; x += 1) {
      put(x, y, 'a');
      for (let d = 1; d < BAR; d += 1) put(x, y + d, 's');
    }
    put(1, y, 'o');
    put(LADDER_GRID_W - 2, y, 'o');
  }

  return g.map((row) => row.join(''));
}

export type LadderSprite = { rungs: number; w: number; h: number; paths: SpritePath[] };

// Số bậc chỉ chạy trong khoảng `LADDER_RUNGS`, tức là nhiều nhất vài lưới khác
// nhau trong cả vòng đời app — nhớ lại rẻ hơn dựng lại mỗi lần ô nhập cao lên.
const sprites = new Map<number, LadderSprite>();

export function ladderSprite(rungs: number): LadderSprite {
  const known = sprites.get(rungs);
  if (known) return known;
  const rows = ladderRows(rungs);
  const made: LadderSprite = {
    rungs,
    w: LADDER_GRID_W,
    h: rows.length,
    paths: spritePaths(rows, LADDER_PALETTE),
  };
  sprites.set(rungs, made);
  return made;
}

/** Cạnh một ô pixel, tính bằng pt. Ô **vuông** — chiều cao suy ra từ đây. */
export const LADDER_CELL = 2.8;

/** Một bậc cao bao nhiêu pt. Cũng là quãng Nooka đi được sau mỗi nhịp leo. */
export const RUNG_RISE = PITCH * LADDER_CELL;

/**
 * Ít hơn `min` bậc thì đó là cái ghế đẩu chứ không phải cái thang; quá `max`
 * thì thang vượt khỏi màn hình. Ô nhập bị chặn ở `maxHeight: 120` nên `max`
 * này dư sức phủ trường hợp xấu nhất.
 */
export const LADDER_RUNGS = { min: 3, max: 8 };

export const ladderWidth = () => LADDER_GRID_W * LADDER_CELL;
export const ladderHeight = (rungs: number) => ladderGridH(rungs) * LADDER_CELL;

/**
 * Hai đầu thang chiếm ngần này pt dù có bao nhiêu bậc: mũ đỏ trên, đoạn trần
 * vịn tay, và đế đỏ dưới. Đây là phần **không** đổi theo số bậc.
 */
const LADDER_ENDS = ladderGridH(0) * LADDER_CELL;

/**
 * Số bậc vừa đủ cho một chiếc thang dài `length` pt **đo dọc thân thang**.
 *
 * Truyền chiều cao vào đây là sai từ khi thang chuyển sang dựa nghiêng: thang
 * dựa thì thân dài hơn quãng dọc đúng bằng cạnh huyền, và một chiếc thang ngắn
 * hơn khoảng cách nó phải bắc qua là chiếc thang chống lên không khí. Dùng
 * `ascentLength` ở `ascent.ts`.
 *
 * Trừ `LADDER_ENDS` ra trước khi chia là để **nghịch đảo đúng `ladderHeight`**.
 * Chia thẳng cho `RUNG_RISE` thì hai đầu thang bị tính thành bậc và chiếc thang
 * nào cũng thừa hơn một bậc — thừa thì không sai về hình học, nhưng nó chọc lên
 * quá cao khỏi mép ô nhập và đọc ra thành một cái thang đặt hớ.
 */
export const ladderRungs = (length: number) =>
  Math.min(
    LADDER_RUNGS.max,
    Math.max(LADDER_RUNGS.min, Math.ceil((length - LADDER_ENDS) / RUNG_RISE)),
  );

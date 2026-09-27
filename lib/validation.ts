// クライアント・サーバー共通のバリデーション（DATA_AND_API.md「バリデーション」）

export function graphemeCount(v: string): number {
  try {
    return [...new Intl.Segmenter('ja', { granularity: 'grapheme' }).segment(v)].length;
  } catch {
    return [...v].length;
  }
}

/** 書記素1つ かつ Extended_Pictographic を含む（🐣 ✓ / 👨‍👩‍👧 ✓ / 🇯🇵 ✓ / 🐣🍙 ✗ / a ✗） */
export function isOneEmoji(v: string): boolean {
  if (!v) return false;
  if (graphemeCount(v) !== 1) return false;
  // 国旗（Regional Indicator 2文字）は Extended_Pictographic に含まれないため別扱い
  return /\p{Extended_Pictographic}/u.test(v) || /^\p{Regional_Indicator}{2}$/u.test(v);
}

export function isValidName(v: string): boolean {
  const t = v.trim();
  return t.length >= 1 && t.length <= 20;
}

const MAP_URL = /^https:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|(www\.)?google\.(com|co\.jp)\/maps|maps\.google\.(com|co\.jp))\//;

export function isMapUrl(v: string): boolean {
  return MAP_URL.test(v.trim());
}

/** 重複判定用の店名キー：空白除去・NFKC・小文字化 */
export function nameKey(v: string): string {
  return v.normalize('NFKC').replace(/\s/g, '').toLowerCase();
}

/** プロフィール画像：端末で縮小した data URL（jpeg/png/webp）。サイズ上限つき */
export const IMAGE_MAX_CHARS = 100_000;
export function isImageDataUrl(v: string): boolean {
  return v.length <= IMAGE_MAX_CHARS && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(v);
}

export const LIMITS = { name: 20, shopName: 40, shopNote: 100, recruitNote: 60, placeOther: 30 } as const;

export const GENRES = [
  { v: 'ラーメン', e: '🍜' },
  { v: 'うどん・そば', e: '🥢' },
  { v: '寿司・海鮮', e: '🍣' },
  { v: 'カレー', e: '🍛' },
  { v: 'タイ料理', e: '🌶️' },
  { v: '和食', e: '🍱' },
  { v: 'イタリアン', e: '🍝' },
  { v: 'その他', e: '🍽️' },
] as const;

export const WALKS = ['5分以内', '10分以内', '10分以上'] as const;
export const BUDGETS = ['〜1,000円', '〜1,500円', '1,500円〜'] as const;

export const PLACES = [
  { v: '1階ロビー', e: '🏢' },
  { v: '8階エレベーター前', e: '🛗' },
  { v: '現地', e: '📍' },
  { v: 'その他', e: '✏️' },
] as const;

/** 出発時間：この範囲を STEP 分刻みで自由に選べる（JST） */
export const DEPART_RANGE = { from: '11:00', to: '14:00', stepMin: 5 } as const;

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const toHHMM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/** 選べる出発時間の一覧（'11:00', '11:05', … '14:00'） */
export function departTimes(): string[] {
  const out: string[] = [];
  for (let m = toMin(DEPART_RANGE.from); m <= toMin(DEPART_RANGE.to); m += DEPART_RANGE.stepMin) out.push(toHHMM(m));
  return out;
}

/** 'HH:MM' 形式で、範囲内かつ刻みに合っているか */
export function isDepartTime(t: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(t)) return false;
  const m = toMin(t);
  return m >= toMin(DEPART_RANGE.from) && m <= toMin(DEPART_RANGE.to) && (m - toMin(DEPART_RANGE.from)) % DEPART_RANGE.stepMin === 0;
}

export type Genre = (typeof GENRES)[number]['v'];
export type Walk = (typeof WALKS)[number];
export type Budget = (typeof BUDGETS)[number];
export type Place = (typeof PLACES)[number]['v'];
export type DepartTime = string; // 'HH:MM'

export function genreEmoji(genre: string): string {
  return GENRES.find((g) => g.v === genre)?.e ?? '🍽️';
}

// 明示的に 'true' のときだけモック（設定漏れで本番が架空データにならないように）
export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

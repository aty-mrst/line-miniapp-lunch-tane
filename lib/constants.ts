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

export const DEPART_TIMES = ['12:00', '12:15', '12:30', '12:45', '13:00', '13:15'] as const;

export type Genre = (typeof GENRES)[number]['v'];
export type Walk = (typeof WALKS)[number];
export type Budget = (typeof BUDGETS)[number];
export type Place = (typeof PLACES)[number]['v'];
export type DepartTime = (typeof DEPART_TIMES)[number];

export function genreEmoji(genre: string): string {
  return GENRES.find((g) => g.v === genre)?.e ?? '🍽️';
}

export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== 'false';

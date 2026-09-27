import { RANKING_SIZE } from '../constants';
import type { ShopSummary } from './types';

/** hash(date + userId) をシードに3店。気になる店があれば1店はそこから。 */
export function pickRecommend(all: ShopSummary[], seedStr: string): ShopSummary[] {
  let h = 2166136261;
  for (const c of seedStr) h = Math.imul(h ^ c.codePointAt(0)!, 16777619);
  const rand = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
  const pool = [...all];
  const picked: ShopSummary[] = [];
  const liked = pool.filter((s) => s.liked);
  if (liked.length) {
    const s = liked[Math.floor(rand() * liked.length)];
    picked.push(s);
    pool.splice(pool.indexOf(s), 1);
  }
  while (picked.length < 3 && pool.length) picked.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  return picked;
}

/** 気になる数ランキング：1人以上の店を多い順（同数は新しい順）に上位 RANKING_SIZE 件 */
export function rankShops(all: ShopSummary[]): ShopSummary[] {
  return all
    .filter((s) => s.likeCount > 0)
    .sort((a, b) => b.likeCount - a.likeCount || b.createdAt.localeCompare(a.createdAt))
    .slice(0, RANKING_SIZE);
}

/** 自分が登録した店に、ほかの人が付けた「気になる」の数（自分で付けた分は数えない） */
export function receivedLikes(s: ShopSummary): number {
  return s.likeCount - (s.liked ? 1 : 0);
}

/** 自分の店の数と、もらった「気になる」の合計 */
export function myShopStats(all: ShopSummary[]) {
  const mine = all.filter((s) => s.createdBy.isMe);
  return { myShopCount: mine.length, receivedLikes: mine.reduce((n, s) => n + receivedLikes(s), 0) };
}

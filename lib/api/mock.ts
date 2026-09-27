// メモリ上のモックAPI（NEXT_PUBLIC_USE_MOCK=true）。seed.json から作る。
// 画面側は Api インターフェースだけを見るので、本番実装（http.ts）と差し替え可能。
import seed from '../seed.json';
import { MAX_RECRUITS_PER_DAY, genreEmoji, isDepartTime, type Budget, type DepartTime, type Genre, type Walk } from '../constants';
import { isImageDataUrl, isOneEmoji, isMapUrl, isValidName, nameKey } from '../validation';
import { isPast, jstDate } from '../time';
import {
  ApiError, type Api, type DuplicateShop, type HomeData, type Me, type Person, type Recruit, type RecruitInput,
  type ShopDetail, type ShopFilter, type ShopInput, type ShopSummary,
} from './types';
import { pickRecommend, rankShops } from './recommend';

type UserRow = { id: string; name: string; icon: string; image: string | null };
type ShopRow = { id: string; name: string; genre: Genre; walk: Walk; budget: Budget; note: string; mapUrl: string; createdBy: string; createdAt: string };
type RecruitRow = { id: string; shopId: string; hostId: string; date: string; departTime: DepartTime; place: string; placeOther?: string; note: string; canceled: boolean; createdAt: number };

export type MockOptions = {
  /** false なら未登録ユーザーとして起動（登録画面へ） */
  registered?: boolean;
  /** 有効にする seed の募集キー（省略時はすべて） */
  recruits?: string[];
  noShops?: boolean;
  /** 自分が「気になる」にしている店 */
  liked?: string[];
  /** 自分が参加している募集 */
  joined?: string[];
  /** 自分の募集を1件足す */
  mine?: { shop: string; departTime: DepartTime; place: string; participants?: string[] };
  /** おすすめ3店を固定（デザイン再現用） */
  recommend?: string[];
  latency?: number;
  /** 指定したメソッドを失敗させる。'once' は1回だけ */
  fail?: Partial<Record<keyof Api, true | 'once'>>;
  /** 指定したメソッドを解決させない（読み込み中の再現） */
  hang?: (keyof Api)[];
  now?: string;
  /** seed に店を足す（登録完了画面の再現用） */
  extraShops?: { id: string; name: string; genre: Genre; walk: Walk; budget: Budget; note?: string; mapUrl: string; createdAt: string }[];
};

const ME_ID = 'me';

export function createMockApi(opts: MockOptions = {}): Api {
  const latency = opts.latency ?? 150;
  const fixedNow = opts.now ?? process.env.NEXT_PUBLIC_DEV_NOW;
  const baseReal = Date.now();
  const baseFixed = fixedNow ? new Date(fixedNow).getTime() : null;
  // 固定時刻からの経過は実時間で進める
  const now = () => new Date(baseFixed === null ? Date.now() : baseFixed + (Date.now() - baseReal));

  const users = new Map<string, UserRow>();
  for (const u of seed.users) {
    if (u.key === 'me' && opts.registered === false) continue;
    users.set(u.key, { id: u.key, name: u.name, icon: u.icon, image: null });
  }

  let shops: ShopRow[] = opts.noShops
    ? []
    : seed.shops.map((s) => ({
        id: s.key, name: s.name, genre: s.genre as Genre, walk: s.walk as Walk, budget: s.budget as Budget,
        note: s.note, mapUrl: s.mapUrl, createdBy: s.createdBy, createdAt: s.createdAt,
      }));
  for (const x of opts.extraShops ?? []) shops.push({ ...x, note: x.note ?? '', createdBy: ME_ID });
  const interests = new Set<string>(); // `${userId}|${shopId}`
  const reactions = new Set<string>();
  for (const s of seed.shops) {
    s.interests.forEach((u) => interests.add(`${u}|${s.key}`));
    // リアクションの初期値：気になる人のうち登録者以外の数人
    s.interests.slice(1).forEach((u) => reactions.add(`${u}|${s.key}`));
  }
  (opts.liked ?? []).forEach((id) => interests.add(`${ME_ID}|${id}`));

  const today = jstDate(now());
  const enabled = opts.recruits ? new Set(opts.recruits) : null;
  let seq = 0;
  let recruits: RecruitRow[] = opts.noShops
    ? []
    : seed.recruits
        .filter((r) => !enabled || enabled.has(r.key))
        .map((r) => ({
          id: r.key, shopId: r.shop, hostId: r.host, date: today, departTime: r.departTime as DepartTime,
          place: r.place, placeOther: (r as { placeOther?: string }).placeOther, note: '', canceled: false, createdAt: seq++,
        }));
  const participants = new Set<string>(); // `${recruitId}|${userId}`
  for (const r of seed.recruits) r.participants.forEach((u) => participants.add(`${r.key}|${u}`));
  (opts.joined ?? []).forEach((id) => participants.add(`${id}|${ME_ID}`));
  if (opts.mine) {
    recruits.unshift({ id: 'rm', shopId: opts.mine.shop, hostId: ME_ID, date: today, departTime: opts.mine.departTime, place: opts.mine.place, note: '', canceled: false, createdAt: seq++ });
    (opts.mine.participants ?? []).forEach((u) => participants.add(`rm|${u}`));
  }

  const failed = new Set<string>();
  function gate<T>(name: keyof Api, fn: () => T): Promise<T> {
    if (opts.hang?.includes(name)) return new Promise(() => {});
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const f = opts.fail?.[name];
        if (f && !(f === 'once' && failed.has(name))) {
          failed.add(name);
          reject(new ApiError(0, 'NETWORK', '通信エラー'));
          return;
        }
        try {
          resolve(fn());
        } catch (e) {
          reject(e);
        }
      }, latency);
    });
  }

  const requireMe = () => {
    const me = users.get(ME_ID);
    if (!me) throw new ApiError(404, 'NOT_REGISTERED', '未登録です');
    return me;
  };
  const person = (id: string): Person => {
    const u = users.get(id);
    return { name: u?.name ?? '?', icon: u?.icon ?? '🙂', image: u?.image ?? null, isMe: id === ME_ID };
  };
  const likersOf = (shopId: string) => [...interests].filter((k) => k.endsWith(`|${shopId}`)).map((k) => k.split('|')[0]);
  const shopById = (id: string) => {
    const s = shops.find((x) => x.id === id);
    if (!s) throw new ApiError(404, 'NOT_FOUND', 'お店が見つかりません');
    return s;
  };
  const summary = (s: ShopRow): ShopSummary => ({
    id: s.id, name: s.name, emoji: genreEmoji(s.genre), genre: s.genre, walk: s.walk, budget: s.budget,
    likeCount: likersOf(s.id).length, liked: interests.has(`${ME_ID}|${s.id}`), createdBy: person(s.createdBy), createdAt: s.createdAt,
  });
  const activeRecruits = () => recruits.filter((r) => !r.canceled && r.date === jstDate(now()) && shops.some((s) => s.id === r.shopId));
  const toRecruit = (r: RecruitRow): Recruit => {
    const s = shopById(r.shopId);
    const count = 1 + [...participants].filter((k) => k.startsWith(`${r.id}|`)).length;
    const isMine = r.hostId === ME_ID;
    return {
      id: r.id, shop: { id: s.id, name: s.name, emoji: genreEmoji(s.genre) }, host: person(r.hostId), departTime: r.departTime,
      place: r.place === 'その他' ? r.placeOther ?? 'その他' : r.place, note: r.note, count,
      joined: participants.has(`${r.id}|${ME_ID}`), isMine, closed: isPast(r.departTime, now()),
      likedByMe: !isMine && interests.has(`${ME_ID}|${s.id}`),
    };
  };
  const sortRecruits = (a: RecruitRow, b: RecruitRow) => a.departTime.localeCompare(b.departTime) || a.createdAt - b.createdAt;
  const findDup = (url: string, name: string, excludeId?: string): DuplicateShop | null => {
    const key = nameKey(name);
    const d = shops.find((s) => s.id !== excludeId && ((url && s.mapUrl === url.trim()) || (key && nameKey(s.name) === key)));
    return d ? { id: d.id, name: d.name, emoji: genreEmoji(d.genre), createdByName: person(d.createdBy).name } : null;
  };
  const validateShop = (i: ShopInput) => {
    if (!isMapUrl(i.mapUrl)) throw new ApiError(400, 'INVALID', 'リンクを確認してください');
    if (!i.name.trim() || i.name.trim().length > 40) throw new ApiError(400, 'INVALID', '店名を確認してください');
    if (i.note.length > 100) throw new ApiError(400, 'INVALID', 'ひとことが長すぎます');
  };

  return {
    now,
    getMe: () => gate('getMe', () => (users.get(ME_ID) ? { ...users.get(ME_ID)! } : null)),
    register: ({ name, icon, image }) =>
      gate('register', (): Me => {
        if (!isValidName(name) || !isOneEmoji(icon) || (image && !isImageDataUrl(image))) throw new ApiError(400, 'INVALID', '入力内容を確認してください');
        const me = { id: ME_ID, name: name.trim(), icon, image: image ?? null };
        users.set(ME_ID, me);
        return { ...me };
      }),
    updateMe: ({ name, icon, image }) =>
      gate('updateMe', (): Me => {
        const me = requireMe();
        if (!isValidName(name) || !isOneEmoji(icon) || (image && !isImageDataUrl(image))) throw new ApiError(400, 'INVALID', '入力内容を確認してください');
        Object.assign(me, { name: name.trim(), icon, image: image ?? null });
        return { ...me };
      }),
    getHome: () =>
      gate('getHome', (): HomeData => {
        requireMe();
        const all = shops.map(summary);
        let recommend: ShopSummary[];
        if (opts.recommend) {
          recommend = opts.recommend.map((id) => all.find((s) => s.id === id)).filter((s): s is ShopSummary => !!s);
        } else {
          recommend = pickRecommend(all, `${jstDate(now())}|${ME_ID}`);
        }
        const list = activeRecruits().sort(sortRecruits).map(toRecruit).filter((r) => !r.closed);
        return { recommend, ranking: rankShops(all), recruits: list, shopCount: shops.length, likedCount: all.filter((s) => s.liked).length };
      }),
    listShops: (filter?: ShopFilter) =>
      gate('listShops', () => {
        requireMe();
        return shops
          .map(summary)
          .filter((s) => !filter || ((!filter.walk.length || filter.walk.includes(s.walk)) && (!filter.budget.length || filter.budget.includes(s.budget)) && (!filter.genre.length || filter.genre.includes(s.genre))))
          .sort((a, b) => b.likeCount - a.likeCount || b.createdAt.localeCompare(a.createdAt));
      }),
    checkShop: ({ url, name, excludeId }) => gate('checkShop', () => findDup(url, name, excludeId)),
    getShop: (id) =>
      gate('getShop', (): ShopDetail => {
        requireMe();
        const s = shopById(id);
        const likerIds = likersOf(id).sort((a, b) => (a === ME_ID ? -1 : b === ME_ID ? 1 : 0));
        return {
          ...summary(s), note: s.note, mapUrl: s.mapUrl, likers: likerIds.map(person),
          reactionCount: [...reactions].filter((k) => k.endsWith(`|${id}`)).length, reacted: reactions.has(`${ME_ID}|${id}`),
          recruits: activeRecruits().filter((r) => r.shopId === id).sort(sortRecruits).map(toRecruit),
        };
      }),
    createShop: (input) =>
      gate('createShop', () => {
        requireMe();
        validateShop(input);
        const dup = findDup(input.mapUrl, input.name);
        if (dup) throw new ApiError(409, 'DUPLICATE', 'すでに登録されているお店です', dup);
        const row: ShopRow = { id: `x${Date.now()}`, ...input, name: input.name.trim(), note: input.note.trim(), mapUrl: input.mapUrl.trim(), createdBy: ME_ID, createdAt: new Date(now()).toISOString() };
        shops = [...shops, row];
        return summary(row);
      }),
    updateShop: (id, input) =>
      gate('updateShop', () => {
        const s = shopById(id);
        if (s.createdBy !== ME_ID) throw new ApiError(403, 'FORBIDDEN', '編集できません');
        validateShop(input);
        const dup = findDup(input.mapUrl, input.name, id);
        if (dup) throw new ApiError(409, 'DUPLICATE', 'すでに登録されているお店です', dup);
        Object.assign(s, { ...input, name: input.name.trim(), note: input.note.trim(), mapUrl: input.mapUrl.trim() });
        return summary(s);
      }),
    deleteShop: (id) =>
      gate('deleteShop', () => {
        const s = shopById(id);
        if (s.createdBy !== ME_ID) throw new ApiError(403, 'FORBIDDEN', '削除できません');
        shops = shops.filter((x) => x.id !== id);
        recruits = recruits.filter((r) => r.shopId !== id);
        for (const k of [...interests]) if (k.endsWith(`|${id}`)) interests.delete(k);
        for (const k of [...reactions]) if (k.endsWith(`|${id}`)) reactions.delete(k);
      }),
    setInterest: (shopId, on) =>
      gate('setInterest', () => {
        shopById(shopId);
        if (on) interests.add(`${ME_ID}|${shopId}`);
        else interests.delete(`${ME_ID}|${shopId}`);
      }),
    setReaction: (shopId, on) =>
      gate('setReaction', () => {
        shopById(shopId);
        if (on) reactions.add(`${ME_ID}|${shopId}`);
        else reactions.delete(`${ME_ID}|${shopId}`);
      }),
    createRecruit: (input: RecruitInput) =>
      gate('createRecruit', () => {
        requireMe();
        shopById(input.shopId);
        if (!isDepartTime(input.departTime) || isPast(input.departTime, now())) throw new ApiError(400, 'INVALID', 'その出発時間は選べません');
        if (input.place === 'その他' && !input.placeOther?.trim()) throw new ApiError(400, 'INVALID', '集合場所を入力してください');
        if (activeRecruits().filter((r) => r.hostId === ME_ID).length >= MAX_RECRUITS_PER_DAY) throw new ApiError(409, 'ALREADY_HOSTING', `今日の募集は${MAX_RECRUITS_PER_DAY}件までです`);
        const row: RecruitRow = {
          id: `rx${Date.now()}`, shopId: input.shopId, hostId: ME_ID, date: jstDate(now()), departTime: input.departTime, place: input.place,
          placeOther: input.place === 'その他' ? input.placeOther?.trim() : undefined, note: input.note?.trim() ?? '', canceled: false, createdAt: seq++,
        };
        recruits = [...recruits, row];
        return toRecruit(row);
      }),
    cancelRecruit: (id) =>
      gate('cancelRecruit', () => {
        const r = recruits.find((x) => x.id === id);
        if (!r || r.hostId !== ME_ID) throw new ApiError(403, 'FORBIDDEN', '取り消せません');
        r.canceled = true;
      }),
    setJoin: (id, on) =>
      gate('setJoin', () => {
        const r = recruits.find((x) => x.id === id && !x.canceled);
        if (!r) throw new ApiError(410, 'CLOSED', 'この募集は取り消されました');
        if (r.hostId === ME_ID) throw new ApiError(400, 'INVALID', '自分の募集には参加できません');
        if (isPast(r.departTime, now())) throw new ApiError(410, 'CLOSED', 'この募集は締め切りました');
        if (on) participants.add(`${id}|${ME_ID}`);
        else participants.delete(`${id}|${ME_ID}`);
      }),
  };
}

import 'server-only';
import { and, asc, eq, isNull, sql, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db';
import { interests, participants, reactions, recruits, shops, users } from '../db/schema';
import { BUDGETS, GENRES, PLACES, WALKS, genreEmoji, isDepartTime, type DepartTime } from '../constants';
import { now } from '../clock';
import { isPast, jstDate } from '../time';
import { isMapUrl, isOneEmoji, nameKey } from '../validation';
import { pickRecommend } from '../api/recommend';
import { ApiError, type DuplicateShop, type HomeData, type Me, type Person, type Recruit, type ShopDetail, type ShopFilter, type ShopSummary } from '../api/types';

/* ---------- 入力の検証（クライアントと同じルール） ---------- */

const genreValues = GENRES.map((g) => g.v) as [string, ...string[]];
export const registerInput = z.object({
  name: z.string().trim().min(1).max(20),
  icon: z.string().refine(isOneEmoji),
});
export const shopInput = z.object({
  mapUrl: z.string().trim().refine(isMapUrl),
  name: z.string().trim().min(1).max(40),
  genre: z.enum(genreValues),
  walk: z.enum(WALKS),
  budget: z.enum(BUDGETS),
  note: z.string().trim().max(100).default(''),
});
export const recruitInput = z
  .object({
    shopId: z.string().uuid(),
    departTime: z.string().refine(isDepartTime),
    place: z.enum(PLACES.map((p) => p.v) as [string, ...string[]]),
    placeOther: z.string().trim().max(30).optional(),
    note: z.string().trim().max(60).optional(),
  })
  .refine((v) => v.place !== 'その他' || !!v.placeOther, { path: ['placeOther'] });

const isUniqueViolation = (e: unknown, constraint?: string) => {
  const err = e as { code?: string; constraint_name?: string; cause?: { code?: string; constraint_name?: string } };
  const c = err.cause ?? err;
  return c.code === '23505' && (!constraint || c.constraint_name === constraint);
};
const uuidOk = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

/* ---------- ユーザー ---------- */

type MeRow = { id: string; name: string; icon: string };

export async function findMe(lineUserId: string): Promise<MeRow | null> {
  const [u] = await db.select({ id: users.id, name: users.name, icon: users.icon }).from(users).where(eq(users.lineUserId, lineUserId));
  return u ?? null;
}

export async function requireMe(lineUserId: string): Promise<MeRow> {
  const me = await findMe(lineUserId);
  if (!me) throw new ApiError(404, 'NOT_REGISTERED', '未登録です');
  return me;
}

export async function register(lineUserId: string, input: z.infer<typeof registerInput>): Promise<Me> {
  const [u] = await db
    .insert(users)
    .values({ lineUserId, name: input.name, icon: input.icon })
    .onConflictDoUpdate({ target: users.lineUserId, set: { name: input.name, icon: input.icon } })
    .returning({ id: users.id, name: users.name, icon: users.icon });
  return u;
}

export async function updateMe(lineUserId: string, input: z.infer<typeof registerInput>): Promise<Me> {
  const me = await requireMe(lineUserId);
  const [u] = await db
    .update(users)
    .set({ name: input.name, icon: input.icon })
    .where(eq(users.id, me.id))
    .returning({ id: users.id, name: users.name, icon: users.icon });
  return u;
}

/* ---------- 店 ---------- */

const person = (u: { id: string; name: string; icon: string }, meId: string): Person => ({ name: u.name, icon: u.icon, isMe: u.id === meId });

async function shopSummaries(meId: string, where?: SQL): Promise<(ShopSummary & { note: string; mapUrl: string })[]> {
  const rows = await db
    .select({
      s: shops,
      creator: { id: users.id, name: users.name, icon: users.icon },
      likeCount: sql<number>`(select count(*) from ${interests} i where i.shop_id = ${shops.id})::int`,
      liked: sql<boolean>`exists(select 1 from ${interests} i where i.shop_id = ${shops.id} and i.user_id = ${meId})`,
    })
    .from(shops)
    .innerJoin(users, eq(users.id, shops.createdBy))
    .where(where);
  return rows.map(({ s, creator, likeCount, liked }) => ({
    id: s.id, name: s.name, emoji: genreEmoji(s.genre), genre: s.genre, walk: s.walk, budget: s.budget,
    likeCount, liked, createdBy: person(creator, meId), createdAt: s.createdAt.toISOString(), note: s.note, mapUrl: s.mapUrl,
  }));
}

const strip = ({ note: _n, mapUrl: _m, ...s }: ShopSummary & { note: string; mapUrl: string }): ShopSummary => s;

export async function listShops(lineUserId: string, f?: ShopFilter): Promise<ShopSummary[]> {
  const me = await requireMe(lineUserId);
  const list = (await shopSummaries(me.id)).map(strip);
  return list
    .filter((s) => !f || ((!f.walk.length || f.walk.includes(s.walk)) && (!f.budget.length || f.budget.includes(s.budget)) && (!f.genre.length || f.genre.includes(s.genre))))
    .sort((a, b) => b.likeCount - a.likeCount || b.createdAt.localeCompare(a.createdAt));
}

export async function checkShop(url: string, name: string, excludeId?: string): Promise<DuplicateShop | null> {
  const key = name ? nameKey(name) : '';
  const conds: SQL[] = [];
  if (url.trim()) conds.push(eq(shops.mapUrl, url.trim()));
  if (key) conds.push(eq(shops.nameKey, key));
  if (!conds.length) return null;
  const rows = await db
    .select({ id: shops.id, name: shops.name, genre: shops.genre, by: users.name })
    .from(shops)
    .innerJoin(users, eq(users.id, shops.createdBy))
    .where(sql`(${sql.join(conds, sql` or `)})${excludeId && uuidOk(excludeId) ? sql` and ${shops.id} <> ${excludeId}` : sql``}`)
    .limit(1);
  const d = rows[0];
  return d ? { id: d.id, name: d.name, emoji: genreEmoji(d.genre), createdByName: d.by } : null;
}

export async function getShop(lineUserId: string, id: string): Promise<ShopDetail> {
  const me = await requireMe(lineUserId);
  if (!uuidOk(id)) throw new ApiError(404, 'NOT_FOUND', 'お店が見つかりません');
  const [s] = await shopSummaries(me.id, eq(shops.id, id));
  if (!s) throw new ApiError(404, 'NOT_FOUND', 'お店が見つかりません');
  const likers = await db
    .select({ id: users.id, name: users.name, icon: users.icon })
    .from(interests)
    .innerJoin(users, eq(users.id, interests.userId))
    .where(eq(interests.shopId, id))
    .orderBy(sql`${users.id} = ${me.id} desc`, asc(interests.createdAt));
  const [rx] = await db
    .select({
      count: sql<number>`count(*)::int`,
      mine: sql<boolean>`coalesce(bool_or(${reactions.userId} = ${me.id}), false)`,
    })
    .from(reactions)
    .where(eq(reactions.shopId, id));
  return {
    ...s, likers: likers.map((u) => person(u, me.id)), reactionCount: rx.count, reacted: rx.mine,
    recruits: await todayRecruits(me.id, eq(recruits.shopId, id)),
  };
}

export async function createShop(lineUserId: string, input: z.infer<typeof shopInput>): Promise<ShopSummary> {
  const me = await requireMe(lineUserId);
  const dup = await checkShop(input.mapUrl, input.name);
  if (dup) throw new ApiError(409, 'DUPLICATE', 'すでに登録されているお店です', dup);
  try {
    const [row] = await db
      .insert(shops)
      .values({ ...input, genre: input.genre as ShopSummary['genre'], nameKey: nameKey(input.name), createdBy: me.id })
      .returning({ id: shops.id });
    const [s] = await shopSummaries(me.id, eq(shops.id, row.id));
    return strip(s);
  } catch (e) {
    if (isUniqueViolation(e)) {
      const d = await checkShop(input.mapUrl, input.name);
      throw new ApiError(409, 'DUPLICATE', 'すでに登録されているお店です', d ?? undefined);
    }
    throw e;
  }
}

async function requireOwnShop(meId: string, id: string) {
  if (!uuidOk(id)) throw new ApiError(404, 'NOT_FOUND', 'お店が見つかりません');
  const [s] = await db.select({ createdBy: shops.createdBy }).from(shops).where(eq(shops.id, id));
  if (!s) throw new ApiError(404, 'NOT_FOUND', 'お店が見つかりません');
  if (s.createdBy !== meId) throw new ApiError(403, 'FORBIDDEN', '登録した人だけが変更できます');
}

export async function updateShop(lineUserId: string, id: string, input: z.infer<typeof shopInput>): Promise<ShopSummary> {
  const me = await requireMe(lineUserId);
  await requireOwnShop(me.id, id);
  const dup = await checkShop(input.mapUrl, input.name, id);
  if (dup) throw new ApiError(409, 'DUPLICATE', 'すでに登録されているお店です', dup);
  await db
    .update(shops)
    .set({ ...input, genre: input.genre as ShopSummary['genre'], nameKey: nameKey(input.name) })
    .where(eq(shops.id, id));
  const [s] = await shopSummaries(me.id, eq(shops.id, id));
  return strip(s);
}

export async function deleteShop(lineUserId: string, id: string): Promise<void> {
  const me = await requireMe(lineUserId);
  await requireOwnShop(me.id, id);
  await db.delete(shops).where(eq(shops.id, id)); // 気になる・リアクション・募集・参加は cascade で消える
}

export async function setInterest(lineUserId: string, shopId: string, on: boolean): Promise<void> {
  const me = await requireMe(lineUserId);
  if (!uuidOk(shopId)) throw new ApiError(404, 'NOT_FOUND', 'お店が見つかりません');
  if (on) {
    try {
      await db.insert(interests).values({ userId: me.id, shopId }).onConflictDoNothing();
    } catch {
      throw new ApiError(404, 'NOT_FOUND', 'お店が見つかりません');
    }
  } else await db.delete(interests).where(and(eq(interests.userId, me.id), eq(interests.shopId, shopId)));
}

export async function setReaction(lineUserId: string, shopId: string, on: boolean): Promise<void> {
  const me = await requireMe(lineUserId);
  if (!uuidOk(shopId)) throw new ApiError(404, 'NOT_FOUND', 'お店が見つかりません');
  if (on) {
    try {
      await db.insert(reactions).values({ userId: me.id, shopId }).onConflictDoNothing();
    } catch {
      throw new ApiError(404, 'NOT_FOUND', 'お店が見つかりません');
    }
  } else await db.delete(reactions).where(and(eq(reactions.userId, me.id), eq(reactions.shopId, shopId)));
}

/* ---------- ホーム・募集 ---------- */

async function todayRecruits(meId: string, where?: SQL): Promise<Recruit[]> {
  const t = now();
  const rows = await db
    .select({
      r: recruits,
      shop: { id: shops.id, name: shops.name, genre: shops.genre },
      host: { id: users.id, name: users.name, icon: users.icon },
      count: sql<number>`(1 + (select count(*) from ${participants} p where p.recruit_id = ${recruits.id}))::int`,
      joined: sql<boolean>`exists(select 1 from ${participants} p where p.recruit_id = ${recruits.id} and p.user_id = ${meId})`,
      liked: sql<boolean>`exists(select 1 from ${interests} i where i.shop_id = ${recruits.shopId} and i.user_id = ${meId})`,
    })
    .from(recruits)
    .innerJoin(shops, eq(shops.id, recruits.shopId))
    .innerJoin(users, eq(users.id, recruits.hostId))
    .where(and(eq(recruits.date, jstDate(t)), isNull(recruits.canceledAt), where))
    .orderBy(asc(recruits.departTime), asc(recruits.createdAt));
  return rows.map(({ r, shop, host, count, joined, liked }) => {
    const departTime = r.departTime.slice(0, 5) as DepartTime;
    const isMine = r.hostId === meId;
    return {
      id: r.id, shop: { id: shop.id, name: shop.name, emoji: genreEmoji(shop.genre) }, host: person(host, meId), departTime,
      place: r.place === 'その他' ? r.placeOther ?? 'その他' : r.place, note: r.note, count, joined, isMine,
      closed: isPast(departTime, t), likedByMe: !isMine && liked,
    };
  });
}

export async function getHome(lineUserId: string): Promise<HomeData> {
  const me = await requireMe(lineUserId);
  const all = (await shopSummaries(me.id)).map(strip);
  const list = (await todayRecruits(me.id)).filter((r) => !r.closed); // 締め切った募集はホームに出さない
  return { recommend: pickRecommend(all, `${jstDate(now())}|${me.id}`), recruits: list, shopCount: all.length };
}

export async function createRecruit(lineUserId: string, input: z.infer<typeof recruitInput>): Promise<Recruit> {
  const me = await requireMe(lineUserId);
  const t = now();
  if (isPast(input.departTime, t)) throw new ApiError(400, 'INVALID', 'その出発時間はもう過ぎています');
  const [shop] = await db.select({ id: shops.id }).from(shops).where(eq(shops.id, input.shopId));
  if (!shop) throw new ApiError(404, 'NOT_FOUND', 'お店が見つかりません');
  try {
    const [row] = await db
      .insert(recruits)
      .values({
        shopId: input.shopId, hostId: me.id, date: jstDate(t), departTime: input.departTime, place: input.place,
        placeOther: input.place === 'その他' ? input.placeOther : null, note: input.note ?? '',
      })
      .returning({ id: recruits.id });
    const [r] = await todayRecruits(me.id, eq(recruits.id, row.id));
    return r;
  } catch (e) {
    if (isUniqueViolation(e, 'one_recruit_per_host_per_day')) throw new ApiError(409, 'ALREADY_HOSTING', '今日の募集はすでに作成しています');
    throw e;
  }
}

async function todayRecruitRow(id: string) {
  if (!uuidOk(id)) return null;
  const [r] = await db
    .select()
    .from(recruits)
    .where(and(eq(recruits.id, id), eq(recruits.date, jstDate(now())), isNull(recruits.canceledAt)));
  return r ?? null;
}

export async function cancelRecruit(lineUserId: string, id: string): Promise<void> {
  const me = await requireMe(lineUserId);
  const r = await todayRecruitRow(id);
  if (!r) throw new ApiError(410, 'CLOSED', 'この募集はすでに取り消されています');
  if (r.hostId !== me.id) throw new ApiError(403, 'FORBIDDEN', '募集した人だけが取り消せます');
  await db.update(recruits).set({ canceledAt: new Date() }).where(eq(recruits.id, id));
}

export async function setJoin(lineUserId: string, id: string, on: boolean): Promise<void> {
  const me = await requireMe(lineUserId);
  const r = await todayRecruitRow(id);
  if (!r) throw new ApiError(410, 'CLOSED', 'この募集は取り消されました');
  if (r.hostId === me.id) throw new ApiError(400, 'INVALID', '自分の募集には参加できません');
  if (isPast(r.departTime.slice(0, 5), now())) throw new ApiError(410, 'CLOSED', 'この募集は締め切りました');
  if (on) await db.insert(participants).values({ recruitId: id, userId: me.id }).onConflictDoNothing();
  else await db.delete(participants).where(and(eq(participants.recruitId, id), eq(participants.userId, me.id)));
}

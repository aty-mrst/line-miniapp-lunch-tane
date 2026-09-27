// seed.json を DB に投入する。  npm run db:seed          （空のDBのみ）
//                               npm run db:seed -- --reset （全テーブルを空にしてから投入）
// 募集は「今日（JST、NEXT_PUBLIC_DEV_NOW があればその日）」の日付で入れる。
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import seed from '../lib/seed.json';
import * as s from '../lib/db/schema';
import { nameKey } from '../lib/validation';
import { jstDate } from '../lib/time';

const url = process.env.DATABASE_URL_MIGRATE ?? process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL が未設定です');
const client = postgres(url, { prepare: false, max: 1 });
const db = drizzle(client);

async function main() {
  const reset = process.argv.includes('--reset');
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.users);
  if (n > 0 && !reset) {
    console.log(`users に ${n} 件あるので中止しました。消して入れ直すなら: npm run db:seed -- --reset`);
    return;
  }
  const today = jstDate(process.env.NEXT_PUBLIC_DEV_NOW ? new Date(process.env.NEXT_PUBLIC_DEV_NOW) : new Date());

  await db.transaction(async (tx) => {
    if (reset) await tx.execute(sql`truncate participants, recruits, reactions, interests, shops, users cascade`);

    const userIds = new Map<string, string>();
    for (const u of seed.users) {
      const [row] = await tx.insert(s.users).values({ lineUserId: u.lineUserId, name: u.name, icon: u.icon }).returning({ id: s.users.id });
      userIds.set(u.key, row.id);
    }
    const uid = (k: string) => userIds.get(k)!;

    const shopIds = new Map<string, string>();
    for (const sh of seed.shops) {
      const [row] = await tx
        .insert(s.shops)
        .values({
          name: sh.name, nameKey: nameKey(sh.name), mapUrl: sh.mapUrl, genre: sh.genre as never, walk: sh.walk as never, budget: sh.budget as never,
          note: sh.note, createdBy: uid(sh.createdBy), createdAt: new Date(`${sh.createdAt}T12:00:00+09:00`),
        })
        .returning({ id: s.shops.id });
      shopIds.set(sh.key, row.id);
      for (const k of sh.interests) await tx.insert(s.interests).values({ userId: uid(k), shopId: row.id });
      // リアクションの初期値：気になる人のうち最初の1人以外
      for (const k of sh.interests.slice(1)) await tx.insert(s.reactions).values({ userId: uid(k), shopId: row.id });
    }

    for (const r of seed.recruits) {
      const [row] = await tx
        .insert(s.recruits)
        .values({
          shopId: shopIds.get(r.shop)!, hostId: uid(r.host), date: today, departTime: r.departTime, place: r.place,
          placeOther: (r as { placeOther?: string }).placeOther ?? null,
        })
        .returning({ id: s.recruits.id });
      for (const k of r.participants) await tx.insert(s.participants).values({ recruitId: row.id, userId: uid(k) });
    }
  });
  console.log(`投入しました：ユーザー${seed.users.length}人・お店${seed.shops.length}店・募集${seed.recruits.length}件（日付 ${today}）`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => client.end({ timeout: 1 }).then(() => process.exit()));

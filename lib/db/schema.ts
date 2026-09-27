// DATA_AND_API.md「DBスキーマ」をDrizzleで定義
import { sql } from 'drizzle-orm';
import { check, date, index, pgEnum, pgTable, primaryKey, text, time, timestamp, uuid } from 'drizzle-orm/pg-core';

export const genre = pgEnum('genre', ['ラーメン', 'うどん・そば', '寿司・海鮮', 'カレー', 'タイ料理', '和食', 'イタリアン', 'その他']);
export const walk = pgEnum('walk', ['5分以内', '10分以内', '10分以上']);
export const budget = pgEnum('budget', ['〜1,000円', '〜1,500円', '1,500円〜']);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    lineUserId: text('line_user_id').notNull().unique(),
    name: text('name').notNull(),
    icon: text('icon').notNull(), // 絵文字1つ（アプリで検証）
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('users_name_len', sql`char_length(${t.name}) between 1 and 20`)],
);

export const shops = pgTable(
  'shops',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    nameKey: text('name_key').notNull().unique(), // 空白除去・NFKC・小文字化（重複判定用）
    mapUrl: text('map_url').notNull().unique(),
    genre: genre('genre').notNull(),
    walk: walk('walk').notNull(),
    budget: budget('budget').notNull(),
    note: text('note').notNull().default(''),
    createdBy: uuid('created_by').notNull().references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('shops_name_len', sql`char_length(${t.name}) between 1 and 40`),
    check('shops_note_len', sql`char_length(${t.note}) <= 100`),
  ],
);

/** 「気になる」 */
export const interests = pgTable(
  'interests',
  {
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    shopId: uuid('shop_id').notNull().references(() => shops.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.shopId] })],
);

/** 登録者のひとことへの「気になる！」 */
export const reactions = pgTable(
  'reactions',
  {
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    shopId: uuid('shop_id').notNull().references(() => shops.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.shopId] })],
);

/** 「今日ここ行く」 */
export const recruits = pgTable(
  'recruits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    shopId: uuid('shop_id').notNull().references(() => shops.id, { onDelete: 'cascade' }),
    hostId: uuid('host_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    date: date('date').notNull(), // JSTの日付
    departTime: time('depart_time').notNull(),
    place: text('place').notNull(),
    placeOther: text('place_other'),
    note: text('note').notNull().default(''),
    canceledAt: timestamp('canceled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('recruits_place', sql`${t.place} in ('1階ロビー','8階エレベーター前','現地','その他')`),
    check('recruits_place_other', sql`${t.place} <> 'その他' or ${t.placeOther} is not null`),
    check('recruits_place_other_len', sql`char_length(${t.placeOther}) <= 30`),
    check('recruits_note_len', sql`char_length(${t.note}) <= 60`),
    index('recruits_by_date').on(t.date, t.departTime).where(sql`${t.canceledAt} is null`),
  ],
);

export const participants = pgTable(
  'participants',
  {
    recruitId: uuid('recruit_id').notNull().references(() => recruits.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.recruitId, t.userId] })],
);

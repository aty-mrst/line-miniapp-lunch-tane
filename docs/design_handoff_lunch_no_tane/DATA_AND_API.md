# データ・API・認証

## 技術スタック（推奨）
- Next.js 15（App Router, TypeScript）＋ Tailwind CSS（トークンは `tailwind.config` に登録）
- DB：Supabase（Postgres）または Neon。ORMは Drizzle（Prismaでも可）
- ホスティング：Vercel（GitHub連携、PRごとにPreview）
- LINE：LIFF SDK（`@line/liff`）。LINE Developersで「LINEログイン」チャネル（またはLINEミニアプリチャネル）を作り、LIFFアプリを登録
- 検証：zod

## 環境変数
```
NEXT_PUBLIC_LIFF_ID=          # LIFFアプリID
LINE_CHANNEL_ID=              # IDトークン検証用
DATABASE_URL=                 # Postgres接続文字列
INVITE_CODE=                  # 社員限定のための招待コード（方式は下記）
NEXT_PUBLIC_USE_MOCK=true     # true: LIFFとDBをモックで動かす（ローカル開発）
APP_TZ=Asia/Tokyo
```

## 認証の流れ
1. クライアント：`liff.init({ liffId })` → 未ログインなら `liff.login()` → `liff.getIDToken()`。
2. 全APIリクエストに `Authorization: Bearer <idToken>` を付ける。
3. サーバー：`POST https://api.line.me/oauth2/v2.1/verify`（`id_token`, `client_id=LINE_CHANNEL_ID`）で検証し、`sub` を LINEユーザーIDとして使う。**クライアントから送られたユーザーIDは信用しない**。
4. 検証結果はリクエスト単位でキャッシュしてよい。セッションCookieに切り替える場合は、検証後に署名付きCookieを発行する。
5. モックモード（`NEXT_PUBLIC_USE_MOCK=true`）では、固定のユーザー（`U_dev_tanaka`）としてふるまう。`?as=U_xxx` で切り替えられると便利。

## 社員限定のアクセス制御（どれか1つを選ぶ）
- A. **招待コード**：登録画面に「招待コード」を1項目追加（社内ポータルで共有）。最小コストでおすすめ。
- B. **許可リスト**：`allowed_users` テーブルに管理者がLINEユーザーIDを登録。
- C. LIFF URLを社内だけで共有（簡易。漏れると入れてしまう）。
→ デザインは現状C想定。Aにする場合は、名前の下に同じ入力欄スタイルで「招待コード（必須）」を追加する。

## DBスキーマ（Postgres）
```sql
create table users (
  id           uuid primary key default gen_random_uuid(),
  line_user_id text not null unique,
  name         text not null check (char_length(name) between 1 and 20),
  icon         text not null,                      -- 絵文字1つ（アプリで検証）
  created_at   timestamptz not null default now()
);

create type genre as enum ('ラーメン','うどん・そば','寿司・海鮮','カレー','タイ料理','和食','イタリアン','その他');
create type walk as enum ('5分以内','10分以内','10分以上');
create type budget as enum ('〜1,000円','〜1,500円','1,500円〜');

create table shops (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 1 and 40),
  name_key     text not null unique,               -- 空白除去・NFKC正規化・小文字化した店名（重複判定用）
  map_url      text not null unique,
  genre        genre not null,
  walk         walk not null,
  budget       budget not null,
  note         text check (char_length(note) <= 100),
  created_by   uuid not null references users(id),
  created_at   timestamptz not null default now()
);

create table interests (                           -- 「気になる」
  user_id uuid references users(id) on delete cascade,
  shop_id uuid references shops(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, shop_id)
);

create table reactions (                           -- 登録者のひとことへの「気になる！」
  user_id uuid references users(id) on delete cascade,
  shop_id uuid references shops(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, shop_id)
);

create table recruits (                            -- 「今日ここ行く」
  id           uuid primary key default gen_random_uuid(),
  shop_id      uuid not null references shops(id) on delete cascade,
  host_id      uuid not null references users(id) on delete cascade,
  date         date not null,                      -- JSTの日付
  depart_time  time not null,                      -- 12:00〜13:15（15分刻み）
  place        text not null check (place in ('1階ロビー','8階エレベーター前','現地','その他')),
  place_other  text check (char_length(place_other) <= 30),
  note         text check (char_length(note) <= 60),
  canceled_at  timestamptz,
  created_at   timestamptz not null default now(),
  check (place <> 'その他' or place_other is not null)
);
create unique index one_recruit_per_host_per_day on recruits(host_id, date) where canceled_at is null;
create index recruits_by_date on recruits(date, depart_time) where canceled_at is null;

create table participants (
  recruit_id uuid references recruits(id) on delete cascade,
  user_id    uuid references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (recruit_id, user_id)
);
```
- 「◯人参加中」＝ 主催者1 ＋ participants数。
- 店を削除すると、`on delete cascade` で気になる・リアクション・募集・参加が消える（ダイアログの文言どおり）。
- 募集の取り消しは `canceled_at` を入れる論理削除（参加者側では消えたものとして扱う）。

## API（Route Handlers）
すべて認証必須。レスポンスはJSON。エラーは `{ error: { code, message } }`。

| Method | Path | 内容 |
|---|---|---|
| GET | `/api/me` | 自分。未登録なら `404 { code: 'NOT_REGISTERED' }` |
| POST | `/api/me` | 登録 `{ name, icon, inviteCode? }` |
| GET | `/api/home` | `{ recommend: Shop[3], recruits: Recruit[], shopCount }`。今日の締め切り前の募集を出発時間順、同時刻は作成順 |
| GET | `/api/shops?walk=&budget=&genre=` | 一覧（各パラメータはカンマ区切りで複数指定） |
| POST | `/api/shops` | 登録。重複なら `409 { code:'DUPLICATE', shop:{id,name,emoji,createdByName} }` |
| GET | `/api/shops/:id` | 詳細＋登録者＋気になる人一覧＋リアクション数＋自分の状態＋今日の募集 |
| PATCH / DELETE | `/api/shops/:id` | 編集・削除（登録者本人のみ。他人なら403） |
| PUT / DELETE | `/api/shops/:id/interest` | 気になるON/OFF（何度呼んでも結果が同じになるようにする） |
| PUT / DELETE | `/api/shops/:id/reaction` | 「気になる！」ON/OFF |
| POST | `/api/recruits` | 作成 `{ shopId, departTime, place, placeOther?, note? }` |
| DELETE | `/api/recruits/:id` | 取り消し（主催者のみ） |
| PUT / DELETE | `/api/recruits/:id/join` | 参加／参加取り消し（主催者本人は不可、締め切り後は `410 CLOSED`） |

`Recruit` のレスポンス型（画面の募集カードにそのまま対応させる）：
```ts
type Recruit = {
  id: string; shop: { id: string; name: string; emoji: string };
  host: { name: string; icon: string; isMe: boolean };
  departTime: '12:15'; place: string;   // 'その他' の場合は place_other の値
  count: number; joined: boolean; isMine: boolean;
  closed: boolean; likedByMe: boolean;  // likedByMe → 気になる店のハイライト
};
```

## バリデーション（クライアント・サーバーの両方で行う）
- **アイコン**：`[...new Intl.Segmenter('ja',{granularity:'grapheme'}).segment(v)].length === 1 && /\p{Extended_Pictographic}/u.test(v)`
- **名前**：前後の空白を除いて1〜20文字
- **Googleマップのリンク**：`/^https:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|(www\.)?google\.(com|co\.jp)\/maps|maps\.google\.(com|co\.jp))\//`
- **重複判定**：`map_url` 完全一致 または `name_key` 一致。入力中にも `GET /api/shops/check?url=&name=` で判定し、「登録済みの店」表示を出す（300msデバウンス）。短縮URLは同じ店でも毎回違うことがあるので、店名でも判定する
- **出発時間**：`TIMES` に含まれ、かつJSTの現在時刻より後
- **集合場所**：4択。「その他」のときだけ `place_other` は必須（1〜30文字）

## 時刻のルール（重要）
- 「今日」と締め切りは **必ずサーバー側でJST（Asia/Tokyo）基準で計算** する。Vercelのサーバーは UTC で動いている。
- 締め切り ＝ `date + depart_time <= now(JST)`。
- 選べる出発時間：`['12:00','12:15','12:30','12:45','13:00','13:15']` のうち、現在時刻より後のもの。全部過ぎていたら、「今日の募集は締め切りました」と表示して作成ボタンを無効にする（デザインにない追加状態。見た目は押せないボタン＋理由テキスト）。

## おすすめ3店（初期仕様）
`hash(date + userId)` をシードにして全店から3店を選ぶ。そのうち1店は、自分が気になっている店から選ぶ（あれば）。店が3店未満ならある分だけ表示する。

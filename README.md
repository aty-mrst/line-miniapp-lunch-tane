# ランチのたね（LINEミニアプリ / LIFF）

Claude Design「ランチのたね UI」のハンドオフ（`docs/design_handoff_lunch_no_tane/`）を Next.js 15 で実装したもの。

## 起動

```bash
npm install
npm run dev   # http://localhost:3100
```

- `http://localhost:3100/` … アプリ本体
  - DB接続時（`NEXT_PUBLIC_USE_MOCK=false` + `NEXT_PUBLIC_DEV_AUTH=true`）：`?as=U_dev_sato` でユーザー切替（タブごとに記憶）。未登録IDなら登録画面から
  - モック時（`NEXT_PUBLIC_USE_MOCK=true`）：田中さんとして起動。`?fresh` で未登録状態から
- `http://localhost:3100/dev/states` … デザインボード ⓪-1〜⑤-3 を実装で並べたページ（本番では無効）

開発時の「現在時刻」は `.env.local` の `NEXT_PUBLIC_DEV_NOW`（seed に合わせて 2026-09-28 12:05 JST）。本番では常に実時刻。

## データベース（Supabase）

`.env.example` を参考に `.env.local` に `DATABASE_URL`（Transaction pooler :6543）と `DATABASE_URL_MIGRATE`（Session pooler :5432）を書く。

```bash
npm run db:migrate          # drizzle/ のマイグレーションを適用（テーブル作成＋RLS有効化）
npm run db:seed             # seed.json を投入（空のDBのみ）
npm run db:seed -- --reset  # 全データを消して入れ直す
npm run db:generate         # lib/db/schema.ts を変えたらマイグレーションを生成
npm run db:studio           # Drizzle Studio でデータを見る
```

全テーブルで RLS を有効化（ポリシーなし＝全拒否）しているので、Supabase の anon キー経由では読み書きできない。アプリはサーバーの `DATABASE_URL` からのみアクセスする。

## 構成

| パス | 内容 |
|---|---|
| `lib/api/types.ts` | API の型と `Api` インターフェース |
| `lib/api/mock.ts` | seed.json から作るメモリ上のモック（`NEXT_PUBLIC_USE_MOCK=true`） |
| `lib/api/http.ts` | 本番 API クライアント |
| `lib/db/schema.ts` | Drizzle スキーマ（DATA_AND_API.md のDB定義） |
| `lib/server/*` | 認証（LINE IDトークン検証）・データ処理・Route Handler 共通処理 |
| `app/api/**` | API（DATA_AND_API.md の一覧どおり） |
| `scripts/seed.ts` | seed 投入 |
| `lib/validation.ts` / `lib/time.ts` | 絵文字・URL・重複判定、JST の時刻計算 |
| `components/ui.tsx` | 共通部品（ボタン・タイル・チップ・タグ・トースト・ダイアログ・画面骨組み） |
| `components/RecruitCard.tsx` | 募集カード（5状態） |
| `components/AppRoutes.tsx` | 起動判定と path → 画面の対応 |
| `components/screens/*` | 各画面 |

画面は `useNav()` で遷移する（本番は history API、`/dev/states` はメモリ上）。サーバー往復なしで画面が切り替わる。

## 進捗（IMPLEMENTATION_PLAN.md）

- [x] Phase 1 土台（トークン・共通部品・モック）
- [x] Phase 2 全画面（モックで通し操作可、`/dev/states` で全状態）
- [ ] Phase 3 LINE 実機（LIFF ID 設定、visualViewport 対応）
- [x] Phase 4 DB・Route Handlers（Drizzle + Supabase、IDトークン検証）※実機LINEでの確認は Phase 3 の後
- [ ] Phase 5 テスト・仕上げ

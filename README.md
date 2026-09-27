# ランチのたね（LINEミニアプリ / LIFF）

Claude Design「ランチのたね UI」のハンドオフ（`docs/design_handoff_lunch_no_tane/`）を Next.js 15 で実装したもの。

## 起動

```bash
npm install
npm run dev   # http://localhost:3100
```

- `http://localhost:3100/` … アプリ本体（モック。田中さんとして登録済みで起動）
- `http://localhost:3100/?fresh` … 未登録状態から（起動 → 登録 → ホーム）
- `http://localhost:3100/dev/states` … デザインボード ⓪-1〜⑤-3 を実装で並べたページ（本番では無効）

モックの現在時刻は `.env.local` の `NEXT_PUBLIC_MOCK_NOW`（seed に合わせて 2026-09-28 12:05 JST）。

## 構成

| パス | 内容 |
|---|---|
| `lib/api/types.ts` | API の型と `Api` インターフェース |
| `lib/api/mock.ts` | seed.json から作るメモリ上のモック（`NEXT_PUBLIC_USE_MOCK=true`） |
| `lib/api/http.ts` | 本番 API クライアント（Route Handlers は Phase 4 で実装） |
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
- [ ] Phase 4 DB・Route Handlers（Drizzle + Supabase、IDトークン検証）
- [ ] Phase 5 テスト・仕上げ

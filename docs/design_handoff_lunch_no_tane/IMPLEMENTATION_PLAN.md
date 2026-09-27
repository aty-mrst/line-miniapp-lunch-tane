# 実装計画（Claude Code向け）

Claude Codeには最初にこう伝える：
> `design_handoff_lunch_no_tane/` の README.md・DATA_AND_API.md・IMPLEMENTATION_PLAN.md を読み、Phase 1から順に実装して。各Phaseの完了条件を満たしたら止まって報告して。見た目は `design/` のHTMLを正とする。

## 原則
- 画面は `lib/api/` のクライアント関数だけを通してデータを扱う。`NEXT_PUBLIC_USE_MOCK=true` のときはメモリ上のモック（`seed.json` から作る）、falseのときは本物のAPIを呼ぶ。**画面のコードはどちらでも同じ**にする。
- 状態ごとに見た目を確認できるように、開発用ページ `/dev/states` を作り、ボードの番号（⓪-2 など）で各状態を並べる（本番では無効化する）。
- コミットは小さく分ける。各Phaseの終わりにVercelのPreviewで確認する。

## Phase 0：準備（ユーザーが行う）
- [ ] GitHubにリポジトリを作り、Vercelと連携する
- [ ] LINE Developersでプロバイダーとチャネルを作り、LIFFアプリを登録する（サイズ：Full、エンドポイント：VercelのURL、scope：`openid profile`）
- [ ] Supabase（またはNeon）でプロジェクトを作り、`DATABASE_URL` を取得する
- [ ] Vercelに環境変数を設定する

## Phase 1：土台
- Next.js＋TS＋Tailwindを用意し、README記載のトークンを `tailwind.config.ts` に登録、Google Fontsを読み込む
- 共通部品：PrimaryButton / SecondaryButton / SubActionButton / SelectTile / FilterChip / Tag / Avatar / Toast（Context＋2.8秒） / ConfirmDialog / ScreenHeader / BottomBar（safe-area対応）
- `lib/api/`：型定義（DATA_AND_API.mdの型）とモック実装
- **完了条件**：`/dev/components` で全部品の全状態が表示される

## Phase 2：画面（モックで動かす）
順番：ホーム → 店舗ページ → 募集の作成 → みんなの店 → お店を登録 → ユーザー登録
- 各画面で、READMEに書かれた **すべての状態** を再現する（空・ローディング・エラーも含む）
- 起動時の判定：`/api/me` の結果で `/register` またはホームへ
- **完了条件**：ボードの ⓪-1〜⑤-3 すべてが `/dev/states` で再現でき、`design/LunchApp.dc.html variant="live"` と同じ一連の流れがモックで通しで動く

## Phase 3：LINE上で動かす
- `liff.init` と IDトークンの取得、モック時の迂回
- 「マップで開く」＝`liff.openWindow({ external: true })`、「貼り付け」＝`navigator.clipboard.readText()`（失敗したら入力欄にフォーカスして長押しの貼り付けを促す）
- 実機で確認：iOS / Android のLINEで、キーボード表示時に下部バーが隠れないか（`visualViewport` を見て対応）、LINEヘッダーとの重なり、戻る操作
- **完了条件**：VercelのPreview URLをLINEで開き、モックデータのまま全画面を操作できる

## Phase 4：DBとつなぐ
- Drizzleでスキーマとマイグレーションを作り、`seed.json` を投入するスクリプトを用意する
- Route Handlersを実装し、IDトークンをサーバーで検証、権限（編集・削除・取り消しは本人のみ）を確認する
- `lib/api/` の本番実装に差し替える
- 楽観的更新：気になる・参加・リアクションは画面を先に切り替え、失敗したら元に戻してエラートーストを出す
- **完了条件**：2つのLINEアカウントで「Aが募集 → Bのホームにハイライト付きで出る → Bが参加 → Aの人数が増える」が確認できる

## Phase 5：仕上げ
- JSTでの日付の区切りと締め切りの境界テスト（11:59 / 12:00 / 13:15以降）
- 絵文字の判定テスト（🐣 ✓、👨‍👩‍👧 ✓（1書記素）、🐣🍙 ✗、a ✗、🇯🇵 ✓）
- エラー処理：通信失敗時は入力内容を保持してトーストを出す、409・410をそれぞれの文言で出す
- アクセシビリティ：ボタンに `aria-label`（絵文字だけのボタン）、`aria-pressed`（気になる・参加中・チップ）、コントラスト確認
- 本番用のLIFFを作成し、社内へ共有する（アクセス制御方式はDATA_AND_API.mdを参照）

## テスト方針
- ユニット：バリデーション関数、締め切りの判定、おすすめの選び方
- E2E（Playwright、モックモード）：登録 → 気になる → 募集 → 参加 → 取り消し、お店の登録（重複・形式エラー含む）、絞り込み

## 決めておくこと（ユーザーに確認）
1. 社員限定の方式（招待コード／許可リスト／URL共有）
2. 出発時間の選択肢と、募集できる時間帯（例：11:00〜13:00のみ）
3. 1人1日1募集の制限を入れるか
4. 名前・店名・ひとことの最大文字数
5. 公開形式：LIFFアプリのまま使うか、LINEミニアプリとして申請するか

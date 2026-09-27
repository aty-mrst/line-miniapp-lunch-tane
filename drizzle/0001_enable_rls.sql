-- Supabase の Data API（anon / authenticated キー）から直接読み書きできないよう RLS を有効化。
-- ポリシーは作らない＝全拒否。アプリはサーバーの DATABASE_URL（postgres ロール、RLS をバイパス）経由でのみアクセスする。
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "shops" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "interests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "reactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "recruits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "participants" ENABLE ROW LEVEL SECURITY;

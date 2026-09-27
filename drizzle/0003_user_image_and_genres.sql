ALTER TYPE "public"."genre" ADD VALUE '定食' BEFORE 'イタリアン';--> statement-breakpoint
ALTER TYPE "public"."genre" ADD VALUE 'カフェ' BEFORE 'その他';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "image" text;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_image_len" CHECK (char_length("users"."image") <= 100000);
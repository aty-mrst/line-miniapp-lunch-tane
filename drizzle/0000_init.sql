CREATE TYPE "public"."budget" AS ENUM('〜1,000円', '〜1,500円', '1,500円〜');--> statement-breakpoint
CREATE TYPE "public"."genre" AS ENUM('ラーメン', 'うどん・そば', '寿司・海鮮', 'カレー', 'タイ料理', '和食', 'イタリアン', 'その他');--> statement-breakpoint
CREATE TYPE "public"."walk" AS ENUM('5分以内', '10分以内', '10分以上');--> statement-breakpoint
CREATE TABLE "interests" (
	"user_id" uuid NOT NULL,
	"shop_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "interests_user_id_shop_id_pk" PRIMARY KEY("user_id","shop_id")
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"recruit_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "participants_recruit_id_user_id_pk" PRIMARY KEY("recruit_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "reactions" (
	"user_id" uuid NOT NULL,
	"shop_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reactions_user_id_shop_id_pk" PRIMARY KEY("user_id","shop_id")
);
--> statement-breakpoint
CREATE TABLE "recruits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"host_id" uuid NOT NULL,
	"date" date NOT NULL,
	"depart_time" time NOT NULL,
	"place" text NOT NULL,
	"place_other" text,
	"note" text DEFAULT '' NOT NULL,
	"canceled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recruits_place" CHECK ("recruits"."place" in ('1階ロビー','8階エレベーター前','現地','その他')),
	CONSTRAINT "recruits_place_other" CHECK ("recruits"."place" <> 'その他' or "recruits"."place_other" is not null),
	CONSTRAINT "recruits_place_other_len" CHECK (char_length("recruits"."place_other") <= 30),
	CONSTRAINT "recruits_note_len" CHECK (char_length("recruits"."note") <= 60)
);
--> statement-breakpoint
CREATE TABLE "shops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"name_key" text NOT NULL,
	"map_url" text NOT NULL,
	"genre" "genre" NOT NULL,
	"walk" "walk" NOT NULL,
	"budget" "budget" NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shops_name_key_unique" UNIQUE("name_key"),
	CONSTRAINT "shops_map_url_unique" UNIQUE("map_url"),
	CONSTRAINT "shops_name_len" CHECK (char_length("shops"."name") between 1 and 40),
	CONSTRAINT "shops_note_len" CHECK (char_length("shops"."note") <= 100)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"line_user_id" text NOT NULL,
	"name" text NOT NULL,
	"icon" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_line_user_id_unique" UNIQUE("line_user_id"),
	CONSTRAINT "users_name_len" CHECK (char_length("users"."name") between 1 and 20)
);
--> statement-breakpoint
ALTER TABLE "interests" ADD CONSTRAINT "interests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interests" ADD CONSTRAINT "interests_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_recruit_id_recruits_id_fk" FOREIGN KEY ("recruit_id") REFERENCES "public"."recruits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recruits" ADD CONSTRAINT "recruits_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recruits" ADD CONSTRAINT "recruits_host_id_users_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shops" ADD CONSTRAINT "shops_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "one_recruit_per_host_per_day" ON "recruits" USING btree ("host_id","date") WHERE "recruits"."canceled_at" is null;--> statement-breakpoint
CREATE INDEX "recruits_by_date" ON "recruits" USING btree ("date","depart_time") WHERE "recruits"."canceled_at" is null;
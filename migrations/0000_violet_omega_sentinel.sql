CREATE TYPE "public"."app_status" AS ENUM('active', 'warning', 'error');--> statement-breakpoint
CREATE TYPE "public"."platform" AS ENUM('app_store', 'google_play');--> statement-breakpoint
CREATE TYPE "public"."response_style" AS ENUM('friendly', 'professional', 'casual', 'formal');--> statement-breakpoint
CREATE TYPE "public"."review_response_status" AS ENUM('draft', 'approved', 'published');--> statement-breakpoint
CREATE TABLE "ai_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"api_key" text,
	"response_style" "response_style" DEFAULT 'professional' NOT NULL,
	"max_response_length" integer DEFAULT 250 NOT NULL,
	"include_signature" boolean DEFAULT false NOT NULL,
	"signature" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"app_id" integer,
	"date" timestamp DEFAULT now() NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"avg_rating" integer DEFAULT 0 NOT NULL,
	"response_count" integer DEFAULT 0 NOT NULL,
	"response_rate" integer DEFAULT 0 NOT NULL,
	"ai_accuracy" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "apps" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"platform" "platform" NOT NULL,
	"bundle_id" text,
	"api_key" text NOT NULL,
	"api_secret" text,
	"status" "app_status" DEFAULT 'active' NOT NULL,
	"auto_respond" boolean DEFAULT true NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"last_synced" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"review_id" integer NOT NULL,
	"text" text NOT NULL,
	"status" "review_response_status" DEFAULT 'draft' NOT NULL,
	"is_generated" boolean DEFAULT true NOT NULL,
	"external_response_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"published_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"app_id" integer NOT NULL,
	"platform" "platform" NOT NULL,
	"external_id" text NOT NULL,
	"author_name" text NOT NULL,
	"author_id" text,
	"rating" integer NOT NULL,
	"title" text,
	"text" text NOT NULL,
	"language" text,
	"version" text,
	"response_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_app_id_external_id_unique" UNIQUE("app_id","external_id")
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"email_notifications" boolean DEFAULT true NOT NULL,
	"review_alerts" boolean DEFAULT true NOT NULL,
	"response_alerts" boolean DEFAULT true NOT NULL,
	"daily_digest" boolean DEFAULT true NOT NULL,
	"marketing_emails" boolean DEFAULT false NOT NULL,
	"default_language" text DEFAULT 'en' NOT NULL,
	"auto_detect_language" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"avatar" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "ai_settings" ADD CONSTRAINT "ai_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_data" ADD CONSTRAINT "analytics_data_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_data" ADD CONSTRAINT "analytics_data_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apps" ADD CONSTRAINT "apps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_responses" ADD CONSTRAINT "review_responses_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
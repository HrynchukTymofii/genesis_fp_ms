DROP INDEX "reports_member_date";--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "meeting_id" integer;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "links" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "reports_member_meeting" ON "reports" USING btree ("member_id","meeting_id");
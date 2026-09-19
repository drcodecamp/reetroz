CREATE TABLE "comment" (
	"id" text PRIMARY KEY NOT NULL,
	"issueSlug" text NOT NULL,
	"userId" text NOT NULL,
	"body" text NOT NULL,
	"createdAt" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comment" ADD CONSTRAINT "comment_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "comment_issueSlug_idx" ON "comment" USING btree ("issueSlug");

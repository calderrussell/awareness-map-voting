CREATE TABLE `ballots` (
	`voter_id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `votes` (
	`voter_id` text NOT NULL,
	`person` text NOT NULL,
	`x` integer NOT NULL,
	`y` integer NOT NULL,
	PRIMARY KEY(`voter_id`, `person`),
	FOREIGN KEY (`voter_id`) REFERENCES `ballots`(`voter_id`) ON UPDATE no action ON DELETE no action
);

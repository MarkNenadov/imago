CREATE TABLE `wishlist_items` (
	`id` text PRIMARY KEY NOT NULL,
	`player_name` text NOT NULL,
	`year` integer,
	`brand` text,
	`set_name` text,
	`card_number` text,
	`variant` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);

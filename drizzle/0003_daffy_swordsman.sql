CREATE TABLE `image_hashes` (
	`hash` text PRIMARY KEY NOT NULL,
	`image_path` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);

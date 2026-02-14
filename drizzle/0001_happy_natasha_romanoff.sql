CREATE TABLE `reference_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`player_name` text NOT NULL,
	`year` integer,
	`brand` text,
	`set_name` text,
	`card_number` text,
	`sport` text NOT NULL,
	`subset` text,
	`attributes` text
);

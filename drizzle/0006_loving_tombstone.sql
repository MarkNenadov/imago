ALTER TABLE `cards` ADD `players` text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
UPDATE `cards` SET `players` =
  CASE
    WHEN `team` IS NOT NULL AND `team` != ''
      THEN json_array(json_object('name', `player_name`, 'team', `team`))
    ELSE
      json_array(json_object('name', `player_name`))
  END;

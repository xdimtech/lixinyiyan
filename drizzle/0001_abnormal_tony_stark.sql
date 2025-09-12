ALTER TABLE `meta_ocr_output` MODIFY COLUMN `task_id` bigint NOT NULL;--> statement-breakpoint
ALTER TABLE `meta_ocr_output` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `meta_ocr_output` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `meta_parse_task` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `meta_parse_task` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `meta_translate_output` MODIFY COLUMN `task_id` bigint NOT NULL;--> statement-breakpoint
ALTER TABLE `meta_translate_output` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `meta_translate_output` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `meta_ocr_output` ADD `is_deleted` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `meta_parse_task` ADD `is_deleted` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `meta_translate_output` ADD `is_deleted` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `created_at` datetime DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `is_deleted` tinyint DEFAULT 0 NOT NULL;
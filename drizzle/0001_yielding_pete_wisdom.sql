CREATE TABLE `meta_process_output` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`task_id` bigint NOT NULL,
	`page_no` int NOT NULL,
	`input_file_path` varchar(500) NOT NULL,
	`ocr_txt_path` varchar(500),
	`translate_txt_path` varchar(500),
	`ocr_status` int NOT NULL DEFAULT 0,
	`translate_status` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`is_deleted` tinyint NOT NULL DEFAULT 0,
	CONSTRAINT `meta_process_output_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `meta_ocr_output` ADD `page_no` int NOT NULL;--> statement-breakpoint
ALTER TABLE `meta_parse_task` ADD `cur_page` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `meta_translate_output` ADD `page_no` int NOT NULL;--> statement-breakpoint
ALTER TABLE `meta_process_output` ADD CONSTRAINT `meta_process_output_task_id_meta_parse_task_id_fk` FOREIGN KEY (`task_id`) REFERENCES `meta_parse_task`(`id`) ON DELETE no action ON UPDATE no action;
CREATE TABLE `meta_ocr_output` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`task_id` bigint NOT NULL,
	`input_file_path` varchar(500) NOT NULL,
	`output_txt_path` varchar(500),
	`status` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`is_deleted` tinyint NOT NULL DEFAULT 0,
	CONSTRAINT `meta_ocr_output_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meta_parse_task` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`parse_type` varchar(20) NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`file_path` varchar(500) NOT NULL,
	`page_num` int NOT NULL,
	`status` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`is_deleted` tinyint NOT NULL DEFAULT 0,
	CONSTRAINT `meta_parse_task_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meta_prompt` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`prompt1` text NOT NULL,
	`prompt2` text NOT NULL,
	`operator` varchar(255) NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `meta_prompt_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meta_translate_output` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`task_id` bigint NOT NULL,
	`input_file_path` varchar(500) NOT NULL,
	`output_txt_path` varchar(500),
	`status` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`is_deleted` tinyint NOT NULL DEFAULT 0,
	CONSTRAINT `meta_translate_output_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` varchar(255) NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`expires_at` datetime NOT NULL,
	CONSTRAINT `session_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` varchar(255) NOT NULL,
	`username` varchar(32) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`role` varchar(20) NOT NULL DEFAULT 'member',
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`is_deleted` tinyint NOT NULL DEFAULT 0,
	CONSTRAINT `user_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
ALTER TABLE `meta_ocr_output` ADD CONSTRAINT `meta_ocr_output_task_id_meta_parse_task_id_fk` FOREIGN KEY (`task_id`) REFERENCES `meta_parse_task`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meta_parse_task` ADD CONSTRAINT `meta_parse_task_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meta_prompt` ADD CONSTRAINT `meta_prompt_operator_user_id_fk` FOREIGN KEY (`operator`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meta_translate_output` ADD CONSTRAINT `meta_translate_output_task_id_meta_parse_task_id_fk` FOREIGN KEY (`task_id`) REFERENCES `meta_parse_task`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session` ADD CONSTRAINT `session_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;
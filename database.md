

CREATE TABLE `meta_translate_output` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`task_id` bigint NOT NULL,
	`page_no` int NOT NULL,
	`input_file_path` varchar(500) NOT NULL,
	`output_txt_path` varchar(500),
	`status` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`is_deleted` tinyint NOT NULL DEFAULT 0,
	UNIQUE KEY `idx_task_id_page_no` (`task_id`, `page_no`),
	CONSTRAINT `meta_translate_output_id` PRIMARY KEY(`id`)
);

CREATE TABLE `meta_ocr_output` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`task_id` bigint NOT NULL,
	`page_no` int NOT NULL,
	`input_file_path` varchar(500) NOT NULL,
	`output_txt_path` varchar(500),
	`status` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`is_deleted` tinyint NOT NULL DEFAULT 0,
	UNIQUE KEY `idx_task_id_page_no` (`task_id`, `page_no`),
	CONSTRAINT `meta_ocr_output_id` PRIMARY KEY(`id`)
);

CREATE TABLE `meta_parse_task` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`parse_type` varchar(20) NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`file_path` varchar(500) NOT NULL,
	`page_num` int NOT NULL,
    `cur_page` int NOT NULL DEFAULT '0',
	`status` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`is_deleted` tinyint NOT NULL DEFAULT 0,
	CONSTRAINT `meta_parse_task_id` PRIMARY KEY(`id`)
);

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
	UNIQUE KEY `idx_task_id_page_no` (`task_id`, `page_no`)
);

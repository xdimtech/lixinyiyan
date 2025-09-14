

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


你的任务

1）新增一个表 meta_process_output 用于合并原先的meta_ocr_output和meta_translate_output这两个表，
同时给meta_parse_task增加一个字段 cur_page 表示当前处理到哪一页，可用于任务列表展示进度 cur_page/ page_num 

2）基于新表修改task process的相关逻辑， 优化当前任务处理的性能，现有处理逻辑是PDF转图片后，for循环顺序处理每个图片，然后再逐个调用模型接口处理，先调用OCR再调用翻译，这样有个问题就是在处理翻译的时候，OCR的模型服务是空闲的，为了提供模型服务的吞吐量，希望把OCR和翻译这2步骤改成流水线工作： 一个图片过完OCR就进入翻译，同时下个图片就可以进入OCR了。

明确你要采用的技术实现，如何实现流水线工作

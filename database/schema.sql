-- ShareCreators V1.1 schema. Existing databases: npm run migrate.
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(80) NOT NULL,
  `email` varchar(190) NOT NULL,
  `password_hash` varchar(100) NOT NULL,
  `role` enum('admin','lead','artist','vendor') NOT NULL DEFAULT 'artist',
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `bio` varchar(500) DEFAULT '',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `sessions` (
  `token_hash` char(64) NOT NULL,
  `user_id` int(11) NOT NULL,
  `expires_at` datetime NOT NULL,
  PRIMARY KEY (`token_hash`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `projects` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `description` text,
  `color` varchar(20) DEFAULT '#41755e',
  `owner_id` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `archived` tinyint(1) NOT NULL DEFAULT '0',
  `revision` int(11) NOT NULL DEFAULT '1',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `owner_id` (`owner_id`),
  CONSTRAINT `projects_ibfk_1` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `project_members` (
  `project_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  PRIMARY KEY (`project_id`,`user_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `project_members_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`),
  CONSTRAINT `project_members_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `tasks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `project_id` int(11) NOT NULL,
  `title` varchar(150) NOT NULL,
  `requirements` text NOT NULL,
  `category` varchar(30) NOT NULL DEFAULT '场景',
  `formats` varchar(100) NOT NULL DEFAULT 'OBJ,FBX,GLB',
  `require_texture` tinyint(1) DEFAULT '1',
  `assignee_id` int(11) NOT NULL,
  `creator_id` int(11) NOT NULL,
  `due_date` date NOT NULL,
  `status` enum('assigned','in_review','changes_requested','approved') NOT NULL DEFAULT 'assigned',
  `priority` enum('normal','high') DEFAULT 'normal',
  `license` enum('all_projects','source_only') DEFAULT 'all_projects',
  `license_note` varchar(500) DEFAULT '仅限公司内部项目，不得对外分发或转售',
  `tags` text,
  `preview` varchar(255) DEFAULT NULL,
  `approved_version_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `archived` tinyint(1) NOT NULL DEFAULT '0',
  `revision` int(11) NOT NULL DEFAULT '1',
  `library_visible` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `project_id` (`project_id`),
  KEY `assignee_id` (`assignee_id`),
  KEY `creator_id` (`creator_id`),
  CONSTRAINT `tasks_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`),
  CONSTRAINT `tasks_ibfk_2` FOREIGN KEY (`assignee_id`) REFERENCES `users` (`id`),
  CONSTRAINT `tasks_ibfk_3` FOREIGN KEY (`creator_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `versions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `task_id` int(11) NOT NULL,
  `number` int(11) NOT NULL,
  `notes` text NOT NULL,
  `author_id` int(11) NOT NULL,
  `status` enum('in_review','changes_requested','approved') DEFAULT 'in_review',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `version_number` (`task_id`,`number`),
  KEY `author_id` (`author_id`),
  CONSTRAINT `versions_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`),
  CONSTRAINT `versions_ibfk_2` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `files` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `task_id` int(11) NOT NULL,
  `version_id` int(11) DEFAULT NULL,
  `uploader_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `path` varchar(255) NOT NULL,
  `mime` varchar(100) DEFAULT NULL,
  `size` int(11) NOT NULL,
  `kind` enum('model','texture','preview','reference') NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `task_id` (`task_id`),
  KEY `version_id` (`version_id`),
  KEY `uploader_id` (`uploader_id`),
  CONSTRAINT `files_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`),
  CONSTRAINT `files_ibfk_2` FOREIGN KEY (`version_id`) REFERENCES `versions` (`id`),
  CONSTRAINT `files_ibfk_3` FOREIGN KEY (`uploader_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `comments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `version_id` int(11) NOT NULL,
  `author_id` int(11) NOT NULL,
  `body` text NOT NULL,
  `x` float DEFAULT NULL,
  `y` float DEFAULT NULL,
  `view_angle` int(11) DEFAULT '0',
  `zoom` float DEFAULT '1',
  `resolved` tinyint(1) DEFAULT '0',
  `parent_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `anchor` json DEFAULT NULL,
  `edited_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `version_id` (`version_id`),
  KEY `author_id` (`author_id`),
  KEY `parent_id` (`parent_id`),
  CONSTRAINT `comments_ibfk_1` FOREIGN KEY (`version_id`) REFERENCES `versions` (`id`),
  CONSTRAINT `comments_ibfk_2` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`),
  CONSTRAINT `comments_ibfk_3` FOREIGN KEY (`parent_id`) REFERENCES `comments` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `reuses` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `task_id` int(11) NOT NULL,
  `project_id` int(11) NOT NULL,
  `version_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `reuse_target` (`task_id`,`project_id`),
  KEY `project_id` (`project_id`),
  KEY `version_id` (`version_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `reuses_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`),
  CONSTRAINT `reuses_ibfk_2` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`),
  CONSTRAINT `reuses_ibfk_3` FOREIGN KEY (`version_id`) REFERENCES `versions` (`id`),
  CONSTRAINT `reuses_ibfk_4` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `favorites` (
  `user_id` int(11) NOT NULL,
  `task_id` int(11) NOT NULL,
  PRIMARY KEY (`user_id`,`task_id`),
  KEY `task_id` (`task_id`),
  CONSTRAINT `favorites_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `favorites_ibfk_2` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `title` varchar(200) NOT NULL,
  `link` varchar(200) DEFAULT '/workspace',
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ai_models` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `model` varchar(150) NOT NULL,
  `base_url` varchar(255) NOT NULL,
  `key_encrypted` text,
  `enabled` tinyint(1) DEFAULT '1',
  `is_default` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `max_tokens` int(11) NOT NULL DEFAULT '4096',
  `timeout_seconds` int(11) NOT NULL DEFAULT '60',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ai_runs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `model` varchar(150) DEFAULT NULL,
  `feature` varchar(50) DEFAULT NULL,
  `input_text` text,
  `output_text` mediumtext,
  `status` varchar(20) DEFAULT NULL,
  `tokens` int(11) DEFAULT '0',
  `duration_ms` int(11) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `ai_runs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `target` varchar(150) DEFAULT NULL,
  `detail` varchar(500) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `rate_limits` (
  `bucket` varchar(190) NOT NULL,
  `hits` int(11) NOT NULL DEFAULT '1',
  `reset_at` datetime NOT NULL,
  PRIMARY KEY (`bucket`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `task_drafts` (
  `task_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `notes` text NOT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`task_id`,`user_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `task_drafts_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`),
  CONSTRAINT `task_drafts_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ai_conversations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `title` varchar(100) NOT NULL,
  `archived` tinyint(1) DEFAULT '0',
  `busy_until` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `ai_conversations_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ai_messages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `conversation_id` int(11) NOT NULL,
  `role` enum('user','assistant') NOT NULL,
  `content` mediumtext NOT NULL,
  `status` enum('success','error') DEFAULT 'success',
  `model` varchar(150) DEFAULT NULL,
  `tokens` int(11) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `conversation_id` (`conversation_id`),
  CONSTRAINT `ai_messages_ibfk_1` FOREIGN KEY (`conversation_id`) REFERENCES `ai_conversations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


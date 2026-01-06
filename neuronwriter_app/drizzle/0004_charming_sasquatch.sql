CREATE TABLE `outlines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`queryId` int NOT NULL,
	`structure` text NOT NULL,
	`seoScore` int,
	`wordCount` int,
	`keywordUsage` text,
	`version` int NOT NULL DEFAULT 1,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `outlines_id` PRIMARY KEY(`id`)
);

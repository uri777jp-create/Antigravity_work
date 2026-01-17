CREATE TABLE `api_usage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`yearMonth` varchar(7) NOT NULL,
	`usageCount` int NOT NULL DEFAULT 0,
	`monthlyLimit` int NOT NULL DEFAULT 200,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `api_usage_id` PRIMARY KEY(`id`),
	CONSTRAINT `api_usage_yearMonth_unique` UNIQUE(`yearMonth`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`creditsAmount` int NOT NULL,
	`amountJpy` int NOT NULL,
	`stripeSessionId` varchar(255),
	`stripePaymentIntentId` varchar(255),
	`status` enum('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `credits` int DEFAULT 0 NOT NULL;
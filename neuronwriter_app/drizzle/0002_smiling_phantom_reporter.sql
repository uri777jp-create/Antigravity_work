CREATE TABLE `querySnapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`queryId` int NOT NULL,
	`userId` int NOT NULL,
	`neuronQueryId` varchar(255) NOT NULL,
	`snapshotData` text NOT NULL,
	`version` int NOT NULL,
	`fetchedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `querySnapshots_id` PRIMARY KEY(`id`)
);

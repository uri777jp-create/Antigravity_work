import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Projects table - stores NeuronWriter project references
 */
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  neuronProjectId: varchar("neuronProjectId", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Queries table - stores search queries and their metadata
 */
export const queries = mysqlTable("queries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  projectId: int("projectId").notNull(),
  neuronQueryId: varchar("neuronQueryId", { length: 255 }).notNull(),
  keyword: varchar("keyword", { length: 500 }).notNull(),
  language: varchar("language", { length: 10 }).notNull(),
  searchEngine: varchar("searchEngine", { length: 50 }).notNull(),
  status: mysqlEnum("status", ["pending", "ready", "error"]).default("pending").notNull(),
  title: text("title"),
  description: text("description"),
  leadText: text("leadText"),
  seoScore: int("seoScore"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Query = typeof queries.$inferSelect;
export type InsertQuery = typeof queries.$inferInsert;

/**
 * Contents table - stores article content and revisions
 */
export const contents = mysqlTable("contents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  queryId: int("queryId").notNull(),
  htmlContent: text("htmlContent").notNull(),
  evaluationScore: int("evaluationScore"),
  seoAnalysis: text("seoAnalysis"),
  isAutoSaved: int("isAutoSaved").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Content = typeof contents.$inferSelect;
export type InsertContent = typeof contents.$inferInsert;

// Query Snapshots table removed - not needed as each new query gets a new ID
/**
 * Outlines table - stores AI-generated article outlines/table of contents
 */
export const outlines = mysqlTable("outlines", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  queryId: int("queryId").notNull(),
  
  // 目次構造データ（JSON形式）
  // { headings: [{ id: "h1", level: 2, text: "見出し1", keywords: ["キーワード1"], order: 0 }] }
  structure: text("structure").notNull(),
  
  // SEOメトリクス
  seoScore: int("seoScore"), // NeuronWriter APIから取得したスコア
  wordCount: int("wordCount"), // 推定文字数
  keywordUsage: text("keywordUsage"), // キーワード使用状況（JSON）
  
  // バージョン管理
  version: int("version").default(1).notNull(),
  isActive: int("isActive").default(1).notNull(), // 1=active, 0=archived
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Outline = typeof outlines.$inferSelect;
export type InsertOutline = typeof outlines.$inferInsert;

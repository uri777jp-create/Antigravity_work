import { eq, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, projects, InsertProject, queries, InsertQuery, contents, InsertContent, outlines, InsertOutline, payments, InsertPayment, apiUsage, InsertApiUsage } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && ENV.databaseUrl) {
    try {
      _db = drizzle(ENV.databaseUrl);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}


export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  // 最新のユーザー順に取得
  return await db.select().from(users).orderBy(users.createdAt);
}

export async function getAllUsersWithProjects() {
  const db = await getDb();
  if (!db) return [];

  const rows = await db.select().from(users).leftJoin(projects, eq(users.id, projects.userId)).orderBy(users.createdAt);

  const result = rows.reduce<Record<number, any>>((acc, row) => {
    const user = row.users;
    const project = row.projects;

    if (!acc[user.id]) {
      acc[user.id] = { ...user, projects: [] };
    }

    if (project) {
      acc[user.id].projects.push(project);
    }

    return acc;
  }, {});

  return Object.values(result).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function deleteUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Manual cascade delete
  await db.delete(outlines).where(eq(outlines.userId, userId));
  await db.delete(contents).where(eq(contents.userId, userId));
  await db.delete(queries).where(eq(queries.userId, userId));
  await db.delete(projects).where(eq(projects.userId, userId));
  await db.delete(payments).where(eq(payments.userId, userId));

  await db.delete(users).where(eq(users.id, userId));
}

// NeuronWriter feature queries

export async function createProject(project: InsertProject) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(projects).values(project);
  return result;
}

export async function getUserProjects(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(projects).where(eq(projects.userId, userId));
}

export async function getProjectById(projectId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getProjectByNeuronId(neuronProjectId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(projects).where(eq(projects.neuronProjectId, neuronProjectId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createQuery(query: InsertQuery) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(queries).values(query);
  return { insertId: Number(result[0].insertId) };
}

export async function getUserQueries(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(queries).where(eq(queries.userId, userId));
}

// Admin用: 全ユーザーのクエリ一覧（ユーザー・プロジェクト情報付き）
export async function getAllQueries() {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select({
      id: queries.id,
      userId: queries.userId,
      projectId: queries.projectId,
      keyword: queries.keyword,
      status: queries.status,
      language: queries.language,
      searchEngine: queries.searchEngine,
      createdAt: queries.createdAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
      project: {
        id: projects.id,
        name: projects.name,
      },
    })
    .from(queries)
    .leftJoin(users, eq(queries.userId, users.id))
    .leftJoin(projects, eq(queries.projectId, projects.id))
    .orderBy(queries.createdAt);
  return result;
}

export async function getQueryById(queryId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(queries).where(eq(queries.id, queryId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateQueryStatus(queryId: number, status: "pending" | "ready" | "error") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(queries).set({ status }).where(eq(queries.id, queryId));
}

export async function createContent(content: InsertContent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(contents).values(content);
  return result;
}

export async function getContentsByQueryId(queryId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(contents).where(eq(contents.queryId, queryId));
}

export async function getLatestContentByQueryId(queryId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(contents).where(eq(contents.queryId, queryId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Outline management

export async function createOutline(outline: InsertOutline) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(outlines).values(outline);
  return { insertId: Number(result[0].insertId) };
}

export async function getOutlinesByQueryId(queryId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(outlines).where(eq(outlines.queryId, queryId)).orderBy(desc(outlines.id));
}

export async function getOutlineById(outlineId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(outlines).where(eq(outlines.id, outlineId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateOutline(outlineId: number, data: Partial<InsertOutline>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(outlines).set(data).where(eq(outlines.id, outlineId));
}

export async function getActiveOutlineByQueryId(queryId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(outlines)
    .where(eq(outlines.queryId, queryId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateQueryTitleDescription(queryId: number, data: { title?: string; description?: string; leadText?: string; seoScore?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(queries).set(data).where(eq(queries.id, queryId));
}

// =========================================
// クレジット管理
// =========================================

/** ユーザーのクレジット残高を取得 */
export async function getUserCredits(userId: number): Promise<number> {
  const user = await getUserById(userId);
  return user?.credits ?? 0;
}

/** ユーザーのクレジットを減算 */
export async function decrementUserCredits(userId: number, amount: number = 1): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users)
    .set({ credits: sql`${users.credits} - ${amount}` })
    .where(eq(users.id, userId));
}

/** ユーザーのクレジットを加算 */
export async function incrementUserCredits(userId: number, amount: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users)
    .set({ credits: sql`${users.credits} + ${amount}` })
    .where(eq(users.id, userId));
}

/** ユーザーのクレジットを設定（admin用） */
export async function setUserCredits(userId: number, credits: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users)
    .set({ credits })
    .where(eq(users.id, userId));
}

// =========================================
// 決済履歴管理
// =========================================

/** 決済レコードを作成 */
export async function createPayment(payment: InsertPayment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(payments).values(payment);
  return { insertId: Number(result[0].insertId) };
}

/** 決済ステータスを更新 */
export async function updatePaymentStatus(
  stripeSessionId: string,
  status: "pending" | "completed" | "failed" | "refunded",
  stripePaymentIntentId?: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: any = { status };
  if (stripePaymentIntentId) {
    updateData.stripePaymentIntentId = stripePaymentIntentId;
  }
  await db.update(payments)
    .set(updateData)
    .where(eq(payments.stripeSessionId, stripeSessionId));
}

/** ユーザーの決済履歴を取得 */
export async function getUserPayments(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(payments)
    .where(eq(payments.userId, userId))
    .orderBy(desc(payments.createdAt));
}

/** stripeSessionIdで決済を取得 */
export async function getPaymentBySessionId(stripeSessionId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(payments)
    .where(eq(payments.stripeSessionId, stripeSessionId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// =========================================
// API使用量管理
// =========================================

/** 現在月のAPI使用量を取得（なければ作成） */
export async function getOrCreateApiUsage(yearMonth: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(apiUsage)
    .where(eq(apiUsage.yearMonth, yearMonth))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // 新規作成
  await db.insert(apiUsage).values({ yearMonth, usageCount: 0, monthlyLimit: 200 });
  const created = await db.select().from(apiUsage)
    .where(eq(apiUsage.yearMonth, yearMonth))
    .limit(1);
  return created[0];
}

/** API使用回数を増加 */
export async function incrementApiUsage(yearMonth: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 存在確認・作成
  await getOrCreateApiUsage(yearMonth);

  await db.update(apiUsage)
    .set({ usageCount: sql`${apiUsage.usageCount} + 1` })
    .where(eq(apiUsage.yearMonth, yearMonth));
}

/** API使用量をチェック（上限に達しているか） */
export async function checkApiUsageLimit(yearMonth: string): Promise<{ usageCount: number; monthlyLimit: number; isLimitReached: boolean }> {
  const usage = await getOrCreateApiUsage(yearMonth);
  return {
    usageCount: usage.usageCount,
    monthlyLimit: usage.monthlyLimit,
    isLimitReached: usage.usageCount >= usage.monthlyLimit,
  };
}

/** 全期間のAPI使用量を取得（admin用） */
export async function getAllApiUsage() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(apiUsage).orderBy(desc(apiUsage.yearMonth));
}


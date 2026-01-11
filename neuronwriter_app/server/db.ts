import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, projects, InsertProject, queries, InsertQuery, contents, InsertContent, outlines, InsertOutline } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
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

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  // 最新のユーザー順に取得
  return await db.select().from(users).orderBy(users.createdAt);
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
  return await db.select().from(outlines).where(eq(outlines.queryId, queryId));
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

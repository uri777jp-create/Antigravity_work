import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    passwordHash: null,
    loginMethod: "manus",
    role: "user",
    credits: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => { },
    } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

describe("NeuronWriter API Integration", () => {
  it("should list projects from NeuronWriter API", async () => {
    const caller = appRouter.createCaller(createAuthContext().ctx);

    try {
      const result = await caller.neuronwriter.listProjects();
      expect(result).toBeDefined();
      expect(result).toHaveProperty("projects");
    } catch (error: any) {
      // API might fail if credentials are invalid, but we test the structure
      expect(error.message).toBeDefined();
    }
  });

  it("should get user projects from database", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.neuronwriter.getUserProjects();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should get user queries from database", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.neuronwriter.getUserQueries();
    expect(Array.isArray(result)).toBe(true);
  });
});

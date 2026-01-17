import { describe, it, expect } from "vitest";

describe("Outline Persistence Feature - Database Schema", () => {
  it("should have outlines table in schema", async () => {
    const { outlines } = await import("../drizzle/schema");
    expect(outlines).toBeDefined();
    // Check that required columns exist
    expect(outlines.id).toBeDefined();
    expect(outlines.userId).toBeDefined();
    expect(outlines.queryId).toBeDefined();
    expect(outlines.structure).toBeDefined();
    expect(outlines.seoScore).toBeDefined();
  });
});

describe("Outline Persistence Feature - tRPC Procedures", () => {
  it("should have generateOutline procedure defined", async () => {
    const { appRouter } = await import("./routers");
    expect(appRouter).toBeDefined();
    expect(appRouter.neuronwriter.generateOutline).toBeDefined();
  });

  it("should have getOutlinesByQuery procedure defined", async () => {
    const { appRouter } = await import("./routers");
    expect(appRouter).toBeDefined();
    expect(appRouter.neuronwriter.getOutlinesByQuery).toBeDefined();
  });

  it("should have updateOutline procedure defined", async () => {
    const { appRouter } = await import("./routers");
    expect(appRouter).toBeDefined();
    expect(appRouter.neuronwriter.updateOutline).toBeDefined();
  });
});

describe("Outline Persistence Feature - Database Helpers", () => {
  it("should have createOutline function in db.ts", async () => {
    const db = await import("./db");
    expect(db.createOutline).toBeDefined();
    expect(typeof db.createOutline).toBe("function");
  });

  it("should have getOutlinesByQueryId function in db.ts", async () => {
    const db = await import("./db");
    expect(db.getOutlinesByQueryId).toBeDefined();
    expect(typeof db.getOutlinesByQueryId).toBe("function");
  });

  it("should have updateOutline function in db.ts", async () => {
    const db = await import("./db");
    expect(db.updateOutline).toBeDefined();
    expect(typeof db.updateOutline).toBe("function");
  });

  it("should have getActiveOutlineByQueryId function in db.ts", async () => {
    const db = await import("./db");
    expect(db.getActiveOutlineByQueryId).toBeDefined();
    expect(typeof db.getActiveOutlineByQueryId).toBe("function");
  });
});

describe("Outline Structure Validation", () => {
  it("should parse valid outline structure JSON", () => {
    const validStructure = JSON.stringify({
      headings: [
        { id: "h0", level: 2, text: "見出し1", keywords: ["キーワード1"], order: 0 },
        { id: "h1", level: 3, text: "小見出し1", keywords: [], order: 1 },
      ],
    });

    const parsed = JSON.parse(validStructure);
    expect(parsed.headings).toBeDefined();
    expect(Array.isArray(parsed.headings)).toBe(true);
    expect(parsed.headings.length).toBe(2);
    expect(parsed.headings[0].level).toBe(2);
    expect(parsed.headings[0].text).toBe("見出し1");
  });

  it("should handle outline with multiple heading levels", () => {
    const structure = {
      headings: [
        { id: "h0", level: 2, text: "H2見出し", keywords: [], order: 0 },
        { id: "h1", level: 3, text: "H3見出し", keywords: [], order: 1 },
        { id: "h2", level: 4, text: "H4見出し", keywords: [], order: 2 },
      ],
    };

    const jsonString = JSON.stringify(structure);
    const parsed = JSON.parse(jsonString);

    expect(parsed.headings[0].level).toBe(2);
    expect(parsed.headings[1].level).toBe(3);
    expect(parsed.headings[2].level).toBe(4);
  });
});

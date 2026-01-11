import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

export function registerMockAuthRoutes(app: Express) {
    app.get("/api/auth/mock-login", async (req: Request, res: Response) => {
        const role = typeof req.query.role === "string" && req.query.role === "admin" ? "admin" : "user";

        let mockOpenId = "mock-user-123";
        let mockName = "Test User";
        let mockEmail = "user@example.com";

        if (role === "admin") {
            mockOpenId = "mock-admin-999";
            mockName = "Admin User";
            mockEmail = "admin@example.com";
        }

        try {
            // 1. Upsert mock user in local DB
            await db.upsertUser({
                openId: mockOpenId,
                name: mockName,
                email: mockEmail,
                loginMethod: "mock",
                role: role,
                lastSignedIn: new Date(),
            });

            // 1.5. Check if user needs a default project (1-to-1 User-Project ID)
            // Fetch user to get ID
            const user = await db.getUserByOpenId(mockOpenId);
            if (user) {
                const projects = await db.getUserProjects(user.id);
                if (projects.length === 0) {
                    console.log(`[MockAuth] Creating default project for ${mockName}`);
                    // Use openId or name as project ID. Using name as requested.
                    await db.createProject({
                        userId: user.id,
                        neuronProjectId: mockName, // User name as Project ID
                        name: mockName,
                    });
                }
            }

            // 2. Create session token (JWT)
            const sessionToken = await sdk.createSessionToken(mockOpenId, {
                name: mockName,
                expiresInMs: ONE_YEAR_MS,
            });

            // 3. Set cookie
            const cookieOptions = getSessionCookieOptions(req);
            res.cookie(COOKIE_NAME, sessionToken, {
                ...cookieOptions,
                maxAge: ONE_YEAR_MS
            });

            console.log(`[MockAuth] Logged in as ${mockName} (openid: ${mockOpenId}, role: ${role})`);

            // 4. Redirect to home (Frontend will handle redirection based on role)
            res.redirect(302, "/");
        } catch (error) {
            console.error("[MockAuth] Login failed", error);
            res.status(500).json({ error: "Mock login failed" });
        }
    });
}

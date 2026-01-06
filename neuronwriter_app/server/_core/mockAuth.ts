import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

export function registerMockAuthRoutes(app: Express) {
    app.get("/api/auth/mock-login", async (req: Request, res: Response) => {
        const mockOpenId = "mock-user-123";
        const mockName = "Mock User";
        const mockEmail = "mock@example.com";

        try {
            // 1. Upsert mock user in local DB
            await db.upsertUser({
                openId: mockOpenId,
                name: mockName,
                email: mockEmail,
                loginMethod: "mock",
                lastSignedIn: new Date(),
            });

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

            console.log(`[MockAuth] Logged in as ${mockName} (openid: ${mockOpenId})`);

            // 4. Redirect to home
            res.redirect(302, "/");
        } catch (error) {
            console.error("[MockAuth] Login failed", error);
            res.status(500).json({ error: "Mock login failed" });
        }
    });
}

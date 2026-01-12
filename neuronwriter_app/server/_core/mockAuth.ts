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

            // 1.5. Check if user needs a default project (Logic Removed: Admin assigns projects)
            /*
            // Fetch user to get ID
            const user = await db.getUserByOpenId(mockOpenId);
            if (user) {
                const projects = await db.getUserProjects(user.id);
                if (projects.length === 0) {
                     // Auto-create logic removed
                }
            }
            */

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

    // POST Login
    app.post("/api/auth/login", async (req: Request, res: Response) => {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: "メールアドレスとパスワードを入力してください" });
        }

        try {
            // Check if user exists (Mock simple check: strictly match email)
            // Ideally we should use db.getUserByEmail if available, for now matching all users
            const users = await db.getAllUsers();
            const user = users.find(u => u.email === email);

            if (!user) {
                return res.status(401).json({ error: "メールアドレスまたはパスワードが間違っています" });
            }

            // Create session
            const sessionToken = await sdk.createSessionToken(user.openId, {
                name: user.name || "User",
                expiresInMs: ONE_YEAR_MS,
            });

            const cookieOptions = getSessionCookieOptions(req);
            res.cookie(COOKIE_NAME, sessionToken, {
                ...cookieOptions,
                maxAge: ONE_YEAR_MS
            });

            return res.json({ success: true, user });
        } catch (error) {
            console.error("[MockAuth] Login failed", error);
            res.status(500).json({ error: "ログイン処理に失敗しました" });
        }
    });

    // POST Register
    app.post("/api/auth/register", async (req: Request, res: Response) => {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: "プロジェクト名、メールアドレス、パスワードは必須です" });
        }

        try {
            const users = await db.getAllUsers();
            const existingEmail = users.find(u => u.email === email);
            if (existingEmail) {
                return res.status(400).json({ error: "このメールアドレスは既に登録されています" });
            }

            // Project ID check removed since we are not autocreating projects.
            /*
            // Check if project name/id already exists
            const existingProject = await db.getProjectByNeuronId(name);
            if (existingProject) {
                return res.status(400).json({ error: "このプロジェクトIDは既に使用されています。別の名前を指定してください" });
            }
            */

            // Use email as OpenID for simplicity
            const newOpenId = email;

            await db.upsertUser({
                openId: newOpenId,
                name: name,
                email: email,
                loginMethod: "mock",
                role: name === "admin_sarami" ? "admin" : "user",
                lastSignedIn: new Date(),
            });

            // Fetch user to return in response (and for future potential logic)
            const user = await db.getUserByOpenId(newOpenId);

            // Auto-create project logic removed. Admin must assign project manually.
            /*
            if (user) {
                await db.createProject({
                    userId: user.id,
                    neuronProjectId: name,
                    name: name,
                });
            }
            */

            // Login
            const sessionToken = await sdk.createSessionToken(newOpenId, {
                name: name,
                expiresInMs: ONE_YEAR_MS,
            });

            const cookieOptions = getSessionCookieOptions(req);
            res.cookie(COOKIE_NAME, sessionToken, {
                ...cookieOptions,
                maxAge: ONE_YEAR_MS
            });

            return res.json({ success: true, user });
        } catch (error) {
            console.error("[MockAuth] Register failed", error);
            res.status(500).json({ error: "Registration failed" });
        }
    });
}

import request from "supertest";
import { describe, it, beforeAll, afterAll, expect } from "vitest";
import { app, setupDB, teardownDB } from "./setup.js";

describe("Auth", () => {
    beforeAll(setupDB);
    afterAll(teardownDB);

    it("registers and logs in", async () => {
        const email = `t${Date.now()}@e.com`;

        const reg = await request(app).post("/api/auth/register").send({
            name: "Tester", email, password: "StrongPass1"
        });
        expect(reg.status).toBe(201);
        expect(reg.body?.token).toBeTruthy();

        const login = await request(app).post("/api/auth/login").send({ email, password: "StrongPass1" });
        expect(login.status).toBe(200);
        expect(login.body?.token).toBeTruthy();

        const profile = await request(app).get("/api/user/profile")
            .set("Authorization", `Bearer ${login.body.token}`);
        expect(profile.status).toBe(200);
        expect(profile.body.user.email).toBe(email);
    });
});

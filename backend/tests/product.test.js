import request from "supertest";
import { describe, it, beforeAll, afterAll, expect } from "vitest";
import { app, setupDB, teardownDB } from "./setup.js";
import User from "../src/models/User.js";
import bcrypt from "bcrypt";

let adminToken = "";

describe("Products", () => {
    beforeAll(async () => {
        await setupDB();
        const hash = await bcrypt.hash("AdminPass1", 8);
        await User.create({ name: "Admin", email: "a@e.com", password: hash, role: "admin", tokenVersion: 0 });
        const auth = await request(app).post("/api/auth/login").send({ email: "a@e.com", password: "AdminPass1" });
        adminToken = auth.body.token;
    });

    afterAll(teardownDB);

    it("creates and lists a product", async () => {
        const create = await request(app)
            .post("/api/products")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ title: "Eclipse Test Radio", price: 99.5, stock: 10, category: "radio", description: "test" });
        expect(create.status).toBe(201);

        const list = await request(app).get("/api/products").query({ q: "Radio" });
        expect(list.status).toBe(200);
        expect(list.body.total).toBeGreaterThan(0);
    });
});

import request from "supertest";
import { describe, it, beforeAll, afterAll, expect } from "vitest";
import { app, setupDB, teardownDB } from "./setup.js";
import Product from "../src/models/Product.js";

let token = "", productId = "";

describe("Cart", () => {
    beforeAll(async () => {
        await setupDB();
        const reg = await request(app).post("/api/auth/register").send({
            name: "Buyer", email: `b${Date.now()}@e.com`, password: "StrongPass1"
        });
        token = reg.body.token;

        const p = await Product.create({
            title: "Cart Test Speaker",
            slug: "cart-test-speaker",
            price: 50,
            stock: 5,
            category: "speaker",
            active: true,
            createdBy: reg.body.user.id
        });
        productId = p._id.toString();
    });

    afterAll(teardownDB);

    it("adds and fetches cart", async () => {
        const add = await request(app)
            .post("/api/cart")
            .set("Authorization", `Bearer ${token}`)
            .send({ productId, qty: 2 });
        expect(add.status).toBe(200);
        expect(add.body.items[0].qty).toBe(2);

        const get = await request(app)
            .get("/api/cart")
            .set("Authorization", `Bearer ${token}`);
        expect(get.status).toBe(200);
        expect(get.body.subtotal).toBe(100);
    });
});

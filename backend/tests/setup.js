// tests/setup.js
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { buildApp } from "../src/app.js";

process.env.JWT_SECRET = process.env.JWT_SECRET || "testsecret";
process.env.JWT_EXPIRES_IN = "1h";

let mongod;
export let app;

export async function setupDB() {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri, { dbName: "eclipse_test" });
    app = buildApp(); // build after DB is ready
}

export async function teardownDB() {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
}

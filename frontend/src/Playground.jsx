import { useState } from "react";
import { api } from "./lib/api";
import { useAuth } from "./features/auth/useAuth";

export default function Playground() {
    const { user, token, register, login, logout } = useAuth();
    const [out, setOut] = useState(null);
    const [err, setErr] = useState(null);

    const run = async (fn) => {
        setErr(null); setOut(null);
        try { const res = await fn(); setOut(res?.data ?? res); }
        catch (e) { setErr(e.response?.data?.error || e.message); }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <h1 className="text-2xl font-semibold">Eclipse Test Playground</h1>

            {/* Auth */}
            <section className="border rounded-xl p-4 space-y-2">
                <h2 className="font-medium">Auth</h2>
                <div className="flex gap-2">
                    <button className="px-3 py-2 border rounded"
                            onClick={() => run(() => register({
                                name: "Tester",
                                email: `t${Date.now()}@e.com`,
                                password: "StrongPass1"
                            }))}>
                        Quick Register
                    </button>
                    <button className="px-3 py-2 border rounded"
                            onClick={() => run(() => login({
                                email: window.prompt("email") || "",
                                password: window.prompt("password") || ""
                            }))}>
                        Login
                    </button>
                    <button className="px-3 py-2 border rounded" onClick={logout}>Logout</button>
                </div>
                <div className="text-sm text-gray-600">
                    User: {user ? `${user.email} (${user.role})` : "none"} | token: {token ? "yes" : "no"}
                </div>
            </section>

            {/* Profile */}
            <section className="border rounded-xl p-4 space-y-2">
                <h2 className="font-medium">Profile</h2>
                <div className="flex gap-2">
                    <button className="px-3 py-2 border rounded"
                            onClick={() => run(() => api.get("/user/profile"))}>
                        GET /user/profile
                    </button>
                    <button className="px-3 py-2 border rounded"
                            onClick={() => run(() => api.put("/user/profile", { name: "Tester " + Math.floor(Math.random()*100) }))}>
                        PUT /user/profile (name)
                    </button>
                </div>
            </section>

            {/* Products */}
            <section className="border rounded-xl p-4 space-y-2">
                <h2 className="font-medium">Products</h2>
                <div className="flex flex-wrap gap-2">
                    <button className="px-3 py-2 border rounded"
                            onClick={() => run(() => api.get("/products", { params: { q: "radio", page: 1, limit: 6 } }))}>
                        GET /products?q=radio
                    </button>
                    <button className="px-3 py-2 border rounded"
                            onClick={() => {
                                const id = window.prompt("Product _id to update:");
                                return run(() => api.put(`/products/${id}`, { price: 123.45 }));
                            }}>
                        PUT /products/:id (admin)
                    </button>
                    <button className="px-3 py-2 border rounded"
                            onClick={() => {
                                const id = window.prompt("Product _id to delete:");
                                return run(() => api.delete(`/products/${id}`));
                            }}>
                        DELETE /products/:id (admin)
                    </button>
                </div>
            </section>

            {/* Cart */}
            <section className="border rounded-xl p-4 space-y-2">
                <h2 className="font-medium">Cart</h2>
                <div className="flex flex-wrap gap-2">
                    <button className="px-3 py-2 border rounded" onClick={() => run(() => api.get("/cart"))}>
                        GET /cart
                    </button>
                    <button className="px-3 py-2 border rounded"
                            onClick={() => {
                                const productId = window.prompt("productId:") || "";
                                return run(() => api.post("/cart", { productId, qty: 2 }));
                            }}>
                        POST /cart (add qty 2)
                    </button>
                    <button className="px-3 py-2 border rounded"
                            onClick={() => {
                                const productId = window.prompt("productId to remove:") || "";
                                return run(() => api.delete(`/cart/${productId}`));
                            }}>
                        DELETE /cart/:productId
                    </button>
                </div>
            </section>

            {/* Output */}
            <section className="border rounded-xl p-4">
                <h2 className="font-medium mb-2">Output</h2>
                {err && <pre className="text-red-600 whitespace-pre-wrap">{err}</pre>}
                {!err && <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(out, null, 2)}</pre>}
            </section>
        </div>
    );
}

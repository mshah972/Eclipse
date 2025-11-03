import { useState } from "react";
import { api, setAuthToken } from "../../lib/api.js";

export function useAuth() {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);

    const saveAuth = (u, t) => {
        setUser(u);
        setToken(t);
        setAuthToken(t);
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        setAuthToken();
    };

    const register = async ({ name, email, password }) => {
        const { data } = await api.post("/auth/register", { name, email, password });
        saveAuth(data.user, data.token);
        return data;
    };

    const login = async ({ email, password }) => {
        const { data } = await api.post("/auth/login", { email, password });
        saveAuth(data.user, data.token);
        return data;
    };

    return { user, token, register, login, logout };
}
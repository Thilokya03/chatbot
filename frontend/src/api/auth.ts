import { api } from "./client";

export const registerUser = (data: {
  email: string;
  password: string;
  name?: string;
}) => api.post("/auth/register", data);

export const loginUser = (data: {
  email: string;
  password: string;
}) => api.post("/auth/login", data);

export const logoutUser = () =>
  api.post("/auth/logout");

export const me = () =>
  api.get("/auth/me");

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  role?: "admin" | "user";
};
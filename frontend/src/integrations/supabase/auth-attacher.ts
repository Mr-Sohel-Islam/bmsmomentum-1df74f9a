import { createMiddleware } from "@tanstack/react-start";
import { getAuthToken } from "@/lib/api-client";

export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const token = getAuthToken();
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);

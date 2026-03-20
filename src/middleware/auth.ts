import { createMiddleware } from "hono/factory";
import type { AppBindings } from "../types/env";
import { unauthorized } from "../utils/http";
import { verifyJwt } from "../utils/jwt";

export const authMiddleware = createMiddleware<AppBindings>(async (c, next) => {
  const secret = c.env.JWT_SECRET;
  if (!secret) {
    await next();
    return;
  }

  const authHeader = c.req.header("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return unauthorized(c);
  }

  const token = authHeader.slice("Bearer ".length);
  const payload = await verifyJwt(token, secret);
  if (!payload) {
    return unauthorized(c, "Invalid token");
  }

  if (payload.workspace_id) {
    c.set("workspaceId", payload.workspace_id);
  }

  await next();
});

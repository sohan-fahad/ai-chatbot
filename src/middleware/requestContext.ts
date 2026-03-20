import { createMiddleware } from "hono/factory";
import type { AppBindings } from "../types/env";
import { createId } from "../utils/ids";

export const requestContext = createMiddleware<AppBindings>(async (c, next) => {
  const requestId = c.req.header("x-request-id") ?? createId("req");
  c.set("requestId", requestId);
  await next();
  c.res.headers.set("x-request-id", requestId);
});

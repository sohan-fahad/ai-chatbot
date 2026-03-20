import type { Context } from "hono";

export function badRequest(c: Context, message: string, requestId?: string) {
  return c.json(
    {
      error: "bad_request",
      message,
      requestId: requestId ?? c.get("requestId"),
    },
    400,
  );
}

export function unauthorized(c: Context, message = "Unauthorized") {
  return c.json(
    {
      error: "unauthorized",
      message,
      requestId: c.get("requestId"),
    },
    401,
  );
}

export function internalError(c: Context, message = "Internal server error") {
  return c.json(
    {
      error: "internal_error",
      message,
      requestId: c.get("requestId"),
    },
    500,
  );
}

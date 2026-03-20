import { Hono } from "hono";
import { authMiddleware } from "./middleware/auth";
import { requestContext } from "./middleware/requestContext";
import { askRoute } from "./routes/ask";
import { uploadRoute } from "./routes/upload";
import { chatPage } from "./routes/ui/chat";
import { homePage } from "./routes/ui/home";
import type { AppBindings } from "./types/env";

const app = new Hono<AppBindings>();

app.use("*", requestContext);
// app.use("/upload", authMiddleware);
// app.use("/ask", authMiddleware);

app.get("/", (c) => c.html(homePage()));
app.get("/chat", (c) => c.html(chatPage()));

app.get("/health", (c) =>
  c.json({
    ok: true,
    service: "cloudflare-rag-mvp",
    requestId: c.get("requestId"),
  }),
);

app.route("/upload", uploadRoute);
app.route("/ask", askRoute);

app.notFound((c) =>
  c.json(
    {
      error: "not_found",
      requestId: c.get("requestId"),
    },
    404,
  ),
);

app.onError((error, c) => {
  console.error("unhandled_error", {
    message: error.message,
    requestId: c.get("requestId"),
  });
  return c.json(
    {
      error: "internal_error",
      requestId: c.get("requestId"),
    },
    500,
  );
});

export default app;

import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";
import cookieParser from "cookie-parser";
import { router as supervisionRouter } from "./routing";

const PORT = Number(process.env.PORT || 3000);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "").split(",").filter(Boolean);

const app = express();
app.use(helmet());
app.use(express.json({ limit: "100kb" })); // protect from huge payloads
app.use(cookieParser());
app.use(cors({
  origin: ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : false,
  credentials: true,
}));
app.set("trust proxy", 1);

// global rate limiter (low for create/submit endpoints will be applied in routing)
app.use(rateLimit({
  windowMs: 60_000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
}));

// simple auth stub - replace with your auth
declare global { namespace Express { interface Request { user?: { id: string, roles: string[] } } } }
function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  // Example: read JWT from Authorization header; here we stub a logged-in user for dev
  // Replace with real JWT/session validation
  const auth = req.header("authorization");
  if (!auth) return res.status(401).json({ error: "unauthenticated" });
  // parse token -> user
  req.user = { id: "user-123", roles: ["team-member"] };
  next();
}

app.get("/health", (_req, res) => res.json({ status: "ok", now: Date.now() }));

// mount supervision routes behind auth
app.use("/supervision", authMiddleware, supervisionRouter);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err?.stack ?? err);
  res.status(500).json({ error: "internal_server_error" });
});

app.listen(PORT, () => {
  // don't leak secrets in logs
  console.log(`Server listening on port ${PORT}`);
});

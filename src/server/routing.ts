import express from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import * as crypto from "crypto";

// --- Simple in-memory DB stubs (replace with persistent DB) ---
type ID = string;
function genId(prefix = "") { return prefix + crypto.randomBytes(6).toString("hex"); }
const DB = {
  supervisions: new Map<ID, any>(),
  submissions: new Map<ID, any>(),
  audit: [] as any[],
};

// --- Config ---
const MAX_CONTENT_LENGTH = 50_000; // chars
const ANON_PREFIX = "anon-";

// --- Helpers ---
function nowIso() { return new Date().toISOString(); }
function audit(supervisionId: ID | null, actorId: string | null, action: string, meta = {}) {
  // store minimal info; do NOT include full content
  DB.audit.push({ id: genId("audit-"), supervisionId, actorId: actorId ? maskId(actorId) : null, action, meta, ts: nowIso() });
}
function maskId(id: string) {
  // deterministic anonymization for logs
  return crypto.createHash("sha256").update(id).digest("hex").slice(0, 12);
}

// --- Simple encryption helper (app-side AES-GCM) ---
// NOTE: Prefer KMS or DB-side encryption in production
const ENC_KEY = process.env.SUPERVISION_ENC_KEY || "dev-key-32-bytes-length!!!!!!!!!"; // must be 32 bytes
function encrypt(text: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(ENC_KEY.slice(0,32)), iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}
function decrypt(b64: string) {
  const buf = Buffer.from(b64, "base64");
  const iv = buf.slice(0, 12);
  const tag = buf.slice(12, 28);
  const encrypted = buf.slice(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", Buffer.from(ENC_KEY.slice(0,32)), iv);
  decipher.setAuthTag(tag);
  const out = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return out.toString("utf8");
}

// --- Validation schemas ---
const createSchema = z.object({
  incidentId: z.string().min(1),
  title: z.string().min(1).max(200),
  participants: z.array(z.string()).nonempty(),
  anonymousSubmissions: z.boolean().optional().default(false),
});

const joinSchema = z.object({
  userId: z.string().optional(),
  displayName: z.string().optional(),
  asAnonymous: z.boolean().optional().default(false),
});

const submitSchema = z.object({
  userId: z.string().optional(),
  content: z.string().min(1).max(MAX_CONTENT_LENGTH),
  anonymous: z.boolean().optional().default(false),
  type: z.enum(["fact", "feeling", "suggestion"]),
});

const closeSchema = z.object({
  reason: z.string().optional(),
});

const voteSchema = z.object({
  agree: z.boolean(),
});

// --- Router ---
export const router = express.Router();

// fine-grained rate-limits for critical endpoints
const createLimiter = rateLimit({ windowMs: 60_000, max: 5, standardHeaders: true, legacyHeaders: false });
const submitLimiter = rateLimit({ windowMs: 60_000, max: 20, standardHeaders: true, legacyHeaders: false });

// helper: load supervision or 404
async function loadSupervision(id: ID) {
  const s = DB.supervisions.get(id);
  if (!s) return null;
  return s;
}

function getConsensusRoster(s: any) {
  return Array.from(new Set([...(s.participants || []), s.moderatorId].filter(Boolean)));
}

function computeConsensus(s: any) {
  const roster = getConsensusRoster(s);
  const votes = s.closeVotes || {};
  const yes = roster.filter((uid) => votes[uid] === true).length;
  const no = roster.filter((uid) => votes[uid] === false).length;
  const pending = roster.length - yes - no;
  return {
    roster,
    yes,
    no,
    pending,
    allAgree: roster.length > 0 && pending === 0 && yes === roster.length,
    participantCount: roster.length,
  };
}

function anonymizeSubmission(sub: any, supervision: any) {
  const sanitized = { ...sub };
  if (supervision.anonymousSubmissions || !sanitized.authorId) {
    sanitized.authorId = null;
  } else {
    sanitized.authorId = maskId(sanitized.authorId);
  }
  return sanitized;
}

function requireParticipant(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!req.user) return res.status(401).json({ error: "unauthenticated" });
  const supervisionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const s = DB.supervisions.get(supervisionId);
  if (!s) return res.status(404).json({ error: "not_found" });
  const uid = req.user.id;
  if (!s.participants.includes(uid) && s.moderatorId !== uid) {
    return res.status(403).json({ error: "forbidden" });
  }
  (req as any).supervision = s;
  next();
}

function requireModerator(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!req.user) return res.status(401).json({ error: "unauthenticated" });
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const s = (req as any).supervision ?? DB.supervisions.get(id);
  if (!s) return res.status(404).json({ error: "not_found" });
  if (s.moderatorId !== req.user.id) return res.status(403).json({ error: "forbidden_moderator" });
  (req as any).supervision = s;
  next();
}

// POST /supervision/create
router.post("/create", createLimiter, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload", details: parsed.error.errors });

  const { incidentId, title, participants, anonymousSubmissions } = parsed.data;
  const id = genId("sup-");
  const moderatorId = req.user!.id;
  const supervision = {
    id, incidentId, title, participants, anonymousSubmissions,
    moderatorId, state: "open", createdAt: nowIso(), updatedAt: nowIso(),
  };
  DB.supervisions.set(id, supervision);
  audit(id, req.user!.id, "create", { incidentId, participantCount: participants.length });
  res.status(201).json({ id, createdAt: supervision.createdAt });
});

// POST /supervision/:id/join
router.post("/:id/join", async (req, res) => {
  const parsed = joinSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload", details: parsed.error.errors });
  const { asAnonymous } = parsed.data;
  const id = req.params.id;
  const s = DB.supervisions.get(id);
  if (!s) return res.status(404).json({ error: "not_found" });

  const uid = req.user!.id;
  if (!s.participants.includes(uid)) s.participants.push(uid);
  audit(id, uid, "join", { asAnonymous: !!asAnonymous });
  res.json({ ok: true });
});

// POST /supervision/:id/consensus
router.post("/:id/consensus", requireParticipant, (req, res) => {
  const parsed = voteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload", details: parsed.error.errors });
  const s = (req as any).supervision;
  if (s.state !== "open") return res.status(409).json({ error: "supervision_closed" });

  s.closeVotes = s.closeVotes || {};
  s.closeVotes[req.user!.id] = parsed.data.agree;
  s.updatedAt = nowIso();
  DB.supervisions.set(s.id, s);
  audit(s.id, req.user!.id, "vote_close", { agree: parsed.data.agree });

  res.json({ ok: true, consensus: computeConsensus(s) });
});

// POST /supervision/:id/submit
router.post("/:id/submit", submitLimiter, requireParticipant, async (req, res) => {
  const parsed = submitSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload", details: parsed.error.errors });
  const s = (req as any).supervision;
  if (s.state !== "open") return res.status(409).json({ error: "supervision_closed" });

  const { content, anonymous, type } = parsed.data;
  // immediate persist encrypted
  const id = genId("sub-");
  const authorId = anonymous || s.anonymousSubmissions ? null : req.user!.id;
  const encrypted = encrypt(content);
  const sub = { id, supervisionId: s.id, authorId, content: encrypted, type, createdAt: nowIso() };
  DB.submissions.set(id, sub);
  audit(s.id, req.user!.id, "submit", { submissionId: id, type, anonymous: !!anonymous });

  res.status(201).json({ id, createdAt: sub.createdAt });
});

// GET /supervision/:id/summary
router.get("/:id/summary", requireParticipant, (req, res) => {
  const s = (req as any).supervision;
  const submissions = Array.from(DB.submissions.values()).filter((x: any) => x.supervisionId === s.id);
  // anonymize content and optionally decrypt for authorized viewers
  const out = submissions.map((x: any) => {
    const sanitized = anonymizeSubmission(x, s);
    return {
      id: x.id,
      type: x.type,
      contentPreview: x.content ? decrypt(x.content).slice(0, 400) : null,
      authorId: sanitized.authorId,
      createdAt: x.createdAt,
    };
  });
  audit(s.id, req.user!.id, "view_summary", { count: out.length });
  res.json({ id: s.id, title: s.title, submissions: out });
});

// POST /supervision/:id/close
router.post("/:id/close", requireParticipant, requireModerator, (req, res) => {
  const parsed = closeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload", details: parsed.error.errors });
  const s = (req as any).supervision;
  if (s.state === "closed") return res.status(409).json({ error: "already_closed" });

  const consensus = computeConsensus(s);
  if (!consensus.allAgree) return res.status(400).json({ error: "consensus_not_reached", consensus });

  s.state = "closed";
  s.updatedAt = nowIso();
  DB.supervisions.set(s.id, s);
  audit(s.id, req.user!.id, "close", { consensus, reason: parsed.data.reason || null });
  res.json({ ok: true, closedAt: s.updatedAt, consensus });
});

const actionSchema = z.object({
  description: z.string().min(1).max(1000),
  ownerId: z.string().optional(),
  dueDate: z.string().optional(),
});

// POST /supervision/:id/actions - create action item
router.post("/:id/actions", requireParticipant, (req, res) => {
  const body = actionSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "invalid_payload", details: body.error.errors });
  const s = (req as any).supervision;
  const action = { id: genId("act-"), supervisionId: s.id, description: body.data.description, ownerId: body.data.ownerId || null, dueDate: body.data.dueDate || null, status: "open", createdAt: nowIso() };
  s.actions = s.actions || [];
  s.actions.push(action);
  DB.supervisions.set(s.id, s);
  audit(s.id, req.user!.id, "create_action", { actionId: action.id, owner: action.ownerId ? maskId(action.ownerId) : null });
  res.status(201).json({ id: action.id });
});

const pauseSchema = z.object({ reason: z.string().optional() });

router.post("/:id/pause", requireParticipant, requireModerator, (req, res) => {
  const parsed = pauseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload", details: parsed.error.errors });
  const s = (req as any).supervision;
  if (s.state !== "open") return res.status(409).json({ error: "cannot_pause" });
  s.state = "paused";
  s.updatedAt = nowIso();
  DB.supervisions.set(s.id, s);
  audit(s.id, req.user!.id, "pause", { reason: parsed.data.reason || null });
  res.json({ ok: true, pausedAt: s.updatedAt });
});

export default router;

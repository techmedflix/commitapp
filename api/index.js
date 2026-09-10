// server/app.ts
import express from "express";
import cors from "cors";

// server/auth.ts
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
var JWT_SECRET = process.env.JWT_SECRET || "commit-dev-secret-change-me";
var GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || "";
var googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;
function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: "30d" });
}
function verifyToken(token) {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return { id: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}
async function verifyGoogleIdToken(credential) {
  if (!googleClient || !GOOGLE_CLIENT_ID) {
    throw new Error("GOOGLE_CLIENT_ID is not configured");
  }
  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: GOOGLE_CLIENT_ID
  });
  const payload = ticket.getPayload();
  if (!payload?.email) {
    throw new Error("Invalid Google token");
  }
  return {
    email: payload.email.toLowerCase(),
    name: payload.name || payload.given_name || "Google User",
    picture: payload.picture,
    sub: payload.sub
  };
}
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : void 0;
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const user = verifyToken(token);
  if (!user) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }
  req.user = user;
  next();
}

// server/mappers.ts
function mapUser(row, opts) {
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    avatar: row.avatar ? String(row.avatar) : void 0,
    role: opts?.role ?? "Member",
    orgId: opts?.orgId !== void 0 ? opts.orgId : row.active_org_id ? String(row.active_org_id) : null,
    orgIds: opts?.orgIds ?? []
  };
}
function mapOrg(row) {
  return {
    id: String(row.id),
    name: String(row.name),
    inviteCode: String(row.invite_code),
    adminId: String(row.admin_id),
    createdAt: new Date(String(row.created_at)).toISOString()
  };
}
function mapJoinRequest(row) {
  return {
    id: String(row.id),
    orgId: String(row.org_id),
    userId: String(row.user_id),
    userName: String(row.user_name ?? ""),
    userEmail: String(row.user_email ?? ""),
    userAvatar: String(row.user_avatar ?? ""),
    status: row.status,
    createdAt: new Date(String(row.created_at)).toISOString()
  };
}
function mapTask(row) {
  const dateOnly = (v) => v ? String(v).slice(0, 10) : void 0;
  return {
    id: String(row.id),
    orgId: String(row.org_id),
    taskNumber: String(row.task_number),
    title: String(row.title),
    note: row.note ? String(row.note) : void 0,
    creatorId: String(row.creator_id),
    assigneeId: String(row.assignee_id),
    requestedDeadline: dateOnly(row.requested_deadline),
    assigneeEta: dateOnly(row.assignee_eta),
    status: row.status,
    blockedReason: row.blocked_reason ? String(row.blocked_reason) : void 0,
    completionComment: row.completion_comment ? String(row.completion_comment) : void 0,
    referenceUrl: row.reference_url ? String(row.reference_url) : void 0,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    completedAt: row.completed_at ? new Date(String(row.completed_at)).toISOString() : void 0,
    lastNudgedAt: row.last_nudged_at ? new Date(String(row.last_nudged_at)).toISOString() : void 0
  };
}
function mapComment(row) {
  return {
    id: String(row.id),
    taskId: String(row.task_id),
    userId: String(row.user_id),
    text: String(row.text),
    createdAt: new Date(String(row.created_at)).toISOString()
  };
}
function mapActivity(row) {
  return {
    id: String(row.id),
    taskId: String(row.task_id),
    userId: String(row.user_id),
    type: row.type,
    details: String(row.details),
    createdAt: new Date(String(row.created_at)).toISOString()
  };
}
function mapNotification(row) {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    title: String(row.title),
    message: String(row.message),
    taskId: row.task_id ? String(row.task_id) : "",
    type: row.type,
    read: Boolean(row.read),
    createdAt: new Date(String(row.created_at)).toISOString()
  };
}

// server/queries.ts
import { QueryTypes } from "sequelize";

// server/db.ts
import { Sequelize } from "sequelize";
import dotenv from "dotenv";
dotenv.config();
var databaseUrl = process.env.DATABASE_URL || process.env.pg_connStr1 || "";
if (!databaseUrl) {
  throw new Error("DATABASE_URL (or pg_connStr1) is required in .env");
}
var useSsl = process.env.DATABASE_SSL === "1" || process.env.DATABASE_SSL === "true" || /sslmode=require/i.test(databaseUrl);
var sequelize = new Sequelize(databaseUrl, {
  dialect: "postgres",
  logging: process.env.SQL_LOG === "1" ? console.log : false,
  dialectOptions: useSsl ? {
    ssl: {
      require: true,
      rejectUnauthorized: process.env.DATABASE_SSL_STRICT === "1"
    }
  } : void 0
});
async function assertDb() {
  await sequelize.authenticate();
}

// server/queries.ts
async function sqlSelect(query, bind = []) {
  return sequelize.query(query, {
    bind,
    type: QueryTypes.SELECT
  });
}
async function sqlExecute(query, bind = []) {
  return sequelize.query(query, { bind });
}
async function getMembership(userId, orgId) {
  const rows = await sqlSelect(
    `SELECT role FROM org_memberships WHERE user_id = $1::uuid AND org_id = $2::uuid LIMIT 1`,
    [userId, orgId]
  );
  return rows[0] ?? null;
}
async function requireMembership(userId, orgId) {
  const m = await getMembership(userId, orgId);
  if (!m) throw Object.assign(new Error("Not a member of this organization"), { status: 403 });
  return m;
}
async function requireAdmin(userId, orgId) {
  const m = await requireMembership(userId, orgId);
  if (m.role !== "Workspace Admin") {
    throw Object.assign(new Error("Admin access required"), { status: 403 });
  }
  return m;
}
async function loadUserBundle(userId) {
  const userRows = await sqlSelect(`SELECT * FROM users WHERE id = $1::uuid`, [userId]);
  if (!userRows[0]) return null;
  const memberships = await sqlSelect(
    `SELECT org_id, role FROM org_memberships WHERE user_id = $1::uuid`,
    [userId]
  );
  const orgIds = memberships.map((m) => m.org_id);
  const activeOrgId = userRows[0].active_org_id ? String(userRows[0].active_org_id) : orgIds[0] || null;
  const activeRole = memberships.find((m) => m.org_id === activeOrgId)?.role ?? memberships[0]?.role ?? "Member";
  const user = mapUser(userRows[0], {
    role: activeRole,
    orgIds,
    orgId: activeOrgId
  });
  let organizations = [];
  if (orgIds.length) {
    const orgRows = await sqlSelect(
      `SELECT * FROM organizations WHERE id = ANY($1::uuid[]) ORDER BY created_at ASC`,
      [orgIds]
    );
    organizations = orgRows.map(mapOrg);
  }
  const activeOrg = organizations.find((o) => o.id === activeOrgId) || null;
  let users = [];
  let joinRequests = [];
  let tasks = [];
  let comments = [];
  let activities = [];
  if (activeOrgId) {
    const memberRows = await sqlSelect(
      `SELECT u.*, m.role
       FROM org_memberships m
       JOIN users u ON u.id = m.user_id
       WHERE m.org_id = $1::uuid
       ORDER BY u.name ASC`,
      [activeOrgId]
    );
    users = memberRows.map(
      (row) => mapUser(row, {
        role: row.role,
        orgIds: [activeOrgId],
        orgId: activeOrgId
      })
    );
    const jrRows = await sqlSelect(
      `SELECT jr.*, u.name AS user_name, u.email AS user_email, u.avatar AS user_avatar
       FROM join_requests jr
       JOIN users u ON u.id = jr.user_id
       WHERE jr.org_id = $1::uuid
       ORDER BY jr.created_at DESC`,
      [activeOrgId]
    );
    joinRequests = jrRows.map(mapJoinRequest);
    const taskRows = await sqlSelect(
      `SELECT * FROM tasks WHERE org_id = $1::uuid ORDER BY created_at DESC`,
      [activeOrgId]
    );
    tasks = taskRows.map(mapTask);
    const taskIds = tasks.map((t) => t.id);
    if (taskIds.length) {
      const commentRows = await sqlSelect(
        `SELECT * FROM comments WHERE task_id = ANY($1::uuid[]) ORDER BY created_at ASC`,
        [taskIds]
      );
      comments = commentRows.map(mapComment);
      const activityRows = await sqlSelect(
        `SELECT * FROM activities WHERE task_id = ANY($1::uuid[]) ORDER BY created_at DESC`,
        [taskIds]
      );
      activities = activityRows.map(mapActivity);
    }
  }
  const notifRows = await sqlSelect(
    `SELECT * FROM notifications WHERE user_id = $1::uuid ORDER BY created_at DESC LIMIT 200`,
    [userId]
  );
  const notifications = notifRows.map(mapNotification);
  return {
    user,
    organizations,
    activeOrg,
    users,
    joinRequests,
    tasks,
    comments,
    activities,
    notifications
  };
}
async function insertActivity(taskId, userId, type, details) {
  await sqlExecute(
    `INSERT INTO activities (task_id, user_id, type, details)
     VALUES ($1::uuid, $2::uuid, $3, $4)`,
    [taskId, userId, type, details]
  );
}
async function insertNotification(userId, title, message, taskId, type) {
  await sqlExecute(
    `INSERT INTO notifications (user_id, title, message, task_id, type)
     VALUES ($1::uuid, $2, $3, $4::uuid, $5)`,
    [userId, title, message, taskId, type]
  );
}
function makeInviteCode(orgName) {
  const slug = orgName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const randomCode = Math.floor(1e3 + Math.random() * 9e3).toString();
  return `${slug || "org"}-${randomCode}`;
}
async function nextTaskNumber(orgId) {
  const now = /* @__PURE__ */ new Date();
  const yearYy = Number(String(now.getFullYear()).slice(-2));
  const month = now.getMonth() + 1;
  const rows = await sqlSelect(
    `INSERT INTO task_sequences (org_id, year_yy, month, last_seq)
     VALUES ($1::uuid, $2, $3, 101)
     ON CONFLICT (org_id, year_yy, month)
     DO UPDATE SET last_seq = task_sequences.last_seq + 1
     RETURNING last_seq`,
    [orgId, yearYy, month]
  );
  const seq = rows[0]?.last_seq ?? 101;
  return `${yearYy}/${month}/${seq}`;
}

// server/app.ts
function createApp() {
  const app2 = express();
  app2.use(cors({ origin: true, credentials: true }));
  app2.use(express.json());
  app2.get("/api/health", async (_req, res) => {
    try {
      await sqlSelect("SELECT 1 AS ok");
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });
  app2.post("/api/auth/google", async (req, res) => {
    try {
      const { credential, name, avatar } = req.body;
      if (!credential) {
        res.status(400).json({ error: "credential required" });
        return;
      }
      const profile = await verifyGoogleIdToken(credential);
      const displayName = (name?.trim() || profile.name).trim();
      const avatarUrl = avatar || profile.picture || null;
      const existing = await sqlSelect(
        `SELECT * FROM users WHERE email = $1 OR google_sub = $2 LIMIT 1`,
        [profile.email, profile.sub]
      );
      let userId;
      if (existing[0]) {
        await sqlExecute(
          `UPDATE users
           SET name = $1, avatar = COALESCE($2, avatar), google_sub = COALESCE(google_sub, $3)
           WHERE id = $4::uuid`,
          [displayName, avatarUrl, profile.sub, existing[0].id]
        );
        userId = String(existing[0].id);
      } else {
        const created = await sqlSelect(
          `INSERT INTO users (email, name, avatar, google_sub)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [profile.email, displayName, avatarUrl, profile.sub]
        );
        userId = String(created[0].id);
      }
      const bundle = await loadUserBundle(userId);
      const token = signToken({ id: userId, email: profile.email });
      res.json({ token, ...bundle });
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: err instanceof Error ? err.message : "Auth failed" });
    }
  });
  app2.post("/api/auth/email", async (req, res) => {
    try {
      const { email, name, avatar } = req.body;
      if (!email?.trim() || !name?.trim()) {
        res.status(400).json({ error: "email and name required" });
        return;
      }
      const cleanEmail = email.trim().toLowerCase();
      const existing = await sqlSelect(`SELECT * FROM users WHERE email = $1 LIMIT 1`, [cleanEmail]);
      let userId;
      if (existing[0]) {
        await sqlExecute(
          `UPDATE users SET name = $1, avatar = COALESCE($2, avatar) WHERE id = $3::uuid`,
          [name.trim(), avatar || null, existing[0].id]
        );
        userId = String(existing[0].id);
      } else {
        const created = await sqlSelect(
          `INSERT INTO users (email, name, avatar)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [cleanEmail, name.trim(), avatar || null]
        );
        userId = String(created[0].id);
      }
      const bundle = await loadUserBundle(userId);
      const token = signToken({ id: userId, email: cleanEmail });
      res.json({ token, ...bundle });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Sign-in failed" });
    }
  });
  app2.get("/api/bootstrap", requireAuth, async (req, res) => {
    try {
      const bundle = await loadUserBundle(req.user.id);
      if (!bundle) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      res.json(bundle);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to load bootstrap" });
    }
  });
  app2.get("/api/orgs/by-invite/:code", async (req, res) => {
    try {
      const rows = await sqlSelect(
        `SELECT * FROM organizations WHERE lower(invite_code) = lower($1) LIMIT 1`,
        [req.params.code]
      );
      if (!rows[0]) {
        res.status(404).json({ error: "Invite not found" });
        return;
      }
      res.json({ organization: mapOrg(rows[0]) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Lookup failed" });
    }
  });
  app2.post("/api/orgs", requireAuth, async (req, res) => {
    try {
      const name = String(req.body?.name || "").trim();
      if (!name) {
        res.status(400).json({ error: "name required" });
        return;
      }
      const inviteCode = makeInviteCode(name);
      const userId = req.user.id;
      const orgRows = await sqlSelect(
        `INSERT INTO organizations (name, invite_code, admin_id)
         VALUES ($1, $2, $3::uuid)
         RETURNING *`,
        [name, inviteCode, userId]
      );
      const org = mapOrg(orgRows[0]);
      await sqlExecute(
        `INSERT INTO org_memberships (user_id, org_id, role)
         VALUES ($1::uuid, $2::uuid, 'Workspace Admin')
         ON CONFLICT (user_id, org_id) DO UPDATE SET role = 'Workspace Admin'`,
        [userId, org.id]
      );
      await sqlExecute(`UPDATE users SET active_org_id = $1::uuid WHERE id = $2::uuid`, [
        org.id,
        userId
      ]);
      const bundle = await loadUserBundle(userId);
      res.status(201).json(bundle);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to create organization" });
    }
  });
  app2.post("/api/orgs/join", requireAuth, async (req, res) => {
    try {
      const inviteCode = String(req.body?.inviteCode || "").trim();
      if (!inviteCode) {
        res.status(400).json({ error: "inviteCode required" });
        return;
      }
      const orgRows = await sqlSelect(
        `SELECT * FROM organizations WHERE lower(invite_code) = lower($1) LIMIT 1`,
        [inviteCode]
      );
      if (!orgRows[0]) {
        res.status(404).json({ success: false, message: "Invalid or expired invite link." });
        return;
      }
      const org = mapOrg(orgRows[0]);
      const userId = req.user.id;
      const membership = await getMembership(userId, org.id);
      if (membership) {
        await sqlExecute(`UPDATE users SET active_org_id = $1::uuid WHERE id = $2::uuid`, [
          org.id,
          userId
        ]);
        const bundle = await loadUserBundle(userId);
        res.json({
          success: true,
          message: `You are already a member of ${org.name}.`,
          org,
          ...bundle
        });
        return;
      }
      const pending = await sqlSelect(
        `SELECT * FROM join_requests
         WHERE org_id = $1::uuid AND user_id = $2::uuid AND status = 'pending' LIMIT 1`,
        [org.id, userId]
      );
      if (pending[0]) {
        res.json({
          success: true,
          message: `Your join request for ${org.name} is already pending Admin approval.`,
          org
        });
        return;
      }
      await sqlExecute(
        `INSERT INTO join_requests (org_id, user_id, status) VALUES ($1::uuid, $2::uuid, 'pending')`,
        [org.id, userId]
      );
      const userRows = await sqlSelect(`SELECT name FROM users WHERE id = $1::uuid`, [userId]);
      await insertNotification(
        org.adminId,
        "New Join Request",
        `${userRows[0]?.name || "Someone"} requested to join ${org.name}.`,
        null,
        "assigned"
      );
      res.json({
        success: true,
        message: "Join request submitted! Waiting for Admin approval.",
        org
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to submit join request" });
    }
  });
  app2.post("/api/orgs/:orgId/switch", requireAuth, async (req, res) => {
    try {
      const orgId = req.params.orgId;
      await requireMembership(req.user.id, orgId);
      await sqlExecute(`UPDATE users SET active_org_id = $1::uuid WHERE id = $2::uuid`, [
        orgId,
        req.user.id
      ]);
      const bundle = await loadUserBundle(req.user.id);
      res.json(bundle);
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ error: err instanceof Error ? err.message : "Switch failed" });
    }
  });
  app2.post("/api/orgs/:orgId/regenerate-invite", requireAuth, async (req, res) => {
    try {
      const orgId = req.params.orgId;
      await requireAdmin(req.user.id, orgId);
      const orgRows = await sqlSelect(`SELECT * FROM organizations WHERE id = $1::uuid`, [orgId]);
      if (!orgRows[0]) {
        res.status(404).json({ error: "Org not found" });
        return;
      }
      const newCode = makeInviteCode(String(orgRows[0].name));
      const updated = await sqlSelect(
        `UPDATE organizations SET invite_code = $1 WHERE id = $2::uuid RETURNING *`,
        [newCode, orgId]
      );
      res.json({ inviteCode: newCode, organization: mapOrg(updated[0]) });
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ error: err instanceof Error ? err.message : "Failed" });
    }
  });
  app2.post("/api/join-requests/:id/approve", requireAuth, async (req, res) => {
    try {
      const rows = await sqlSelect(`SELECT * FROM join_requests WHERE id = $1::uuid`, [
        req.params.id
      ]);
      if (!rows[0]) {
        res.status(404).json({ error: "Request not found" });
        return;
      }
      const orgId = String(rows[0].org_id);
      const targetUserId = String(rows[0].user_id);
      await requireAdmin(req.user.id, orgId);
      await sqlExecute(
        `UPDATE join_requests SET status = 'approved' WHERE id = $1::uuid`,
        [req.params.id]
      );
      await sqlExecute(
        `INSERT INTO org_memberships (user_id, org_id, role)
         VALUES ($1::uuid, $2::uuid, 'Member')
         ON CONFLICT DO NOTHING`,
        [targetUserId, orgId]
      );
      await sqlExecute(
        `UPDATE users SET active_org_id = COALESCE(active_org_id, $1::uuid) WHERE id = $2::uuid`,
        [orgId, targetUserId]
      );
      const bundle = await loadUserBundle(req.user.id);
      res.json(bundle);
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ error: err instanceof Error ? err.message : "Failed" });
    }
  });
  app2.post("/api/join-requests/:id/reject", requireAuth, async (req, res) => {
    try {
      const rows = await sqlSelect(`SELECT * FROM join_requests WHERE id = $1::uuid`, [
        req.params.id
      ]);
      if (!rows[0]) {
        res.status(404).json({ error: "Request not found" });
        return;
      }
      await requireAdmin(req.user.id, String(rows[0].org_id));
      await sqlExecute(`UPDATE join_requests SET status = 'rejected' WHERE id = $1::uuid`, [
        req.params.id
      ]);
      const bundle = await loadUserBundle(req.user.id);
      res.json(bundle);
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ error: err instanceof Error ? err.message : "Failed" });
    }
  });
  app2.post("/api/orgs/:orgId/members", requireAuth, async (req, res) => {
    try {
      const orgId = req.params.orgId;
      await requireAdmin(req.user.id, orgId);
      const { name, email, role } = req.body;
      if (!name?.trim() || !email?.trim()) {
        res.status(400).json({ error: "name and email required" });
        return;
      }
      const cleanEmail = email.trim().toLowerCase();
      const memberRole = role === "Workspace Admin" ? "Workspace Admin" : "Member";
      let userRows = await sqlSelect(`SELECT * FROM users WHERE email = $1 LIMIT 1`, [cleanEmail]);
      if (!userRows[0]) {
        userRows = await sqlSelect(
          `INSERT INTO users (email, name, avatar, active_org_id)
           VALUES ($1, $2, $3, $4::uuid)
           RETURNING *`,
          [
            cleanEmail,
            name.trim(),
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
            orgId
          ]
        );
      }
      await sqlExecute(
        `INSERT INTO org_memberships (user_id, org_id, role)
         VALUES ($1::uuid, $2::uuid, $3)
         ON CONFLICT (user_id, org_id) DO UPDATE SET role = EXCLUDED.role`,
        [userRows[0].id, orgId, memberRole]
      );
      const bundle = await loadUserBundle(req.user.id);
      res.status(201).json({
        user: mapUser(userRows[0], {
          role: memberRole,
          orgId,
          orgIds: [orgId]
        }),
        ...bundle
      });
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ error: err instanceof Error ? err.message : "Failed" });
    }
  });
  async function getTaskForUser(taskId, userId) {
    const rows = await sqlSelect(`SELECT * FROM tasks WHERE id = $1::uuid`, [taskId]);
    if (!rows[0]) throw Object.assign(new Error("Task not found"), { status: 404 });
    await requireMembership(userId, String(rows[0].org_id));
    return mapTask(rows[0]);
  }
  app2.post("/api/tasks", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const bundlePeek = await loadUserBundle(userId);
      const orgId = bundlePeek?.activeOrg?.id;
      if (!orgId) {
        res.status(400).json({ error: "No active organization" });
        return;
      }
      await requireMembership(userId, orgId);
      const { title, assigneeId, requestedDeadline, note, referenceUrl } = req.body;
      if (!title?.trim() || !assigneeId) {
        res.status(400).json({ error: "title and assigneeId required" });
        return;
      }
      const taskNumber = await nextTaskNumber(orgId);
      const inserted = await sqlSelect(
        `INSERT INTO tasks (
           org_id, task_number, title, note, creator_id, assignee_id,
           requested_deadline, reference_url, status
         ) VALUES (
           $1::uuid, $2, $3, $4, $5::uuid, $6::uuid, $7::date, $8, 'awaiting_acknowledgement'
         ) RETURNING *`,
        [
          orgId,
          taskNumber,
          title.trim(),
          note?.trim() || null,
          userId,
          assigneeId,
          requestedDeadline || null,
          referenceUrl?.trim() || null
        ]
      );
      const task = mapTask(inserted[0]);
      const doerRows = await sqlSelect(`SELECT name FROM users WHERE id = $1::uuid`, [assigneeId]);
      const doerName = String(doerRows[0]?.name || "Someone");
      await insertActivity(
        task.id,
        userId,
        "created",
        `Task created for Doer: ${assigneeId === userId ? "themselves" : doerName}`
      );
      if (assigneeId !== userId) {
        const me = await sqlSelect(`SELECT name FROM users WHERE id = $1::uuid`, [userId]);
        await insertNotification(
          assigneeId,
          "New Task Assigned",
          `${me[0]?.name || "Someone"} assigned you "${task.title}".`,
          task.id,
          "assigned"
        );
      }
      const bundle = await loadUserBundle(userId);
      res.status(201).json({ task, ...bundle });
    } catch (err) {
      console.error(err);
      const status = err.status || 500;
      res.status(status).json({ error: err instanceof Error ? err.message : "Failed" });
    }
  });
  app2.post("/api/tasks/:id/accept", requireAuth, async (req, res) => {
    try {
      const task = await getTaskForUser(req.params.id, req.user.id);
      const eta = req.body?.eta ? String(req.body.eta) : null;
      await sqlExecute(
        `UPDATE tasks
         SET status = 'accepted',
             assignee_eta = COALESCE($1::date, assignee_eta),
             updated_at = NOW()
         WHERE id = $2::uuid`,
        [eta, task.id]
      );
      await insertActivity(
        task.id,
        req.user.id,
        "accepted",
        eta ? `Accepted task with Doer ETA: ${eta}` : "Accepted task"
      );
      if (task.creatorId !== req.user.id) {
        const me = await sqlSelect(`SELECT name FROM users WHERE id = $1::uuid`, [req.user.id]);
        await insertNotification(
          task.creatorId,
          "Task Accepted",
          `${me[0]?.name || "Someone"} accepted "${task.title}".`,
          task.id,
          "modified"
        );
      }
      res.json(await loadUserBundle(req.user.id));
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ error: err instanceof Error ? err.message : "Failed" });
    }
  });
  app2.post("/api/tasks/:id/start", requireAuth, async (req, res) => {
    try {
      const task = await getTaskForUser(req.params.id, req.user.id);
      await sqlExecute(
        `UPDATE tasks SET status = 'in_progress', updated_at = NOW() WHERE id = $1::uuid`,
        [task.id]
      );
      await insertActivity(task.id, req.user.id, "status_changed", "Changed status to In Progress");
      res.json(await loadUserBundle(req.user.id));
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ error: err instanceof Error ? err.message : "Failed" });
    }
  });
  app2.post("/api/tasks/:id/block", requireAuth, async (req, res) => {
    try {
      const task = await getTaskForUser(req.params.id, req.user.id);
      const reason = String(req.body?.reason || "").trim();
      if (!reason) {
        res.status(400).json({ error: "reason required" });
        return;
      }
      await sqlExecute(
        `UPDATE tasks
         SET status = 'blocked', blocked_reason = $1, updated_at = NOW()
         WHERE id = $2::uuid`,
        [reason, task.id]
      );
      await insertActivity(task.id, req.user.id, "blocked", `Marked blocked: ${reason}`);
      if (task.creatorId !== req.user.id) {
        const me = await sqlSelect(`SELECT name FROM users WHERE id = $1::uuid`, [req.user.id]);
        await insertNotification(
          task.creatorId,
          "Task Blocked",
          `${me[0]?.name || "Someone"} marked "${task.title}" as blocked. Reason: ${reason}`,
          task.id,
          "blocked"
        );
      }
      res.json(await loadUserBundle(req.user.id));
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ error: err instanceof Error ? err.message : "Failed" });
    }
  });
  app2.post("/api/tasks/:id/unblock", requireAuth, async (req, res) => {
    try {
      const task = await getTaskForUser(req.params.id, req.user.id);
      await sqlExecute(
        `UPDATE tasks
         SET status = 'in_progress', blocked_reason = NULL, updated_at = NOW()
         WHERE id = $1::uuid`,
        [task.id]
      );
      await insertActivity(
        task.id,
        req.user.id,
        "unblocked",
        "Unblocked task, returned to In Progress"
      );
      res.json(await loadUserBundle(req.user.id));
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ error: err instanceof Error ? err.message : "Failed" });
    }
  });
  app2.post("/api/tasks/:id/complete", requireAuth, async (req, res) => {
    try {
      const task = await getTaskForUser(req.params.id, req.user.id);
      const comment = req.body?.comment ? String(req.body.comment) : null;
      await sqlExecute(
        `UPDATE tasks
         SET status = 'completed',
             completion_comment = COALESCE($1, completion_comment),
             completed_at = NOW(),
             updated_at = NOW()
         WHERE id = $2::uuid`,
        [comment, task.id]
      );
      await insertActivity(task.id, req.user.id, "completed", "Marked task as completed");
      const notifyUserId = task.creatorId === req.user.id ? task.assigneeId : task.creatorId;
      if (notifyUserId !== req.user.id) {
        const me = await sqlSelect(`SELECT name FROM users WHERE id = $1::uuid`, [req.user.id]);
        await insertNotification(
          notifyUserId,
          "Task Completed",
          `${me[0]?.name || "Someone"} completed "${task.title}".`,
          task.id,
          "completed"
        );
      }
      res.json(await loadUserBundle(req.user.id));
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ error: err instanceof Error ? err.message : "Failed" });
    }
  });
  app2.post("/api/tasks/:id/nudge", requireAuth, async (req, res) => {
    try {
      const task = await getTaskForUser(req.params.id, req.user.id);
      if (task.lastNudgedAt) {
        const diffMinutes = (Date.now() - new Date(task.lastNudgedAt).getTime()) / (1e3 * 60);
        if (diffMinutes < 5) {
          res.status(429).json({
            success: false,
            message: "Nudged recently. Please wait a few minutes before nudging again."
          });
          return;
        }
      }
      await sqlExecute(
        `UPDATE tasks SET last_nudged_at = NOW(), updated_at = NOW() WHERE id = $1::uuid`,
        [task.id]
      );
      await insertActivity(
        task.id,
        req.user.id,
        "nudged",
        "Creator sent a nudge reminder to Doer"
      );
      const me = await sqlSelect(`SELECT name FROM users WHERE id = $1::uuid`, [req.user.id]);
      await insertNotification(
        task.assigneeId,
        "Nudge Reminder",
        `${me[0]?.name || "Someone"} nudged you on task "${task.title}".`,
        task.id,
        "nudged"
      );
      res.json({
        success: true,
        message: "Nudge sent successfully!",
        ...await loadUserBundle(req.user.id)
      });
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({
        success: false,
        message: err instanceof Error ? err.message : "Failed"
      });
    }
  });
  app2.patch("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const task = await getTaskForUser(req.params.id, req.user.id);
      const updates = req.body;
      await sqlExecute(
        `UPDATE tasks SET
           title = COALESCE($1, title),
           note = COALESCE($2, note),
           assignee_id = COALESCE($3::uuid, assignee_id),
           requested_deadline = COALESCE($4::date, requested_deadline),
           assignee_eta = COALESCE($5::date, assignee_eta),
           reference_url = COALESCE($6, reference_url),
           updated_at = NOW()
         WHERE id = $7::uuid`,
        [
          updates.title ?? null,
          updates.note ?? null,
          updates.assigneeId ?? null,
          updates.requestedDeadline ?? null,
          updates.assigneeEta ?? null,
          updates.referenceUrl ?? null,
          task.id
        ]
      );
      res.json(await loadUserBundle(req.user.id));
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ error: err instanceof Error ? err.message : "Failed" });
    }
  });
  app2.post("/api/tasks/:id/comments", requireAuth, async (req, res) => {
    try {
      const task = await getTaskForUser(req.params.id, req.user.id);
      const text = String(req.body?.text || "").trim();
      if (!text) {
        res.status(400).json({ error: "text required" });
        return;
      }
      await sqlExecute(
        `INSERT INTO comments (task_id, user_id, text) VALUES ($1::uuid, $2::uuid, $3)`,
        [task.id, req.user.id, text]
      );
      await insertActivity(
        task.id,
        req.user.id,
        "comment_added",
        `Added comment: "${text.substring(0, 30)}..."`
      );
      res.json(await loadUserBundle(req.user.id));
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ error: err instanceof Error ? err.message : "Failed" });
    }
  });
  app2.post("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      await sqlExecute(
        `UPDATE notifications SET read = TRUE WHERE id = $1::uuid AND user_id = $2::uuid`,
        [req.params.id, req.user.id]
      );
      res.json(await loadUserBundle(req.user.id));
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  });
  app2.post("/api/notifications/read-all", requireAuth, async (req, res) => {
    try {
      await sqlExecute(`UPDATE notifications SET read = TRUE WHERE user_id = $1::uuid`, [
        req.user.id
      ]);
      res.json(await loadUserBundle(req.user.id));
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  });
  app2.post("/api/auth/logout", requireAuth, async (_req, res) => {
    res.json({ ok: true });
  });
  return app2;
}

// server/vercel-handler.ts
var app = createApp();
var dbReady = null;
function ensureDb() {
  if (!dbReady) {
    dbReady = assertDb().catch((err) => {
      dbReady = null;
      throw err;
    });
  }
  return dbReady;
}
async function handler(req, res) {
  await ensureDb();
  return app(req, res);
}
export {
  handler as default
};

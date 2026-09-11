import express from 'express';
import cors from 'cors';
import {
  ALLOWED_GOOGLE_DOMAIN,
  isAllowedGoogleEmail,
  requireAuth,
  signToken,
  verifyGoogleIdToken,
  type AuthedRequest,
} from './auth.ts';
import { mapOrg, mapTask, mapUser } from './mappers.ts';
import {
  getMembership,
  insertActivity,
  insertNotification,
  loadUserBundle,
  makeInviteCode,
  nextTaskNumber,
  requireAdmin,
  requireMembership,
  sqlExecute,
  sqlSelect,
} from './queries.ts';
import type { Task, UserRole } from '../src/types/index.ts';

export function createApp() {
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());

  app.get('/api/health', async (_req, res) => {
    try {
      await sqlSelect('SELECT 1 AS ok');
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // --- Auth ---
  app.post('/api/auth/google', async (req, res) => {
    try {
      const { credential, name, avatar } = req.body as {
        credential?: string;
        name?: string;
        avatar?: string;
      };
      if (!credential) {
        res.status(400).json({ error: 'credential required' });
        return;
      }
      const profile = await verifyGoogleIdToken(credential);
      const displayName = (name?.trim() || profile.name).trim();
      const avatarUrl = avatar || profile.picture || null;

      const existing = await sqlSelect(
        `SELECT * FROM users WHERE email = $1 OR google_sub = $2 LIMIT 1`,
        [profile.email, profile.sub]
      );

      let userId: string;
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
      res.status(400).json({ error: err instanceof Error ? err.message : 'Auth failed' });
    }
  });

  // Dev/email fallback matching current UI flow (no Google credential)
  app.post('/api/auth/email', async (req, res) => {
    try {
      const { email, name, avatar } = req.body as {
        email?: string;
        name?: string;
        avatar?: string;
      };
      if (!email?.trim() || !name?.trim()) {
        res.status(400).json({ error: 'email and name required' });
        return;
      }
      const cleanEmail = email.trim().toLowerCase();
      if (!isAllowedGoogleEmail(cleanEmail)) {
        res.status(403).json({
          error: `Sign-in is restricted to @${ALLOWED_GOOGLE_DOMAIN} Google accounts`,
        });
        return;
      }
      const existing = await sqlSelect(`SELECT * FROM users WHERE email = $1 LIMIT 1`, [cleanEmail]);

      let userId: string;
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
      res.status(500).json({ error: 'Sign-in failed' });
    }
  });

  app.get('/api/bootstrap', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const bundle = await loadUserBundle(req.user!.id);
      if (!bundle) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      res.json(bundle);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load bootstrap' });
    }
  });

  // --- Orgs ---
  app.get('/api/orgs/by-invite/:code', async (req, res) => {
    try {
      const rows = await sqlSelect(
        `SELECT * FROM organizations WHERE lower(invite_code) = lower($1) LIMIT 1`,
        [req.params.code]
      );
      if (!rows[0]) {
        res.status(404).json({ error: 'Invite not found' });
        return;
      }
      res.json({ organization: mapOrg(rows[0]) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Lookup failed' });
    }
  });

  app.post('/api/orgs', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const name = String(req.body?.name || '').trim();
      if (!name) {
        res.status(400).json({ error: 'name required' });
        return;
      }
      const inviteCode = makeInviteCode(name);
      const userId = req.user!.id;

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
        userId,
      ]);

      const bundle = await loadUserBundle(userId);
      res.status(201).json(bundle);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create organization' });
    }
  });

  app.post('/api/orgs/join', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const inviteCode = String(req.body?.inviteCode || '').trim();
      if (!inviteCode) {
        res.status(400).json({ error: 'inviteCode required' });
        return;
      }
      const orgRows = await sqlSelect(
        `SELECT * FROM organizations WHERE lower(invite_code) = lower($1) LIMIT 1`,
        [inviteCode]
      );
      if (!orgRows[0]) {
        res.status(404).json({ success: false, message: 'Invalid or expired invite link.' });
        return;
      }
      const org = mapOrg(orgRows[0]);
      const userId = req.user!.id;

      const membership = await getMembership(userId, org.id);
      if (membership) {
        await sqlExecute(`UPDATE users SET active_org_id = $1::uuid WHERE id = $2::uuid`, [
          org.id,
          userId,
        ]);
        const bundle = await loadUserBundle(userId);
        res.json({
          success: true,
          message: `You are already a member of ${org.name}.`,
          org,
          ...bundle,
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
          org,
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
        'New Join Request',
        `${userRows[0]?.name || 'Someone'} requested to join ${org.name}.`,
        null,
        'assigned'
      );

      res.json({
        success: true,
        message: 'Join request submitted! Waiting for Admin approval.',
        org,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Failed to submit join request' });
    }
  });

  app.post('/api/orgs/:orgId/switch', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const orgId = req.params.orgId;
      await requireMembership(req.user!.id, orgId);
      await sqlExecute(`UPDATE users SET active_org_id = $1::uuid WHERE id = $2::uuid`, [
        orgId,
        req.user!.id,
      ]);
      const bundle = await loadUserBundle(req.user!.id);
      res.json(bundle);
    } catch (err) {
      const status = (err as { status?: number }).status || 500;
      res.status(status).json({ error: err instanceof Error ? err.message : 'Switch failed' });
    }
  });

  app.post('/api/orgs/:orgId/regenerate-invite', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const orgId = req.params.orgId;
      await requireAdmin(req.user!.id, orgId);
      const orgRows = await sqlSelect(`SELECT * FROM organizations WHERE id = $1::uuid`, [orgId]);
      if (!orgRows[0]) {
        res.status(404).json({ error: 'Org not found' });
        return;
      }
      const newCode = makeInviteCode(String(orgRows[0].name));
      const updated = await sqlSelect(
        `UPDATE organizations SET invite_code = $1 WHERE id = $2::uuid RETURNING *`,
        [newCode, orgId]
      );
      res.json({ inviteCode: newCode, organization: mapOrg(updated[0]) });
    } catch (err) {
      const status = (err as { status?: number }).status || 500;
      res.status(status).json({ error: err instanceof Error ? err.message : 'Failed' });
    }
  });

  app.post('/api/join-requests/:id/approve', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const rows = await sqlSelect(`SELECT * FROM join_requests WHERE id = $1::uuid`, [
        req.params.id,
      ]);
      if (!rows[0]) {
        res.status(404).json({ error: 'Request not found' });
        return;
      }
      const orgId = String(rows[0].org_id);
      const targetUserId = String(rows[0].user_id);
      await requireAdmin(req.user!.id, orgId);

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

      const bundle = await loadUserBundle(req.user!.id);
      res.json(bundle);
    } catch (err) {
      const status = (err as { status?: number }).status || 500;
      res.status(status).json({ error: err instanceof Error ? err.message : 'Failed' });
    }
  });

  app.post('/api/join-requests/:id/reject', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const rows = await sqlSelect(`SELECT * FROM join_requests WHERE id = $1::uuid`, [
        req.params.id,
      ]);
      if (!rows[0]) {
        res.status(404).json({ error: 'Request not found' });
        return;
      }
      await requireAdmin(req.user!.id, String(rows[0].org_id));
      await sqlExecute(`UPDATE join_requests SET status = 'rejected' WHERE id = $1::uuid`, [
        req.params.id,
      ]);
      const bundle = await loadUserBundle(req.user!.id);
      res.json(bundle);
    } catch (err) {
      const status = (err as { status?: number }).status || 500;
      res.status(status).json({ error: err instanceof Error ? err.message : 'Failed' });
    }
  });

  app.post('/api/orgs/:orgId/members', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const orgId = req.params.orgId;
      await requireAdmin(req.user!.id, orgId);
      const { name, email, role } = req.body as {
        name?: string;
        email?: string;
        role?: UserRole;
      };
      if (!name?.trim() || !email?.trim()) {
        res.status(400).json({ error: 'name and email required' });
        return;
      }
      const cleanEmail = email.trim().toLowerCase();
      const memberRole: UserRole = role === 'Workspace Admin' ? 'Workspace Admin' : 'Member';

      let userRows = await sqlSelect(`SELECT * FROM users WHERE email = $1 LIMIT 1`, [cleanEmail]);
      if (!userRows[0]) {
        userRows = await sqlSelect(
          `INSERT INTO users (email, name, avatar, active_org_id)
           VALUES ($1, $2, $3, $4::uuid)
           RETURNING *`,
          [
            cleanEmail,
            name.trim(),
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
            orgId,
          ]
        );
      }

      await sqlExecute(
        `INSERT INTO org_memberships (user_id, org_id, role)
         VALUES ($1::uuid, $2::uuid, $3)
         ON CONFLICT (user_id, org_id) DO UPDATE SET role = EXCLUDED.role`,
        [userRows[0].id, orgId, memberRole]
      );

      const bundle = await loadUserBundle(req.user!.id);
      res.status(201).json({
        user: mapUser(userRows[0], {
          role: memberRole,
          orgId,
          orgIds: [orgId],
        }),
        ...bundle,
      });
    } catch (err) {
      const status = (err as { status?: number }).status || 500;
      res.status(status).json({ error: err instanceof Error ? err.message : 'Failed' });
    }
  });

  // --- Tasks ---
  async function getTaskForUser(taskId: string, userId: string) {
    const rows = await sqlSelect(`SELECT * FROM tasks WHERE id = $1::uuid`, [taskId]);
    if (!rows[0]) throw Object.assign(new Error('Task not found'), { status: 404 });
    await requireMembership(userId, String(rows[0].org_id));
    return mapTask(rows[0]);
  }

  app.post('/api/tasks', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const userId = req.user!.id;
      const bundlePeek = await loadUserBundle(userId);
      const orgId = bundlePeek?.activeOrg?.id;
      if (!orgId) {
        res.status(400).json({ error: 'No active organization' });
        return;
      }
      await requireMembership(userId, orgId);

      const { title, assigneeId, requestedDeadline, note, referenceUrl } = req.body as {
        title?: string;
        assigneeId?: string;
        requestedDeadline?: string;
        note?: string;
        referenceUrl?: string;
      };
      if (!title?.trim() || !assigneeId) {
        res.status(400).json({ error: 'title and assigneeId required' });
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
          referenceUrl?.trim() || null,
        ]
      );
      const task = mapTask(inserted[0]);

      const doerRows = await sqlSelect(`SELECT name FROM users WHERE id = $1::uuid`, [assigneeId]);
      const doerName = String(doerRows[0]?.name || 'Someone');
      await insertActivity(
        task.id,
        userId,
        'created',
        `Task created for Doer: ${assigneeId === userId ? 'themselves' : doerName}`
      );

      if (assigneeId !== userId) {
        const me = await sqlSelect(`SELECT name FROM users WHERE id = $1::uuid`, [userId]);
        await insertNotification(
          assigneeId,
          'New Task Assigned',
          `${me[0]?.name || 'Someone'} assigned you "${task.title}".`,
          task.id,
          'assigned'
        );
      }

      const bundle = await loadUserBundle(userId);
      res.status(201).json({ task, ...bundle });
    } catch (err) {
      console.error(err);
      const status = (err as { status?: number }).status || 500;
      res.status(status).json({ error: err instanceof Error ? err.message : 'Failed' });
    }
  });

  app.post('/api/tasks/:id/accept', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const task = await getTaskForUser(req.params.id, req.user!.id);
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
        req.user!.id,
        'accepted',
        eta ? `Accepted task with Doer ETA: ${eta}` : 'Accepted task'
      );
      if (task.creatorId !== req.user!.id) {
        const me = await sqlSelect(`SELECT name FROM users WHERE id = $1::uuid`, [req.user!.id]);
        await insertNotification(
          task.creatorId,
          'Task Accepted',
          `${me[0]?.name || 'Someone'} accepted "${task.title}".`,
          task.id,
          'modified'
        );
      }
      res.json(await loadUserBundle(req.user!.id));
    } catch (err) {
      const status = (err as { status?: number }).status || 500;
      res.status(status).json({ error: err instanceof Error ? err.message : 'Failed' });
    }
  });

  app.post('/api/tasks/:id/start', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const task = await getTaskForUser(req.params.id, req.user!.id);
      await sqlExecute(
        `UPDATE tasks SET status = 'in_progress', updated_at = NOW() WHERE id = $1::uuid`,
        [task.id]
      );
      await insertActivity(task.id, req.user!.id, 'status_changed', 'Changed status to In Progress');
      res.json(await loadUserBundle(req.user!.id));
    } catch (err) {
      const status = (err as { status?: number }).status || 500;
      res.status(status).json({ error: err instanceof Error ? err.message : 'Failed' });
    }
  });

  app.post('/api/tasks/:id/block', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const task = await getTaskForUser(req.params.id, req.user!.id);
      const reason = String(req.body?.reason || '').trim();
      if (!reason) {
        res.status(400).json({ error: 'reason required' });
        return;
      }
      await sqlExecute(
        `UPDATE tasks
         SET status = 'blocked', blocked_reason = $1, updated_at = NOW()
         WHERE id = $2::uuid`,
        [reason, task.id]
      );
      await insertActivity(task.id, req.user!.id, 'blocked', `Marked blocked: ${reason}`);
      if (task.creatorId !== req.user!.id) {
        const me = await sqlSelect(`SELECT name FROM users WHERE id = $1::uuid`, [req.user!.id]);
        await insertNotification(
          task.creatorId,
          'Task Blocked',
          `${me[0]?.name || 'Someone'} marked "${task.title}" as blocked. Reason: ${reason}`,
          task.id,
          'blocked'
        );
      }
      res.json(await loadUserBundle(req.user!.id));
    } catch (err) {
      const status = (err as { status?: number }).status || 500;
      res.status(status).json({ error: err instanceof Error ? err.message : 'Failed' });
    }
  });

  app.post('/api/tasks/:id/unblock', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const task = await getTaskForUser(req.params.id, req.user!.id);
      await sqlExecute(
        `UPDATE tasks
         SET status = 'in_progress', blocked_reason = NULL, updated_at = NOW()
         WHERE id = $1::uuid`,
        [task.id]
      );
      await insertActivity(
        task.id,
        req.user!.id,
        'unblocked',
        'Unblocked task, returned to In Progress'
      );
      res.json(await loadUserBundle(req.user!.id));
    } catch (err) {
      const status = (err as { status?: number }).status || 500;
      res.status(status).json({ error: err instanceof Error ? err.message : 'Failed' });
    }
  });

  app.post('/api/tasks/:id/complete', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const task = await getTaskForUser(req.params.id, req.user!.id);
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
      await insertActivity(task.id, req.user!.id, 'completed', 'Marked task as completed');
      const notifyUserId =
        task.creatorId === req.user!.id ? task.assigneeId : task.creatorId;
      if (notifyUserId !== req.user!.id) {
        const me = await sqlSelect(`SELECT name FROM users WHERE id = $1::uuid`, [req.user!.id]);
        await insertNotification(
          notifyUserId,
          'Task Completed',
          `${me[0]?.name || 'Someone'} completed "${task.title}".`,
          task.id,
          'completed'
        );
      }
      res.json(await loadUserBundle(req.user!.id));
    } catch (err) {
      const status = (err as { status?: number }).status || 500;
      res.status(status).json({ error: err instanceof Error ? err.message : 'Failed' });
    }
  });

  app.post('/api/tasks/:id/nudge', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const task = await getTaskForUser(req.params.id, req.user!.id);
      if (task.lastNudgedAt) {
        const diffMinutes =
          (Date.now() - new Date(task.lastNudgedAt).getTime()) / (1000 * 60);
        if (diffMinutes < 5) {
          res.status(429).json({
            success: false,
            message: 'Nudged recently. Please wait a few minutes before nudging again.',
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
        req.user!.id,
        'nudged',
        'Creator sent a nudge reminder to Doer'
      );
      const me = await sqlSelect(`SELECT name FROM users WHERE id = $1::uuid`, [req.user!.id]);
      await insertNotification(
        task.assigneeId,
        'Nudge Reminder',
        `${me[0]?.name || 'Someone'} nudged you on task "${task.title}".`,
        task.id,
        'nudged'
      );
      res.json({
        success: true,
        message: 'Nudge sent successfully!',
        ...(await loadUserBundle(req.user!.id)),
      });
    } catch (err) {
      const status = (err as { status?: number }).status || 500;
      res.status(status).json({
        success: false,
        message: err instanceof Error ? err.message : 'Failed',
      });
    }
  });

  app.patch('/api/tasks/:id', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const task = await getTaskForUser(req.params.id, req.user!.id);
      const updates = req.body as Partial<Task>;
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
          task.id,
        ]
      );
      res.json(await loadUserBundle(req.user!.id));
    } catch (err) {
      const status = (err as { status?: number }).status || 500;
      res.status(status).json({ error: err instanceof Error ? err.message : 'Failed' });
    }
  });

  app.post('/api/tasks/:id/comments', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const task = await getTaskForUser(req.params.id, req.user!.id);
      const text = String(req.body?.text || '').trim();
      if (!text) {
        res.status(400).json({ error: 'text required' });
        return;
      }
      await sqlExecute(
        `INSERT INTO comments (task_id, user_id, text) VALUES ($1::uuid, $2::uuid, $3)`,
        [task.id, req.user!.id, text]
      );
      await insertActivity(
        task.id,
        req.user!.id,
        'comment_added',
        `Added comment: "${text.substring(0, 30)}..."`
      );
      res.json(await loadUserBundle(req.user!.id));
    } catch (err) {
      const status = (err as { status?: number }).status || 500;
      res.status(status).json({ error: err instanceof Error ? err.message : 'Failed' });
    }
  });

  app.post('/api/notifications/:id/read', requireAuth, async (req: AuthedRequest, res) => {
    try {
      await sqlExecute(
        `UPDATE notifications SET read = TRUE WHERE id = $1::uuid AND user_id = $2::uuid`,
        [req.params.id, req.user!.id]
      );
      res.json(await loadUserBundle(req.user!.id));
    } catch (err) {
      res.status(500).json({ error: 'Failed' });
    }
  });

  app.post('/api/notifications/read-all', requireAuth, async (req: AuthedRequest, res) => {
    try {
      await sqlExecute(`UPDATE notifications SET read = TRUE WHERE user_id = $1::uuid`, [
        req.user!.id,
      ]);
      res.json(await loadUserBundle(req.user!.id));
    } catch (err) {
      res.status(500).json({ error: 'Failed' });
    }
  });

  app.post('/api/auth/logout', requireAuth, async (_req, res) => {
    res.json({ ok: true });
  });

  return app;
}

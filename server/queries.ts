import { QueryTypes } from 'sequelize';
import { sequelize } from './db.ts';
import type { UserRole } from '../src/types/index.ts';
import {
  mapActivity,
  mapComment,
  mapJoinRequest,
  mapNotification,
  mapOrg,
  mapTask,
  mapUser,
} from './mappers.ts';

export async function sqlSelect<T extends object = Record<string, unknown>>(
  query: string,
  bind: unknown[] = []
): Promise<T[]> {
  return sequelize.query(query, {
    bind,
    type: QueryTypes.SELECT,
  }) as Promise<T[]>;
}

export async function sqlExecute(query: string, bind: unknown[] = []) {
  return sequelize.query(query, { bind });
}

export async function getMembership(userId: string, orgId: string) {
  const rows = await sqlSelect<{ role: UserRole }>(
    `SELECT role FROM org_memberships WHERE user_id = $1::uuid AND org_id = $2::uuid LIMIT 1`,
    [userId, orgId]
  );
  return rows[0] ?? null;
}

export async function requireMembership(userId: string, orgId: string) {
  const m = await getMembership(userId, orgId);
  if (!m) throw Object.assign(new Error('Not a member of this organization'), { status: 403 });
  return m;
}

export async function requireAdmin(userId: string, orgId: string) {
  const m = await requireMembership(userId, orgId);
  if (m.role !== 'Workspace Admin') {
    throw Object.assign(new Error('Admin access required'), { status: 403 });
  }
  return m;
}

export async function loadUserBundle(userId: string) {
  const userRows = await sqlSelect(`SELECT * FROM users WHERE id = $1::uuid`, [userId]);
  if (!userRows[0]) return null;

  const memberships = await sqlSelect<{ org_id: string; role: UserRole }>(
    `SELECT org_id, role FROM org_memberships WHERE user_id = $1::uuid`,
    [userId]
  );
  const orgIds = memberships.map((m) => m.org_id);
  const activeOrgId = userRows[0].active_org_id
    ? String(userRows[0].active_org_id)
    : orgIds[0] || null;

  const activeRole =
    memberships.find((m) => m.org_id === activeOrgId)?.role ??
    memberships[0]?.role ??
    'Member';

  const user = mapUser(userRows[0], {
    role: activeRole,
    orgIds,
    orgId: activeOrgId,
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

  let users: ReturnType<typeof mapUser>[] = [];
  let joinRequests: ReturnType<typeof mapJoinRequest>[] = [];
  let tasks: ReturnType<typeof mapTask>[] = [];
  let comments: ReturnType<typeof mapComment>[] = [];
  let activities: ReturnType<typeof mapActivity>[] = [];

  if (activeOrgId) {
    const memberRows = await sqlSelect(
      `SELECT u.*, m.role
       FROM org_memberships m
       JOIN users u ON u.id = m.user_id
       WHERE m.org_id = $1::uuid
       ORDER BY u.name ASC`,
      [activeOrgId]
    );
    users = memberRows.map((row) =>
      mapUser(row, {
        role: row.role as UserRole,
        orgIds: [activeOrgId],
        orgId: activeOrgId,
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
    notifications,
  };
}

export async function insertActivity(
  taskId: string,
  userId: string,
  type: string,
  details: string
) {
  await sqlExecute(
    `INSERT INTO activities (task_id, user_id, type, details)
     VALUES ($1::uuid, $2::uuid, $3, $4)`,
    [taskId, userId, type, details]
  );
}

export async function insertNotification(
  userId: string,
  title: string,
  message: string,
  taskId: string | null,
  type: string
) {
  await sqlExecute(
    `INSERT INTO notifications (user_id, title, message, task_id, type)
     VALUES ($1::uuid, $2, $3, $4::uuid, $5)`,
    [userId, title, message, taskId, type]
  );
}

export function makeInviteCode(orgName: string) {
  const slug = orgName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const randomCode = Math.floor(1000 + Math.random() * 9000).toString();
  return `${slug || 'org'}-${randomCode}`;
}

export async function nextTaskNumber(orgId: string) {
  const now = new Date();
  const yearYy = Number(String(now.getFullYear()).slice(-2));
  const month = now.getMonth() + 1;

  const rows = await sqlSelect<{ last_seq: number }>(
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

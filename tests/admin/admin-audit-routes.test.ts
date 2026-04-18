import assert from 'node:assert/strict';
import test from 'node:test';

import { handleAdminAuditListGetRequest } from '@/app/api/admin/audit/route';

test('admin audit list handler enforces auth', async () => {
  await assert.rejects(
    handleAdminAuditListGetRequest(
      { url: 'http://localhost/api/admin/audit' } as never,
      {
        requireAdmin: async () => {
          throw new Error('Unauthorized');
        },
        findAdminActionLogs: async () => [],
      },
    ),
    /Unauthorized/,
  );
});

test('admin audit list handler rejects invalid date filters', async () => {
  const result = await handleAdminAuditListGetRequest(
    { url: 'http://localhost/api/admin/audit?from=invalid-date' } as never,
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findAdminActionLogs: async () => [],
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'from must be a valid ISO date');
});

test('admin audit list handler returns safe allowlisted fields only', async () => {
  const result = await handleAdminAuditListGetRequest(
    { url: 'http://localhost/api/admin/audit?module=content&page=1&limit=10' } as never,
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findAdminActionLogs: async () => [
        {
          id: 'audit-1',
          settingKey: 'admin_action:blog_post:post-1',
          mutationType: 'UPDATE',
          actorUserId: 'admin-1',
          actorRole: 'ADMIN',
          metadata: {
            source: 'admin_action',
            module: 'content',
            entity: 'blog_post',
            entityId: 'post-1',
            summary: 'Updated blog post post-1',
            correlation: {
              requestId: 'req-1',
              route: '/api/admin/blog/posts/[id]',
              httpMethod: 'PUT',
              transactionId: 'tx-1',
            },
            secret: 'must-not-leak',
            rawPayload: { unsafe: true },
          },
          createdAt: new Date('2026-04-18T12:00:00.000Z'),
          actor: {
            id: 'admin-1',
            name: 'Admin',
            role: 'ADMIN',
          },
        },
      ],
    },
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  const data = result.body.data as {
    logs: Array<Record<string, unknown>>;
    pagination: { total: number };
  };
  assert.equal(data.logs.length, 1);
  assert.equal(data.pagination.total, 1);
  assert.equal('metadata' in data.logs[0], false);
  assert.equal((data.logs[0].correlation as Record<string, unknown>).requestId, 'req-1');
  assert.equal((data.logs[0].correlation as Record<string, unknown>).route, '/api/admin/blog/posts/[id]');
});

test('admin audit list handler paginates accurately beyond 500 logs', async () => {
  const logs = Array.from({ length: 620 }, (_, index) => {
    const id = `audit-${index + 1}`;
    return {
      id,
      settingKey: `admin_action:category:${id}`,
      mutationType: 'UPDATE',
      actorUserId: 'admin-1',
      actorRole: 'ADMIN' as const,
      metadata: {
        source: 'admin_action',
        module: 'catalog',
        entity: 'category',
        entityId: id,
        summary: `Updated category ${id}`,
        correlation: {
          requestId: `req-${index + 1}`,
          route: '/api/admin/categories/[id]',
          httpMethod: 'PUT',
        },
      },
      createdAt: new Date(`2026-04-18T12:${String(index % 60).padStart(2, '0')}:00.000Z`),
      actor: {
        id: 'admin-1',
        name: 'Admin',
        role: 'ADMIN' as const,
      },
    };
  });

  const result = await handleAdminAuditListGetRequest(
    { url: 'http://localhost/api/admin/audit?module=catalog&page=13&limit=50' } as never,
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findAdminActionLogs: async ({ skip = 0, take }) => logs.slice(skip, skip + take),
    },
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  const data = result.body.data as {
    logs: Array<Record<string, unknown>>;
    pagination: { total: number; totalPages: number; page: number; limit: number };
  };
  assert.equal(data.pagination.total, 620);
  assert.equal(data.pagination.totalPages, 13);
  assert.equal(data.pagination.page, 13);
  assert.equal(data.pagination.limit, 50);
  assert.equal(data.logs.length, 20);
});

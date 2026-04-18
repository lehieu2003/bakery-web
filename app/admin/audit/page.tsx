'use client';

import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';

import AdminShell from '@/components/admin/AdminShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAdminAuditLogs } from '@/hooks/admin/use-audit';

function formatDate(value: string) {
  return new Date(value).toLocaleString('vi-VN');
}

export default function AdminAuditPage() {
  const [page, setPage] = useState(1);
  const [moduleFilter, setModuleFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  const params = useMemo(
    () => ({
      page,
      limit: 20,
      module: moduleFilter.trim() || undefined,
      entity: entityFilter.trim() || undefined,
    }),
    [entityFilter, moduleFilter, page],
  );

  const { data, isLoading, error, isFetching } = useAdminAuditLogs(params);
  const logs = data?.logs ?? [];
  const pagination = data?.pagination;

  return (
    <AdminShell title='Audit Logs'>
      <div className='space-y-4'>
        <div className='bg-card rounded-xl border border-border p-4'>
          <div className='grid gap-3 md:grid-cols-3'>
            <Input
              value={moduleFilter}
              onChange={(event) => {
                setModuleFilter(event.target.value);
                setPage(1);
              }}
              placeholder='Filter by module (e.g. catalog)'
              className='h-9 text-xs'
            />
            <Input
              value={entityFilter}
              onChange={(event) => {
                setEntityFilter(event.target.value);
                setPage(1);
              }}
              placeholder='Filter by entity (e.g. category)'
              className='h-9 text-xs'
            />
            <div className='text-xs text-muted-foreground flex items-center justify-end'>
              {isFetching ? 'Refreshing...' : `Total: ${pagination?.total ?? 0}`}
            </div>
          </div>
        </div>

        <div className='bg-card rounded-xl border border-border overflow-hidden'>
          <div className='px-4 py-3 border-b border-border flex items-center justify-between'>
            <p className='text-sm font-semibold text-foreground'>Admin Action Audit Trail</p>
            {isLoading && <Loader2 className='w-4 h-4 animate-spin text-muted-foreground' />}
          </div>

          {error ? (
            <div className='p-4 text-xs text-destructive'>Unable to load audit logs.</div>
          ) : logs.length === 0 ? (
            <div className='p-4 text-xs text-muted-foreground'>No audit entries found.</div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full text-xs'>
                <thead className='bg-muted/40 text-muted-foreground'>
                  <tr>
                    <th className='text-left px-4 py-2 font-medium'>When</th>
                    <th className='text-left px-4 py-2 font-medium'>Actor</th>
                    <th className='text-left px-4 py-2 font-medium'>Action</th>
                    <th className='text-left px-4 py-2 font-medium'>Entity</th>
                    <th className='text-left px-4 py-2 font-medium'>Summary</th>
                    <th className='text-left px-4 py-2 font-medium'>Correlation</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className='border-t border-border align-top'>
                      <td className='px-4 py-3 whitespace-nowrap'>{formatDate(log.createdAt)}</td>
                      <td className='px-4 py-3'>
                        <div className='font-medium text-foreground'>
                          {log.actor?.name ?? log.actorUserId ?? 'System'}
                        </div>
                        <div className='text-muted-foreground'>
                          {log.actorRole ?? log.actor?.role ?? 'N/A'}
                        </div>
                      </td>
                      <td className='px-4 py-3'>
                        <div className='font-medium text-foreground'>{log.mutationType}</div>
                        <div className='text-muted-foreground'>{log.module}</div>
                      </td>
                      <td className='px-4 py-3'>
                        <div className='font-medium text-foreground'>{log.entity}</div>
                        <div className='text-muted-foreground'>{log.entityId}</div>
                      </td>
                      <td className='px-4 py-3 text-foreground'>{log.summary}</td>
                      <td className='px-4 py-3 text-muted-foreground'>
                        <div>{log.correlation.requestId ?? 'N/A'}</div>
                        <div>
                          {log.correlation.httpMethod ?? 'N/A'} {log.correlation.route ?? ''}
                        </div>
                        {log.correlation.orderId && <div>orderId: {log.correlation.orderId}</div>}
                        {log.correlation.transactionId && (
                          <div>transactionId: {log.correlation.transactionId}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className='flex items-center justify-end gap-2'>
          <Button
            size='sm'
            variant='outline'
            className='h-8 text-xs'
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1 || isFetching}
          >
            Previous
          </Button>
          <span className='text-xs text-muted-foreground'>Page {pagination?.page ?? page}</span>
          <Button
            size='sm'
            variant='outline'
            className='h-8 text-xs'
            onClick={() => setPage((current) => current + 1)}
            disabled={isFetching || (pagination ? page >= pagination.totalPages : false)}
          >
            Next
          </Button>
        </div>
      </div>
    </AdminShell>
  );
}

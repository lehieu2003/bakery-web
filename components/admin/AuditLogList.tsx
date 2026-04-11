'use client';

import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';

type AuditActor = {
  id: string;
  name: string | null;
  role: string;
};

export type AuditLogEntry = {
  id: string;
  mutationType: string;
  actorRole: string | null;
  createdAt: string | Date;
  actor: AuditActor | null;
  metadata?: unknown;
};

function toReadableDate(input: string | Date) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return '-';
  return format(date, 'dd/MM/yyyy HH:mm:ss', { locale: vi });
}

function stringifyMetadata(metadata: unknown) {
  if (!metadata) return null;
  try {
    return JSON.stringify(metadata, null, 2);
  } catch {
    return String(metadata);
  }
}

type Props = {
  title: string;
  logs?: AuditLogEntry[];
  isLoading?: boolean;
  error?: boolean;
  emptyText?: string;
};

export default function AuditLogList({
  title,
  logs = [],
  isLoading = false,
  error = false,
  emptyText = 'No audit entries yet.',
}: Props) {
  return (
    <div className='bg-card rounded-xl border border-border shadow-sm'>
      <div className='px-5 py-4 border-b border-border'>
        <p className='text-sm font-semibold text-foreground'>{title}</p>
      </div>

      {isLoading ? (
        <div className='px-5 py-10 flex items-center justify-center'>
          <Loader2 className='w-5 h-5 animate-spin text-primary' />
        </div>
      ) : error ? (
        <div className='px-5 py-6'>
          <p className='text-xs text-destructive'>Failed to load audit logs.</p>
        </div>
      ) : logs.length === 0 ? (
        <div className='px-5 py-6'>
          <p className='text-xs text-muted-foreground'>{emptyText}</p>
        </div>
      ) : (
        <div className='divide-y divide-border max-h-[420px] overflow-auto'>
          {logs.map((log) => (
            <div key={log.id} className='px-5 py-4 space-y-2'>
              <div className='flex items-center justify-between gap-3'>
                <span className='inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-medium bg-muted text-foreground border-border'>
                  {log.mutationType}
                </span>
                <span className='text-[10px] text-muted-foreground'>
                  {toReadableDate(log.createdAt)}
                </span>
              </div>

              <p className='text-xs text-muted-foreground'>
                By {log.actor?.name || 'System'} ({log.actorRole || log.actor?.role || '-'})
              </p>

              {log.metadata ? (
                <details className='text-[11px]'>
                  <summary className='cursor-pointer text-muted-foreground hover:text-foreground'>
                    Metadata
                  </summary>
                  <pre className='mt-2 p-2 rounded-md bg-muted/40 border border-border overflow-auto text-[10px] leading-4'>
                    {stringifyMetadata(log.metadata)}
                  </pre>
                </details>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


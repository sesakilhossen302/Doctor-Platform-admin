'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronRight, ScrollText } from 'lucide-react';
import { useState } from 'react';
import { EmptyState, PageHeader, Pagination, TableSkeleton } from '@/components/ui/page';
import { Avatar, Badge, Card, Select } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import type { AuditLog, Paginated } from '@/lib/types';
import { cn, fmtDateTime, ROLE_LABEL } from '@/lib/utils';

const ENTITIES = ['doctors', 'appointments', 'platform_fee_settings', 'specialties', 'designations', 'hospitals', 'divisions', 'districts', 'upazilas', 'users'];

export default function AuditPage() {
  const [entity, setEntity] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['audit', entity, page],
    queryFn: () => api<Paginated<AuditLog>>('/admin/audit-logs', { query: { entity, page, limit: 25 } }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader title="Audit log" description="Who changed what and when — doctors, fees, bookings, staff. Used for security and dispute resolution." />
      <Card>
        <div className="border-b border-border p-4">
          <Select
            value={entity}
            onChange={(e) => {
              setEntity(e.target.value);
              setPage(1);
            }}
            className="md:w-60"
          >
            <option value="">All records</option>
            {ENTITIES.map((e) => (
              <option key={e} value={e}>
                {e.replace(/_/g, ' ')}
              </option>
            ))}
          </Select>
        </div>
        {isLoading ? (
          <TableSkeleton cols={4} />
        ) : !data?.items.length ? (
          <EmptyState icon={ScrollText} title="No activity yet" />
        ) : (
          <>
            <ul className="divide-y divide-border">
              {data.items.map((l) => (
                <li key={l.id}>
                  <button onClick={() => setOpen(open === l.id ? null : l.id)} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-surface-muted/50">
                    <Avatar name={l.actor?.name ?? 'System'} size={30} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{l.actor?.name ?? 'System'}</span>{' '}
                        <Badge tone="primary" className="mx-1 font-mono text-[11px]">
                          {l.action}
                        </Badge>
                        <span className="text-muted">
                          on {l.entity.replace(/_/g, ' ')}
                          {l.entityId && <span className="font-mono text-xs"> #{l.entityId.slice(0, 8)}</span>}
                        </span>
                      </p>
                      <p className="text-xs text-muted">
                        {fmtDateTime(l.createdAt)} · {l.actor ? ROLE_LABEL[l.actor.role] : ''} {l.ip && `· ${l.ip}`}
                      </p>
                    </div>
                    <ChevronRight className={cn('size-4 text-muted transition-transform', open === l.id && 'rotate-90')} />
                  </button>
                  {open === l.id && (
                    <div className="grid gap-3 bg-surface-muted/40 px-5 py-3 md:grid-cols-2">
                      <Json label="Before" value={l.before} />
                      <Json label="After" value={l.after} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} />
          </>
        )}
      </Card>
    </>
  );
}

function Json({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-surface p-3 text-xs leading-relaxed">
        {value === null || value === undefined ? '—' : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

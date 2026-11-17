'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Banknote, CheckCircle2, Receipt, Wallet } from 'lucide-react';
import { useState } from 'react';
import { EmptyState, PageHeader, Pagination, SearchInput, StatCard, TableSkeleton } from '@/components/ui/page';
import { Badge, Card, Select, Table, Td, Th, type Tone } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import type { Paginated, PaymentRow } from '@/lib/types';
import { fmtDateTime, taka } from '@/lib/utils';

const STATUS: Record<PaymentRow['status'], { label: string; tone: Tone }> = {
  INITIATED: { label: 'Started', tone: 'neutral' },
  SUCCESS: { label: 'Paid', tone: 'success' },
  FAILED: { label: 'Failed', tone: 'danger' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
  REFUNDED: { label: 'Refunded', tone: 'info' },
};

type Res = Paginated<PaymentRow> & { summary: { successCount: number; collected: number; platformFees: number } };

export default function PaymentsPage() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['payments', q, status, page],
    queryFn: () => api<Res>('/admin/payments', { query: { q, status, page, limit: 20 } }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader title="Payments" description="Every payment attempt. A payment becomes “Paid” only after server-side verification — never from the app screen." />
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="Successful payments" value={data?.summary.successCount ?? 0} icon={CheckCircle2} tone="success" loading={isLoading} />
        <StatCard label="Collected" value={taka(data?.summary.collected ?? 0)} icon={Banknote} loading={isLoading} />
        <StatCard label="Platform fees" value={taka(data?.summary.platformFees ?? 0)} icon={Wallet} tone="info" loading={isLoading} />
      </div>
      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row">
          <SearchInput
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(1);
            }}
            placeholder="Payment code, transaction ID or phone…"
            className="md:w-96"
          />
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="md:w-44"
          >
            <option value="">All statuses</option>
            {Object.entries(STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </Select>
        </div>
        {isLoading ? (
          <TableSkeleton cols={6} />
        ) : !data?.items.length ? (
          <EmptyState icon={Receipt} title="No payments yet" />
        ) : (
          <div className={isFetching ? 'opacity-60' : ''}>
            <Table>
              <thead>
                <tr>
                  <Th>Payment</Th>
                  <Th>Patient</Th>
                  <Th>For</Th>
                  <Th className="text-right">Amount</Th>
                  <Th>Method</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p.id}>
                    <Td>
                      <p className="font-mono text-[13px] font-medium">{p.code}</p>
                      <p className="text-xs text-muted">{fmtDateTime(p.createdAt)}</p>
                    </Td>
                    <Td>
                      <p className="text-sm">{p.user.name ?? '—'}</p>
                      <p className="font-mono text-xs text-muted">{p.user.phone}</p>
                    </Td>
                    <Td className="text-sm">
                      {p.appointment ? (
                        <>
                          Appointment <span className="font-mono">{p.appointment.code}</span>
                          <p className="text-xs text-muted">{p.appointment.doctor.nameEn}</p>
                        </>
                      ) : p.callRequest ? (
                        <>
                          Instant call <span className="font-mono">{p.callRequest.code}</span>
                        </>
                      ) : (
                        '—'
                      )}
                    </Td>
                    <Td className="text-right tabular-nums">
                      <p>{taka(p.amount)}</p>
                      <p className="text-xs text-muted">incl. {taka(p.platformFee)} fee</p>
                    </Td>
                    <Td>
                      <Badge tone={p.provider === 'DEMO' ? 'warning' : 'primary'}>{p.provider === 'DEMO' ? 'Demo' : 'bKash'}</Badge>
                      {p.trxId && <p className="mt-1 font-mono text-[11px] text-muted">{p.trxId}</p>}
                    </Td>
                    <Td>
                      <Badge tone={STATUS[p.status].tone} dot>
                        {STATUS[p.status].label}
                      </Badge>
                      {p.failureReason && <p className="mt-1 max-w-48 text-xs text-danger">{p.failureReason}</p>}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} />
          </div>
        )}
      </Card>
    </>
  );
}

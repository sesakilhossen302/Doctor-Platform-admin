'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarCheck } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState, PageHeader, Pagination, SearchInput, TableSkeleton } from '@/components/ui/page';
import { Avatar, Badge, Card, Field, Input, Select, Table, Td, Textarea, Th } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import type { Appointment, AppointmentStatus, Paginated } from '@/lib/types';
import { APPOINTMENT_STATUS, fmtDate, fmtDateTime, fmtTime, taka, TYPE_LABEL } from '@/lib/utils';

const NEXT: Partial<Record<AppointmentStatus, AppointmentStatus[]>> = {
  PENDING_PAYMENT: ['CANCELLED'],
  CONFIRMED: ['COMPLETED', 'NO_SHOW', 'CANCELLED'],
};

export default function AppointmentsPage() {
  return (
    <Suspense>
      <Appointments />
    </Suspense>
  );
}

function Appointments() {
  const router = useRouter();
  const sp = useSearchParams();
  const filters = {
    q: sp.get('q') ?? '',
    status: sp.get('status') ?? '',
    type: sp.get('type') ?? '',
    from: sp.get('from') ?? '',
    to: sp.get('to') ?? '',
    page: Number(sp.get('page') ?? 1),
  };
  const setFilter = useCallback(
    (key: string, value: string | number) => {
      const next = new URLSearchParams(sp.toString());
      if (value === '') next.delete(key);
      else next.set(key, String(value));
      if (key !== 'page') next.delete('page');
      router.replace(`/appointments?${next.toString()}`);
    },
    [router, sp],
  );

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['appointments', filters],
    queryFn: () => api<Paginated<Appointment>>('/admin/appointments', { query: { ...filters, limit: 20 } }),
    placeholderData: keepPreviousData,
  });
  const [selected, setSelected] = useState<Appointment | null>(null);

  return (
    <>
      <PageHeader title="Appointments" description="All bookings across doctors. Every status change is recorded in the audit log." />
      <Card>
        <div className="grid gap-3 border-b border-border p-4 md:grid-cols-[1fr_auto_auto_auto_auto]">
          <SearchInput value={filters.q} onChange={(v) => setFilter('q', v)} placeholder="Booking ID, patient, phone or doctor…" />
          <Select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className="md:w-44">
            <option value="">All statuses</option>
            {Object.entries(APPOINTMENT_STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </Select>
          <Select value={filters.type} onChange={(e) => setFilter('type', e.target.value)} className="md:w-36">
            <option value="">All types</option>
            {Object.entries(TYPE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
          <Input type="date" value={filters.from} onChange={(e) => setFilter('from', e.target.value)} className="md:w-40" aria-label="From date" />
          <Input type="date" value={filters.to} onChange={(e) => setFilter('to', e.target.value)} className="md:w-40" aria-label="To date" />
        </div>

        {isLoading ? (
          <TableSkeleton cols={6} />
        ) : !data?.items.length ? (
          <EmptyState icon={CalendarCheck} title="No appointments match" description="Try clearing filters." />
        ) : (
          <div className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            <Table>
              <thead>
                <tr>
                  <Th>Booking</Th>
                  <Th>Patient</Th>
                  <Th>Doctor</Th>
                  <Th>When</Th>
                  <Th className="text-right">Amount</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((a) => (
                  <tr key={a.id} className="cursor-pointer hover:bg-surface-muted/50" onClick={() => setSelected(a)}>
                    <Td>
                      <p className="font-mono text-[13px] font-medium">{a.code}</p>
                      <p className="text-xs text-muted">{TYPE_LABEL[a.type]}</p>
                    </Td>
                    <Td>
                      <p className="font-medium">{a.patientName}</p>
                      <p className="text-xs text-muted">{a.patient?.phone}</p>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={a.doctor.nameEn} src={a.doctor.photoUrl} size={30} />
                        <div>
                          <p className="text-sm">{a.doctor.nameEn}</p>
                          <p className="text-xs text-muted">{a.doctor.specialties[0]?.specialty.nameEn}</p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <p className="text-sm">{fmtDate(a.scheduledAt)}</p>
                      <p className="text-xs text-muted">{fmtTime(a.scheduledAt)}</p>
                    </Td>
                    <Td className="text-right tabular-nums">{taka(a.totalAmount)}</Td>
                    <Td>
                      <Badge tone={APPOINTMENT_STATUS[a.status].tone} dot>
                        {APPOINTMENT_STATUS[a.status].label}
                      </Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination page={data.page} limit={data.limit} total={data.total} onPage={(p) => setFilter('page', p)} />
          </div>
        )}
      </Card>
      {selected && <AppointmentDialog appointment={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function AppointmentDialog({ appointment: a, onClose }: { appointment: Appointment; onClose: () => void }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<AppointmentStatus | ''>('');
  const [reason, setReason] = useState('');
  const options = NEXT[a.status] ?? [];
  const change = useMutation({
    mutationFn: () => api(`/admin/appointments/${a.id}/status`, { method: 'PATCH', body: { status, reason: reason || undefined } }),
    onSuccess: () => {
      toast.success('Status updated');
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const rows: [string, React.ReactNode][] = [
    ['Booking ID', <span key="c" className="font-mono">{a.code}</span>],
    ['Type', TYPE_LABEL[a.type]],
    ['Scheduled', fmtDateTime(a.scheduledAt)],
    ['Doctor', a.doctor.nameEn],
    ['Chamber', a.chamber ? `${a.chamber.name}, ${a.chamber.district.nameEn}` : 'Online'],
    ['Patient', `${a.patientName}${a.patientAge ? `, ${a.patientAge} yrs` : ''}`],
    ['Phone', a.patient?.phone ?? '—'],
    ['Reason for visit', a.reason ?? '—'],
    ['Fees', `${taka(a.serviceFee)} + ${taka(a.platformFee)} platform = ${taka(a.totalAmount)}`],
    ['Booked at', fmtDateTime(a.createdAt)],
  ];
  if (a.cancelReason) rows.push(['Cancel reason', a.cancelReason]);

  return (
    <Dialog
      open
      onClose={onClose}
      title="Appointment details"
      description={<Badge tone={APPOINTMENT_STATUS[a.status].tone} dot>{APPOINTMENT_STATUS[a.status].label}</Badge>}
      size="lg"
      footer={
        options.length ? (
          <Button onClick={() => change.mutate()} disabled={!status} loading={change.isPending} variant={status === 'CANCELLED' ? 'danger' : 'primary'}>
            Update status
          </Button>
        ) : undefined
      }
    >
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[160px_1fr]">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-sm text-muted">{k}</dt>
            <dd className="text-sm">{v}</dd>
          </div>
        ))}
      </dl>
      {a.status === 'PENDING_PAYMENT' && (
        <p className="mt-4 rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning">
          Awaiting payment. It becomes Confirmed only after the payment gateway verifies the transaction — it cannot be confirmed manually.
        </p>
      )}
      {options.length > 0 && (
        <div className="mt-5 grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
          <Field label="Change status to">
            <Select value={status} onChange={(e) => setStatus(e.target.value as AppointmentStatus)}>
              <option value="">— Select —</option>
              {options.map((s) => (
                <option key={s} value={s}>
                  {APPOINTMENT_STATUS[s].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Note / reason" hint="saved to audit log">
            <Textarea rows={1} className="min-h-9" value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        </div>
      )}
    </Dialog>
  );
}

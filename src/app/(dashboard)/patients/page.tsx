'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { EmptyState, PageHeader, Pagination, SearchInput, TableSkeleton } from '@/components/ui/page';
import { Avatar, Badge, Card, Table, Td, Th } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import type { Paginated, Patient } from '@/lib/types';
import { fmtDate } from '@/lib/utils';

export default function PatientsPage() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['patients', q, page],
    queryFn: () => api<Paginated<Patient>>('/admin/patients', { query: { q, page, limit: 20 } }),
    placeholderData: keepPreviousData,
  });
  const toggle = useMutation({
    mutationFn: (p: Patient) => api(`/admin/users/${p.id}/status`, { method: 'PATCH', body: { status: p.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' } }),
    onSuccess: () => {
      toast.success('Patient status updated');
      qc.invalidateQueries({ queryKey: ['patients'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <>
      <PageHeader title="Patients" description="Registered app users. Health details are visible only to authorised staff." />
      <Card>
        <div className="border-b border-border p-4">
          <SearchInput
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(1);
            }}
            placeholder="Search by phone or name…"
            className="md:w-80"
          />
        </div>
        {isLoading ? (
          <TableSkeleton cols={5} />
        ) : !data?.items.length ? (
          <EmptyState icon={Users} title="No patients yet" description="Patients appear here after they sign up with OTP in the app." />
        ) : (
          <div className={isFetching ? 'opacity-60' : ''}>
            <Table>
              <thead>
                <tr>
                  <Th>Patient</Th>
                  <Th>Gender</Th>
                  <Th>Bookings</Th>
                  <Th>Joined</Th>
                  <Th>Last active</Th>
                  <Th>Status</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar name={p.name ?? p.phone} size={32} />
                        <div>
                          <p className="font-medium">{p.name ?? 'Unnamed'}</p>
                          <p className="font-mono text-xs text-muted">{p.phone}</p>
                        </div>
                      </div>
                    </Td>
                    <Td className="text-sm capitalize text-muted">{p.patient?.gender?.toLowerCase() ?? '—'}</Td>
                    <Td className="tabular-nums">{p._count.appointments}</Td>
                    <Td className="text-sm text-muted">{fmtDate(p.createdAt)}</Td>
                    <Td className="text-sm text-muted">{p.lastLoginAt ? fmtDate(p.lastLoginAt) : '—'}</Td>
                    <Td>
                      <Badge tone={p.status === 'ACTIVE' ? 'success' : 'danger'} dot>
                        {p.status === 'ACTIVE' ? 'Active' : 'Suspended'}
                      </Badge>
                    </Td>
                    <Td className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => toggle.mutate(p)}>
                        {p.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                      </Button>
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

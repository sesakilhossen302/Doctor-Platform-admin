'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { PageHeader, TableSkeleton } from '@/components/ui/page';
import { Avatar, Badge, Card, Field, Input, Select, Table, Td, Th } from '@/components/ui/primitives';
import { api, session } from '@/lib/api';
import type { Staff } from '@/lib/types';
import { fmtDate, ROLE_LABEL } from '@/lib/utils';

const PERMISSIONS: [string, string][] = [
  ['Super admin', 'Everything, including creating staff accounts'],
  ['Admin', 'Doctors, locations, specialties, bookings, fees, reports'],
  ['Call agent', 'Call-center queue and transfers (next phase) — cannot change fees or permissions'],
  ['Doctor assistant', 'A doctor’s schedule and bookings (next phase)'],
];

export default function StaffPage() {
  const qc = useQueryClient();
  const me = session.user;
  const { data, isLoading } = useQuery({ queryKey: ['staff'], queryFn: () => api<Staff[]>('/admin/staff') });
  const [open, setOpen] = useState(false);
  const toggle = useMutation({
    mutationFn: (s: Staff) => api(`/admin/users/${s.id}/status`, { method: 'PATCH', body: { status: s.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <>
      <PageHeader
        title="Staff & roles"
        description="Role-based access with least privilege. Suspending someone signs them out everywhere."
        actions={
          me?.role === 'SUPER_ADMIN' && (
            <Button onClick={() => setOpen(true)}>
              <Plus /> Add staff
            </Button>
          )
        }
      />
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          {isLoading ? (
            <TableSkeleton cols={4} rows={4} />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Role</Th>
                  <Th>Last sign-in</Th>
                  <Th>Status</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {data?.map((s) => (
                  <tr key={s.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar name={s.name ?? s.email} size={32} />
                        <div>
                          <p className="font-medium">{s.name}</p>
                          <p className="text-xs text-muted">{s.email}</p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <Badge tone={s.role === 'SUPER_ADMIN' ? 'primary' : 'neutral'}>{ROLE_LABEL[s.role]}</Badge>
                    </Td>
                    <Td className="text-sm text-muted">{s.lastLoginAt ? fmtDate(s.lastLoginAt) : 'Never'}</Td>
                    <Td>
                      <Badge tone={s.status === 'ACTIVE' ? 'success' : 'danger'} dot>
                        {s.status === 'ACTIVE' ? 'Active' : 'Suspended'}
                      </Badge>
                    </Td>
                    <Td className="text-right">
                      {s.id !== me?.id && s.role !== 'SUPER_ADMIN' && (
                        <Button variant="ghost" size="sm" onClick={() => toggle.mutate(s)}>
                          {s.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                        </Button>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
        <Card className="p-5">
          <p className="flex items-center gap-2 font-medium">
            <ShieldCheck className="size-4 text-primary" /> What each role can do
          </p>
          <ul className="mt-4 space-y-3">
            {PERMISSIONS.map(([role, text]) => (
              <li key={role}>
                <p className="text-sm font-medium">{role}</p>
                <p className="text-sm text-muted">{text}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      {open && <StaffDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function StaffDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'ADMIN' });
  const save = useMutation({
    mutationFn: () => api('/admin/staff', { method: 'POST', body: f }),
    onSuccess: () => {
      toast.success('Staff account created');
      qc.invalidateQueries({ queryKey: ['staff'] });
      onClose();
    },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <Dialog
      open
      onClose={onClose}
      size="sm"
      title="Add staff account"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!f.name || !f.email || f.password.length < 8}>
            Create
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Full name">
          <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </Field>
        <Field label="Email">
          <Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </Field>
        <Field label="Temporary password" hint="min 8 characters">
          <Input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        </Field>
        <Field label="Role">
          <Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
            <option value="ADMIN">Admin</option>
            <option value="CALL_AGENT">Call agent</option>
            <option value="DOCTOR_ASSISTANT">Doctor assistant</option>
          </Select>
        </Field>
      </div>
    </Dialog>
  );
}

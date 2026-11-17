'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, CalendarX, ChevronLeft, Hospital, Plus, Smartphone, Star, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { toast } from 'sonner';
import { DoctorForm, toPayload } from '@/components/doctor-form';
import { ScheduleEditor } from '@/components/schedule-editor';
import { ChamberDialog } from '@/components/chamber-dialog';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/page';
import { Avatar, Badge, Card, CardHeader, Field, Input, Select, Skeleton, Switch } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import type { Chamber, DoctorDetail, DoctorStatus, VerificationStatus } from '@/lib/types';
import { cn, DOCTOR_STATUS, fmtDate, VERIFICATION_STATUS } from '@/lib/utils';

const TABS = [
  { key: 'profile', label: 'Profile' },
  { key: 'chambers', label: 'Chambers' },
  { key: 'schedule', label: 'Schedule' },
  { key: 'leave', label: 'Leave' },
] as const;

export default function DoctorPage() {
  return (
    <Suspense>
      <DoctorDetailView />
    </Suspense>
  );
}

function DoctorDetailView() {
  const { id } = useParams<{ id: string }>();
  const sp = useSearchParams();
  const router = useRouter();
  const tab = (sp.get('tab') ?? 'profile') as (typeof TABS)[number]['key'];
  const qc = useQueryClient();

  const { data: d, isLoading } = useQuery({ queryKey: ['doctor', id], queryFn: () => api<DoctorDetail>(`/admin/doctors/${id}`) });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['doctor', id] });
    qc.invalidateQueries({ queryKey: ['doctors'] });
  };

  const mutate = useMutation({
    mutationFn: ({ path, body }: { path: string; body?: unknown }) => api(`/admin/doctors/${id}${path}`, { method: 'PATCH', body }),
    onSuccess: () => {
      refresh();
      toast.success('Saved');
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (isLoading || !d) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const visible = d.status === 'ACTIVE' && d.verificationStatus === 'VERIFIED';

  return (
    <>
      <Link href="/doctors" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ChevronLeft className="size-4" /> Doctors
      </Link>

      {/* Header */}
      <Card className="mb-4 p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
          <div className="flex flex-1 items-center gap-4">
            <Avatar name={d.nameEn} src={d.photoUrl} size={64} />
            <div className="min-w-0">
              <h1 className="flex flex-wrap items-center gap-2 text-xl font-semibold">
                {d.nameEn}
                {d.verificationStatus === 'VERIFIED' && <BadgeCheck className="size-5 text-primary" />}
                {d.isDemo && <Badge tone="warning">Demo</Badge>}
              </h1>
              {d.nameBn && <p className="bn text-sm text-muted">{d.nameBn}</p>}
              <p className="mt-1 text-sm text-muted">
                {d.designation?.nameEn ?? 'No designation'} · {d.specialties.map((s) => s.specialty.nameEn).join(', ') || 'No specialty'}
              </p>
              <p className="mt-1 flex items-center gap-3 text-xs text-muted">
                <span className="inline-flex items-center gap-1">
                  <Star className="size-3.5 fill-amber-400 text-amber-400" /> {d.ratingAvg.toFixed(1)} ({d.ratingCount})
                </span>
                <span>{d._count.appointments} bookings</span>
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:w-[560px]">
            <div>
              <p className="mb-1 text-xs text-muted">Status</p>
              <Select value={d.status} onChange={(e) => mutate.mutate({ path: '/status', body: { status: e.target.value as DoctorStatus } })}>
                {Object.entries(DOCTOR_STATUS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <p className="mb-1 text-xs text-muted">Verification</p>
              <Select
                value={d.verificationStatus}
                onChange={(e) => mutate.mutate({ path: '/verification', body: { verificationStatus: e.target.value as VerificationStatus } })}
              >
                {Object.entries(VERIFICATION_STATUS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <p className="mb-1 text-xs text-muted">Available for instant call</p>
              <div className="flex h-9 items-center">
                <Switch
                  checked={d.isAvailableNow}
                  disabled={d.status !== 'ACTIVE'}
                  onChange={(v) => mutate.mutate({ path: `/available-now/${v}` })}
                  label="Available now"
                />
              </div>
            </div>
          </div>
        </div>
        <div className={cn('mt-4 rounded-lg px-3 py-2 text-sm', visible ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning')}>
          {visible
            ? 'Visible to patients in the app.'
            : 'Hidden from patients — a doctor must be both Active and Verified to appear in the app.'}
        </div>
        <AppLoginRow doctor={d} onSaved={refresh} />
      </Card>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => router.replace(`/doctors/${id}?tab=${t.key}`)}
            className={cn(
              '-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-foreground',
            )}
          >
            {t.label}
            {t.key === 'chambers' && <span className="ml-1.5 text-xs text-muted">{d.chambers.length}</span>}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="max-w-4xl">
          <DoctorForm
            key={d.id + d.slug}
            initial={d}
            submitLabel="Save changes"
            onSubmit={async (v) => {
              try {
                await api(`/admin/doctors/${id}`, { method: 'PATCH', body: toPayload(v) });
                refresh();
                toast.success('Profile saved');
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
          />
        </div>
      )}
      {tab === 'chambers' && <ChambersTab doctor={d} onChange={refresh} />}
      {tab === 'schedule' && <ScheduleEditor doctor={d} onSaved={refresh} />}
      {tab === 'leave' && <LeaveTab doctor={d} onChange={refresh} />}
    </>
  );
}

function AppLoginRow({ doctor, onSaved }: { doctor: DoctorDetail; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState(doctor.user?.phone ?? '');
  const [email, setEmail] = useState(doctor.user?.email ?? '');
  const save = useMutation({
    mutationFn: () =>
      api(`/admin/doctors/${doctor.id}/app-login`, { method: 'PUT', body: { phone: phone.trim() || undefined, email: email.trim() || undefined } }),
    onSuccess: () => {
      toast.success('Doctor app login saved — the doctor can now sign in with OTP');
      setEditing(false);
      onSaved();
    },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <div className="mt-3 flex flex-col gap-3 rounded-lg border border-border px-4 py-3 sm:flex-row sm:items-center">
      <Smartphone className="hidden size-5 text-muted sm:block" />
      <div className="flex-1">
        <p className="text-sm font-medium">Doctor app login</p>
        <p className="text-xs text-muted">
          {doctor.user?.phone || doctor.user?.email
            ? `Signs in with OTP on ${[doctor.user.phone, doctor.user.email].filter(Boolean).join(' or ')}${doctor.user.lastLoginAt ? ` · last active ${fmtDate(doctor.user.lastLoginAt)}` : ' · never signed in'}`
            : 'Not set — the doctor cannot receive calls until a login is added.'}
        </p>
      </div>
      {editing ? (
        <div className="flex flex-wrap gap-2">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" className="w-36" />
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="doctor@gmail.com" className="w-52" />
          <Button size="sm" onClick={() => save.mutate()} loading={save.isPending}>
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
          {doctor.user?.phone || doctor.user?.email ? 'Change login' : 'Set login'}
        </Button>
      )}
    </div>
  );
}

function ChambersTab({ doctor, onChange }: { doctor: DoctorDetail; onChange: () => void }) {
  const [editing, setEditing] = useState<Chamber | null | 'new'>(null);
  return (
    <Card className="max-w-4xl">
      <CardHeader
        title="Chambers"
        description="Where the doctor sees patients. Location filters in the app use these."
        action={
          <Button size="sm" onClick={() => setEditing('new')}>
            <Plus /> Add chamber
          </Button>
        }
      />
      {!doctor.chambers.length ? (
        <EmptyState icon={Hospital} title="No chambers yet" description="Add at least one chamber so patients can book chamber visits." />
      ) : (
        <ul className="divide-y divide-border">
          {doctor.chambers.map((c) => (
            <li key={c.id} className="flex items-center gap-4 px-5 py-4">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <Hospital className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{c.name}</p>
                <p className="text-sm text-muted">
                  {[c.address, c.district?.nameEn].filter(Boolean).join(' · ')}
                </p>
              </div>
              <Badge tone={c.isActive ? 'success' : 'neutral'} dot>
                {c.isActive ? 'Active' : 'Inactive'}
              </Badge>
              <Button variant="secondary" size="sm" onClick={() => setEditing(c)}>
                Edit
              </Button>
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <ChamberDialog
          doctorId={doctor.id}
          chamber={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onChange();
          }}
        />
      )}
    </Card>
  );
}

function LeaveTab({ doctor, onChange }: { doctor: DoctorDetail; onChange: () => void }) {
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const add = useMutation({
    mutationFn: () => api(`/admin/doctors/${doctor.id}/leaves`, { method: 'POST', body: { date, reason: reason || undefined } }),
    onSuccess: () => {
      setDate('');
      setReason('');
      onChange();
      toast.success('Leave added — slots on that day are now closed');
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const remove = useMutation({
    mutationFn: (leaveId: string) => api(`/admin/doctors/${doctor.id}/leaves/${leaveId}`, { method: 'DELETE' }),
    onSuccess: onChange,
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Card className="max-w-3xl">
      <CardHeader title="Leave & days off" description="No slots are offered on these dates. Existing bookings are not cancelled automatically." />
      <form
        className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (date) add.mutate();
        }}
      >
        <Field label="Date" className="sm:w-48">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <Field label="Reason" hint="optional" className="flex-1">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Conference" />
        </Field>
        <Button type="submit" loading={add.isPending}>
          <Plus /> Add leave
        </Button>
      </form>
      {!doctor.leaves.length ? (
        <EmptyState icon={CalendarX} title="No upcoming leave" />
      ) : (
        <ul className="divide-y divide-border">
          {doctor.leaves.map((l) => (
            <li key={l.id} className="flex items-center gap-4 px-5 py-3">
              <CalendarX className="size-4 text-muted" />
              <span className="font-medium">{fmtDate(l.date)}</span>
              <span className="flex-1 text-sm text-muted">{l.reason}</span>
              <Button variant="ghost" size="icon-sm" onClick={() => remove.mutate(l.id)} aria-label="Remove leave">
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

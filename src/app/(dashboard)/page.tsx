'use client';

import { useQuery } from '@tanstack/react-query';
import { Banknote, BadgeCheck, CalendarCheck, Clock, Stethoscope, Users } from 'lucide-react';
import Link from 'next/link';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Avatar, Badge, Card, CardHeader, Skeleton } from '@/components/ui/primitives';
import { EmptyState, PageHeader, StatCard } from '@/components/ui/page';
import { api } from '@/lib/api';
import type { Dashboard } from '@/lib/types';
import { APPOINTMENT_STATUS, fmtDateTime, fmtShortDay, taka, TYPE_LABEL } from '@/lib/utils';

export default function OverviewPage() {
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: () => api<Dashboard>('/admin/dashboard'), refetchInterval: 60_000 });
  const t = data?.totals;
  const maxSpecialty = Math.max(1, ...(data?.topSpecialties.map((s) => s.bookings) ?? [1]));

  return (
    <>
      <PageHeader title="Dashboard" description="Live overview of bookings, doctors and revenue. Times shown in Asia/Dhaka." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today’s appointments" value={t?.todayAppointments ?? 0} icon={CalendarCheck} loading={isLoading} hint={`${t?.appointments ?? 0} confirmed all-time`} />
        <StatCard label="Active doctors" value={t?.doctors ?? 0} icon={Stethoscope} tone="info" loading={isLoading} hint={`${t?.pendingVerification ?? 0} awaiting verification`} />
        <StatCard label="Registered patients" value={(t?.patients ?? 0).toLocaleString()} icon={Users} tone="success" loading={isLoading} />
        <StatCard label="Revenue (paid)" value={taka(t?.revenue ?? 0)} icon={Banknote} tone="warning" loading={isLoading} hint={`${taka(t?.platformFees ?? 0)} platform fees`} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Bookings — last 14 days" description="New bookings created per day" />
          <div className="h-72 px-2 pb-4 pt-4">
            {isLoading ? (
              <Skeleton className="mx-4 h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.chart} margin={{ left: -12, right: 12, top: 4 }}>
                  <defs>
                    <linearGradient id="bk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="day" tickFormatter={fmtShortDay} tick={{ fill: 'var(--muted)', fontSize: 12 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
                  <YAxis allowDecimals={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13 }}
                    labelFormatter={(d) => fmtShortDay(String(d))}
                    formatter={(v) => [v as number, 'Bookings']}
                  />
                  <Area type="monotone" dataKey="bookings" stroke="var(--chart-1)" strokeWidth={2.2} fill="url(#bk)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Top specialties" description="By number of bookings" />
          <div className="space-y-4 p-5">
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8" />)}
            {data?.topSpecialties.map((s) => (
              <div key={s.id}>
                <div className="mb-1.5 flex items-baseline justify-between text-sm">
                  <span className="font-medium">
                    {s.nameEn} <span className="bn ml-1 text-xs font-normal text-muted">{s.nameBn}</span>
                  </span>
                  <span className="tabular-nums text-muted">{s.bookings}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(4, (s.bookings / maxSpecialty) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Recent bookings"
            action={
              <Link href="/appointments" className="text-sm font-medium text-primary hover:underline">
                View all
              </Link>
            }
          />
          {isLoading ? (
            <div className="space-y-3 p-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : !data?.recent.length ? (
            <EmptyState icon={CalendarCheck} title="No bookings yet" description="Bookings made in the patient app will appear here." />
          ) : (
            <ul className="divide-y divide-border">
              {data.recent.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar name={a.doctor.nameEn} src={a.doctor.photoUrl} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {a.patientName} <span className="font-normal text-muted">with</span> {a.doctor.nameEn}
                    </p>
                    <p className="text-xs text-muted">
                      <span className="font-mono">{a.code}</span> · {TYPE_LABEL[a.type]} · {fmtDateTime(a.scheduledAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge tone={APPOINTMENT_STATUS[a.status].tone} dot>
                      {APPOINTMENT_STATUS[a.status].label}
                    </Badge>
                    <p className="mt-1 text-xs tabular-nums text-muted">{taka(a.totalAmount)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Needs attention" />
          <div className="space-y-2 p-3">
            <AttentionItem href="/doctors?verificationStatus=PENDING" icon={BadgeCheck} label="Doctors awaiting verification" count={t?.pendingVerification} tone="warning" />
            <AttentionItem href="/appointments?status=PENDING_PAYMENT" icon={Clock} label="Bookings awaiting payment" count={t?.pendingPayment} tone="info" />
          </div>
          <p className="border-t border-border px-5 py-3 text-xs leading-relaxed text-muted">
            Doctors appear in the patient app only when they are <b>Active</b> and <b>Verified</b>. Unpaid bookings release their slot automatically after the hold expires.
          </p>
        </Card>
      </div>
    </>
  );
}

function AttentionItem({ href, icon: Icon, label, count, tone }: { href: string; icon: typeof Clock; label: string; count?: number; tone: 'warning' | 'info' }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-surface-muted">
      <span className={tone === 'warning' ? 'flex size-8 items-center justify-center rounded-lg bg-warning-soft text-warning' : 'flex size-8 items-center justify-center rounded-lg bg-info-soft text-info'}>
        <Icon className="size-4" />
      </span>
      <span className="flex-1 text-sm">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{count ?? '—'}</span>
    </Link>
  );
}

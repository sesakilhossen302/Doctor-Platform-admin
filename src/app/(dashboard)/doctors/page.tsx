'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { BadgeCheck, Plus, Star, Stethoscope } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState, PageHeader, Pagination, SearchInput, TableSkeleton } from '@/components/ui/page';
import { Avatar, Badge, Card, Select, Table, Td, Th } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import type { DoctorCard, Paginated, Specialty } from '@/lib/types';
import { DOCTOR_STATUS, taka, VERIFICATION_STATUS } from '@/lib/utils';

export default function DoctorsPage() {
  return (
    <Suspense>
      <Doctors />
    </Suspense>
  );
}

function Doctors() {
  const router = useRouter();
  const sp = useSearchParams();
  const filters = {
    q: sp.get('q') ?? '',
    status: sp.get('status') ?? '',
    verificationStatus: sp.get('verificationStatus') ?? '',
    specialtyId: sp.get('specialtyId') ?? '',
    page: Number(sp.get('page') ?? 1),
  };

  const setFilter = useCallback(
    (key: string, value: string | number) => {
      const next = new URLSearchParams(sp.toString());
      if (value === '' || value === undefined) next.delete(key);
      else next.set(key, String(value));
      if (key !== 'page') next.delete('page');
      router.replace(`/doctors?${next.toString()}`);
    },
    [router, sp],
  );

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['doctors', filters],
    queryFn: () => api<Paginated<DoctorCard>>('/admin/doctors', { query: { ...filters, limit: 15 } }),
    placeholderData: keepPreviousData,
  });
  const { data: specialties } = useQuery({ queryKey: ['specialties-admin'], queryFn: () => api<Specialty[]>('/admin/specialties') });

  return (
    <>
      <PageHeader
        title="Doctors"
        description="Add doctors, verify credentials and manage chambers and schedules."
        actions={
          <Link href="/doctors/new" className={buttonVariants()}>
            <Plus /> Add doctor
          </Link>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center">
          <SearchInput value={filters.q} onChange={(v) => setFilter('q', v)} placeholder="Search name or BMDC number…" className="md:w-80" />
          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3 md:flex md:justify-end">
            <Select value={filters.specialtyId} onChange={(e) => setFilter('specialtyId', e.target.value)} className="md:w-48">
              <option value="">All specialties</option>
              {specialties?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nameEn}
                </option>
              ))}
            </Select>
            <Select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className="md:w-36">
              <option value="">All statuses</option>
              {Object.entries(DOCTOR_STATUS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </Select>
            <Select value={filters.verificationStatus} onChange={(e) => setFilter('verificationStatus', e.target.value)} className="md:w-44">
              <option value="">Any verification</option>
              {Object.entries(VERIFICATION_STATUS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {isLoading ? (
          <TableSkeleton cols={6} />
        ) : !data?.items.length ? (
          <EmptyState
            icon={Stethoscope}
            title="No doctors found"
            description="Try a different search or filter, or add a new doctor."
            action={
              <Link href="/doctors/new" className={buttonVariants({ variant: 'secondary' })}>
                <Plus /> Add doctor
              </Link>
            }
          />
        ) : (
          <div className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            <Table>
              <thead>
                <tr>
                  <Th>Doctor</Th>
                  <Th>Specialty</Th>
                  <Th>Location</Th>
                  <Th className="text-right">Fees</Th>
                  <Th>Rating</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((d) => {
                  const primary = d.specialties.find((s) => s.isPrimary) ?? d.specialties[0];
                  return (
                    <tr key={d.id} className="cursor-pointer hover:bg-surface-muted/50" onClick={() => router.push(`/doctors/${d.id}`)}>
                      <Td>
                        <div className="flex items-center gap-3">
                          <Avatar name={d.nameEn} src={d.photoUrl} />
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 font-medium">
                              {d.nameEn}
                              {d.verificationStatus === 'VERIFIED' && <BadgeCheck className="size-4 text-primary" />}
                              {d.isDemo && <Badge className="ml-0.5 text-[10px]">Demo</Badge>}
                            </p>
                            <p className="truncate text-xs text-muted">
                              {d.designation?.nameEn ?? '—'} · {d.degrees}
                            </p>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <span className="text-sm">{primary?.specialty.nameEn ?? '—'}</span>
                        {d.specialties.length > 1 && <span className="ml-1 text-xs text-muted">+{d.specialties.length - 1}</span>}
                      </Td>
                      <Td className="text-sm text-muted">{d.chambers[0]?.district.nameEn ?? 'Online only'}</Td>
                      <Td className="text-right text-sm tabular-nums">
                        <div>{taka(d.chamberFee)}</div>
                        <div className="text-xs text-muted">online {taka(d.onlineFee)}</div>
                      </Td>
                      <Td>
                        <span className="inline-flex items-center gap-1 text-sm tabular-nums">
                          <Star className="size-3.5 fill-amber-400 text-amber-400" />
                          {d.ratingAvg.toFixed(1)}
                          <span className="text-xs text-muted">({d.ratingCount})</span>
                        </span>
                      </Td>
                      <Td>
                        <div className="flex flex-col items-start gap-1">
                          {d.status && (
                            <Badge tone={DOCTOR_STATUS[d.status].tone} dot>
                              {DOCTOR_STATUS[d.status].label}
                            </Badge>
                          )}
                          {d.verificationStatus !== 'VERIFIED' && <Badge tone={VERIFICATION_STATUS[d.verificationStatus].tone}>{VERIFICATION_STATUS[d.verificationStatus].label}</Badge>}
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            <Pagination page={data.page} limit={data.limit} total={data.total} onPage={(p) => setFilter('page', p)} />
          </div>
        )}
      </Card>
    </>
  );
}

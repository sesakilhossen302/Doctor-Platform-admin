'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Briefcase, Layers, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState, PageHeader } from '@/components/ui/page';
import { Badge, Card, CardHeader, Field, Input, Skeleton, Switch, Textarea } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import type { Designation, Specialty } from '@/lib/types';

const ICONS = ['stethoscope', 'heart', 'female', 'baby', 'skin', 'bone', 'brain', 'ear', 'eye', 'stomach', 'mind', 'kidney', 'tooth', 'lungs'];

export default function SpecialtiesPage() {
  const qc = useQueryClient();
  const { data: specialties, isLoading } = useQuery({ queryKey: ['specialties-admin'], queryFn: () => api<Specialty[]>('/admin/specialties') });
  const { data: designations } = useQuery({ queryKey: ['designations-admin'], queryFn: () => api<Designation[]>('/admin/designations') });
  const [editSpec, setEditSpec] = useState<Specialty | 'new' | null>(null);
  const [editDes, setEditDes] = useState<Designation | 'new' | null>(null);

  const toggleSpec = useMutation({
    mutationFn: (s: Specialty) => api(`/admin/specialties/${s.id}`, { method: 'PATCH', body: { isActive: !s.isActive } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['specialties-admin'] }),
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <>
      <PageHeader
        title="Specialties & designations"
        description="Specialty (বিশেষজ্ঞতা) is what a doctor treats. Designation (পদবি) is their academic/professional rank. They are kept separate."
        actions={
          <Button onClick={() => setEditSpec('new')}>
            <Plus /> Add specialty
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : !specialties?.length ? (
        <Card>
          <EmptyState icon={Layers} title="No specialties" />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {specialties.map((s) => (
            <Card key={s.id} className={s.isActive ? 'p-4' : 'p-4 opacity-60'}>
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-xs font-semibold uppercase text-primary">
                  {s.nameEn.slice(0, 2)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{s.nameEn}</p>
                  <p className="bn text-sm text-muted">{s.nameBn}</p>
                  <p className="mt-1 text-xs text-muted">{s._count?.doctors ?? 0} doctors</p>
                </div>
                <div className="flex items-center gap-1">
                  <Switch checked={s.isActive} onChange={() => toggleSpec.mutate(s)} label="Active" />
                  <Button variant="ghost" size="icon-sm" onClick={() => setEditSpec(s)} aria-label="Edit">
                    <Pencil />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-8">
        <CardHeader
          title="Designations"
          description="Ordered by seniority (rank). Shown under the doctor’s name."
          action={
            <Button size="sm" variant="secondary" onClick={() => setEditDes('new')}>
              <Plus /> Add
            </Button>
          }
        />
        {!designations?.length ? (
          <EmptyState icon={Briefcase} title="No designations" />
        ) : (
          <ul className="divide-y divide-border">
            {designations.map((d) => (
              <li key={d.id} className="flex items-center gap-4 px-5 py-3">
                <span className="w-10 text-center text-xs tabular-nums text-muted">{d.rank}</span>
                <div className="flex-1">
                  <p className="font-medium">{d.nameEn}</p>
                  <p className="bn text-sm text-muted">{d.nameBn}</p>
                </div>
                <span className="text-xs text-muted">{d._count?.doctors ?? 0} doctors</span>
                {!d.isActive && <Badge>Inactive</Badge>}
                <Button variant="ghost" size="icon-sm" onClick={() => setEditDes(d)} aria-label="Edit">
                  <Pencil />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {editSpec && <SpecialtyDialog specialty={editSpec === 'new' ? undefined : editSpec} onClose={() => setEditSpec(null)} />}
      {editDes && <DesignationDialog designation={editDes === 'new' ? undefined : editDes} onClose={() => setEditDes(null)} />}
    </>
  );
}

function SpecialtyDialog({ specialty, onClose }: { specialty?: Specialty; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    nameEn: specialty?.nameEn ?? '',
    nameBn: specialty?.nameBn ?? '',
    icon: specialty?.icon ?? 'stethoscope',
    description: specialty?.description ?? '',
    sortOrder: specialty?.sortOrder ?? 0,
  });
  const save = useMutation({
    mutationFn: () =>
      specialty
        ? api(`/admin/specialties/${specialty.id}`, { method: 'PATCH', body: f })
        : api('/admin/specialties', { method: 'POST', body: f }),
    onSuccess: () => {
      toast.success('Specialty saved');
      qc.invalidateQueries({ queryKey: ['specialties-admin'] });
      onClose();
    },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <Dialog
      open
      onClose={onClose}
      title={specialty ? 'Edit specialty' : 'Add specialty'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!f.nameEn.trim() || !f.nameBn.trim()}>
            Save
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name (English)">
          <Input value={f.nameEn} onChange={(e) => setF({ ...f, nameEn: e.target.value })} placeholder="Cardiology" />
        </Field>
        <Field label="নাম (বাংলা)">
          <Input className="bn" value={f.nameBn} onChange={(e) => setF({ ...f, nameBn: e.target.value })} placeholder="হৃদরোগ" />
        </Field>
        <Field label="App icon">
          <select className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm" value={f.icon} onChange={(e) => setF({ ...f, icon: e.target.value })}>
            {ICONS.map((i) => (
              <option key={i}>{i}</option>
            ))}
          </select>
        </Field>
        <Field label="Sort order">
          <Input type="number" value={f.sortOrder} onChange={(e) => setF({ ...f, sortOrder: Number(e.target.value) })} />
        </Field>
        <Field label="Short description" className="sm:col-span-2">
          <Textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </Field>
      </div>
    </Dialog>
  );
}

function DesignationDialog({ designation, onClose }: { designation?: Designation; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ nameEn: designation?.nameEn ?? '', nameBn: designation?.nameBn ?? '', rank: designation?.rank ?? 50, isActive: designation?.isActive ?? true });
  const save = useMutation({
    mutationFn: () =>
      designation ? api(`/admin/designations/${designation.id}`, { method: 'PATCH', body: f }) : api('/admin/designations', { method: 'POST', body: f }),
    onSuccess: () => {
      toast.success('Designation saved');
      qc.invalidateQueries({ queryKey: ['designations-admin'] });
      onClose();
    },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <Dialog
      open
      onClose={onClose}
      title={designation ? 'Edit designation' : 'Add designation'}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!f.nameEn.trim() || !f.nameBn.trim()}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name (English)">
          <Input value={f.nameEn} onChange={(e) => setF({ ...f, nameEn: e.target.value })} placeholder="Associate Professor" />
        </Field>
        <Field label="নাম (বাংলা)">
          <Input className="bn" value={f.nameBn} onChange={(e) => setF({ ...f, nameBn: e.target.value })} placeholder="সহযোগী অধ্যাপক" />
        </Field>
        <Field label="Seniority rank" hint="higher = more senior">
          <Input type="number" value={f.rank} onChange={(e) => setF({ ...f, rank: Number(e.target.value) })} />
        </Field>
        <div className="flex items-center justify-between">
          <span className="text-sm">Active</span>
          <Switch checked={f.isActive} onChange={(v) => setF({ ...f, isActive: v })} />
        </div>
      </div>
    </Dialog>
  );
}

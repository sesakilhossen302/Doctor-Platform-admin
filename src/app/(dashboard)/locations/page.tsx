'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, MapPin, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState, PageHeader } from '@/components/ui/page';
import { Badge, Card, Field, Input, Skeleton, Switch } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import type { District, Division, Upazila } from '@/lib/types';
import { cn } from '@/lib/utils';

type Level = 'divisions' | 'districts' | 'upazilas';
type Row = Division | District | Upazila;

export default function LocationsPage() {
  const [divisionId, setDivisionId] = useState<number | null>(null);
  const [districtId, setDistrictId] = useState<number | null>(null);
  const [editing, setEditing] = useState<{ level: Level; row?: Row; parentId?: number } | null>(null);

  const divisions = useQuery({ queryKey: ['loc', 'divisions'], queryFn: () => api<Division[]>('/admin/locations/divisions') });
  const districts = useQuery({
    queryKey: ['loc', 'districts', divisionId],
    queryFn: () => api<District[]>('/admin/locations/districts', { query: { parentId: divisionId } }),
    enabled: !!divisionId,
  });
  const upazilas = useQuery({
    queryKey: ['loc', 'upazilas', districtId],
    queryFn: () => api<Upazila[]>('/admin/locations/upazilas', { query: { parentId: districtId } }),
    enabled: !!districtId,
  });

  const division = divisions.data?.find((d) => d.id === divisionId);
  const district = districts.data?.find((d) => d.id === districtId);

  return (
    <>
      <PageHeader title="Locations" description="বাংলাদেশ → বিভাগ → জেলা → উপজেলা/শহর. Inactive locations are hidden from the patient app." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Column
          title="Divisions"
          subtitle="বিভাগ"
          level="divisions"
          rows={divisions.data}
          loading={divisions.isLoading}
          selectedId={divisionId}
          onSelect={(id) => {
            setDivisionId(id);
            setDistrictId(null);
          }}
          onAdd={() => setEditing({ level: 'divisions' })}
          onEdit={(row) => setEditing({ level: 'divisions', row })}
          count={(r) => (r as Division)._count?.districts}
        />
        <Column
          title={division ? `Districts in ${division.nameEn}` : 'Districts'}
          subtitle="জেলা"
          level="districts"
          rows={divisionId ? districts.data : undefined}
          loading={!!divisionId && districts.isLoading}
          emptyHint="Select a division"
          selectedId={districtId}
          onSelect={setDistrictId}
          onAdd={divisionId ? () => setEditing({ level: 'districts', parentId: divisionId }) : undefined}
          onEdit={(row) => setEditing({ level: 'districts', row })}
          count={(r) => (r as District)._count?.upazilas}
        />
        <Column
          title={district ? `Upazilas / cities in ${district.nameEn}` : 'Upazilas / cities'}
          subtitle="উপজেলা / শহর"
          level="upazilas"
          rows={districtId ? upazilas.data : undefined}
          loading={!!districtId && upazilas.isLoading}
          emptyHint="Select a district"
          onAdd={districtId ? () => setEditing({ level: 'upazilas', parentId: districtId }) : undefined}
          onEdit={(row) => setEditing({ level: 'upazilas', row })}
        />
      </div>
      {editing && <LocationDialog {...editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function Column({
  title,
  subtitle,
  level,
  rows,
  loading,
  emptyHint,
  selectedId,
  onSelect,
  onAdd,
  onEdit,
  count,
}: {
  title: string;
  subtitle: string;
  level: Level;
  rows?: Row[];
  loading?: boolean;
  emptyHint?: string;
  selectedId?: number | null;
  onSelect?: (id: number) => void;
  onAdd?: () => void;
  onEdit: (row: Row) => void;
  count?: (r: Row) => number | undefined;
}) {
  const qc = useQueryClient();
  const toggle = useMutation({
    mutationFn: (r: Row) => api(`/admin/locations/${level}/${r.id}`, { method: 'PATCH', body: { isActive: !r.isActive } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loc', level] }),
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Card className="flex max-h-[70vh] flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="bn text-xs text-muted">{subtitle}</p>
        </div>
        {onAdd && (
          <Button size="sm" variant="secondary" onClick={onAdd}>
            <Plus /> Add
          </Button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="space-y-2 p-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : !rows ? (
          <EmptyState icon={MapPin} title={emptyHint ?? 'Nothing here'} />
        ) : !rows.length ? (
          <EmptyState icon={MapPin} title="None yet" description="Add the first one." />
        ) : (
          rows.map((r) => (
            <div
              key={r.id}
              onClick={() => onSelect?.(r.id)}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2',
                onSelect && 'cursor-pointer',
                selectedId === r.id ? 'bg-primary-soft' : 'hover:bg-surface-muted',
                !r.isActive && 'opacity-55',
              )}
            >
              <div className="min-w-0 flex-1">
                <p className={cn('truncate text-sm', selectedId === r.id && 'font-medium text-primary')}>
                  {r.nameEn} {'isCity' in r && r.isCity && <Badge tone="info" className="ml-1 text-[10px]">City</Badge>}
                </p>
                <p className="bn truncate text-xs text-muted">{r.nameBn}</p>
              </div>
              {count?.(r) !== undefined && <span className="text-xs tabular-nums text-muted">{count(r)}</span>}
              <span onClick={(e) => e.stopPropagation()} className="flex items-center gap-1">
                <Switch checked={r.isActive} onChange={() => toggle.mutate(r)} label="Active" />
                <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100" onClick={() => onEdit(r)} aria-label="Edit">
                  <Pencil />
                </Button>
              </span>
              {onSelect && <ChevronRight className="size-4 text-muted" />}
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

function LocationDialog({ level, row, parentId, onClose }: { level: Level; row?: Row; parentId?: number; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    nameEn: row?.nameEn ?? '',
    nameBn: row?.nameBn ?? '',
    sortOrder: row?.sortOrder ?? 0,
    isCity: row && 'isCity' in row ? row.isCity : false,
  });
  const save = useMutation({
    mutationFn: () => {
      const body = { nameEn: f.nameEn, nameBn: f.nameBn, sortOrder: f.sortOrder, ...(level === 'upazilas' && { isCity: f.isCity }) };
      return row
        ? api(`/admin/locations/${level}/${row.id}`, { method: 'PATCH', body })
        : api(`/admin/locations/${level}`, { method: 'POST', body: { ...body, parentId } });
    },
    onSuccess: () => {
      toast.success('Saved');
      qc.invalidateQueries({ queryKey: ['loc'] });
      onClose();
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const noun = { divisions: 'division', districts: 'district', upazilas: 'upazila / city' }[level];
  return (
    <Dialog
      open
      onClose={onClose}
      size="sm"
      title={`${row ? 'Edit' : 'Add'} ${noun}`}
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
          <Input value={f.nameEn} onChange={(e) => setF({ ...f, nameEn: e.target.value })} />
        </Field>
        <Field label="নাম (বাংলা)">
          <Input className="bn" value={f.nameBn} onChange={(e) => setF({ ...f, nameBn: e.target.value })} />
        </Field>
        <Field label="Sort order">
          <Input type="number" value={f.sortOrder} onChange={(e) => setF({ ...f, sortOrder: Number(e.target.value) })} />
        </Field>
        {level === 'upazilas' && (
          <div className="flex items-center justify-between">
            <span className="text-sm">This is a city / city-corporation area</span>
            <Switch checked={f.isCity} onChange={(v) => setF({ ...f, isCity: v })} />
          </div>
        )}
      </div>
    </Dialog>
  );
}

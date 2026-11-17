'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input, Select, Switch } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import type { Chamber, District, Division, Hospital, Upazila } from '@/lib/types';

export function ChamberDialog({ doctorId, chamber, onClose, onSaved }: { doctorId: string; chamber?: Chamber; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: chamber?.name ?? '',
    address: chamber?.address ?? '',
    divisionId: chamber?.divisionId ?? 0,
    districtId: chamber?.districtId ?? 0,
    upazilaId: chamber?.upazilaId ?? 0,
    hospitalId: chamber?.hospitalId ?? 0,
    isActive: chamber?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const { data: divisions } = useQuery({ queryKey: ['loc', 'divisions'], queryFn: () => api<Division[]>('/admin/locations/divisions') });
  const { data: districts } = useQuery({
    queryKey: ['loc', 'districts', form.divisionId],
    queryFn: () => api<District[]>('/admin/locations/districts', { query: { parentId: form.divisionId } }),
    enabled: !!form.divisionId,
  });
  const { data: upazilas } = useQuery({
    queryKey: ['loc', 'upazilas', form.districtId],
    queryFn: () => api<Upazila[]>('/admin/locations/upazilas', { query: { parentId: form.districtId } }),
    enabled: !!form.districtId,
  });
  const { data: hospitals } = useQuery({
    queryKey: ['hospitals', form.districtId],
    queryFn: () => api<Hospital[]>('/admin/hospitals', { query: { districtId: form.districtId } }),
    enabled: !!form.districtId,
  });

  const save = async () => {
    if (!form.name.trim() || !form.divisionId || !form.districtId) {
      toast.error('Name, division and district are required');
      return;
    }
    setSaving(true);
    const body = {
      name: form.name.trim(),
      address: form.address.trim() || undefined,
      divisionId: form.divisionId,
      districtId: form.districtId,
      upazilaId: form.upazilaId || undefined,
      hospitalId: form.hospitalId || undefined,
      isActive: form.isActive,
    };
    try {
      if (chamber) await api(`/admin/doctors/${doctorId}/chambers/${chamber.id}`, { method: 'PATCH', body });
      else await api(`/admin/doctors/${doctorId}/chambers`, { method: 'POST', body });
      toast.success(chamber ? 'Chamber updated' : 'Chamber added');
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={chamber ? 'Edit chamber' : 'Add chamber'}
      description="Division → District → Upazila/City. Patients filter doctors by these."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            {chamber ? 'Save' : 'Add chamber'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Division">
          <Select value={form.divisionId} onChange={(e) => set({ divisionId: Number(e.target.value), districtId: 0, upazilaId: 0, hospitalId: 0 })}>
            <option value={0}>— Select —</option>
            {divisions?.filter((d) => d.isActive).map((d) => (
              <option key={d.id} value={d.id}>
                {d.nameEn} · {d.nameBn}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="District">
          <Select value={form.districtId} disabled={!form.divisionId} onChange={(e) => set({ districtId: Number(e.target.value), upazilaId: 0, hospitalId: 0 })}>
            <option value={0}>— Select —</option>
            {districts?.filter((d) => d.isActive).map((d) => (
              <option key={d.id} value={d.id}>
                {d.nameEn} · {d.nameBn}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Upazila / City" hint="optional">
          <Select value={form.upazilaId} disabled={!form.districtId} onChange={(e) => set({ upazilaId: Number(e.target.value) })}>
            <option value={0}>— None —</option>
            {upazilas?.filter((u) => u.isActive).map((u) => (
              <option key={u.id} value={u.id}>
                {u.nameEn}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Hospital" hint="optional">
          <Select
            value={form.hospitalId}
            disabled={!form.districtId}
            onChange={(e) => {
              const h = hospitals?.find((x) => x.id === Number(e.target.value));
              set({ hospitalId: Number(e.target.value), ...(h && !form.name && { name: h.name, address: h.address ?? '' }) });
            }}
          >
            <option value={0}>— Private chamber —</option>
            {hospitals?.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Chamber name" className="sm:col-span-2">
          <Input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Popular Diagnostic, Room 302" />
        </Field>
        <Field label="Address" className="sm:col-span-2">
          <Input value={form.address} onChange={(e) => set({ address: e.target.value })} placeholder="House, road, area" />
        </Field>
        <div className="flex items-center justify-between rounded-lg bg-surface-muted px-3 py-2.5 sm:col-span-2">
          <span className="text-sm">Active — open for bookings</span>
          <Switch checked={form.isActive} onChange={(v) => set({ isActive: v })} label="Active" />
        </div>
      </div>
    </Dialog>
  );
}

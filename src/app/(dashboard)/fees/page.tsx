'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page';
import { Card, CardHeader, Input, Select, Skeleton, Switch } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import type { FeeSetting } from '@/lib/types';
import { fmtDateTime, taka } from '@/lib/utils';

const META: Record<FeeSetting['serviceType'], { title: string; description: string }> = {
  APPOINTMENT_CHAMBER: { title: 'Chamber appointment', description: 'Booking a visit at the doctor’s chamber' },
  APPOINTMENT_ONLINE: { title: 'Online consultation', description: 'Scheduled audio or video consultation' },
  INSTANT_CALL: { title: 'Instant call', description: 'On-demand call through the call center' },
};
const ORDER: FeeSetting['serviceType'][] = ['APPOINTMENT_CHAMBER', 'APPOINTMENT_ONLINE', 'INSTANT_CALL'];
const EXAMPLE_FEE = 500;

export default function FeesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['fees'], queryFn: () => api<FeeSetting[]>('/admin/fees') });
  const [rows, setRows] = useState<Record<string, Pick<FeeSetting, 'serviceType' | 'mode' | 'value' | 'isActive'>>>({});

  useEffect(() => {
    if (!data) return;
    const init: typeof rows = {};
    for (const t of ORDER) {
      const s = data.find((x) => x.serviceType === t);
      init[t] = { serviceType: t, mode: s?.mode ?? 'FIXED', value: s?.value ?? 0, isActive: s?.isActive ?? true };
    }
    setRows(init);
  }, [data]);

  const save = useMutation({
    mutationFn: () => api('/admin/fees', { method: 'PUT', body: { settings: Object.values(rows) } }),
    onSuccess: () => {
      toast.success('Platform fees updated — new bookings use these immediately');
      qc.invalidateQueries({ queryKey: ['fees'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const lastUpdated = data?.reduce<string | null>((m, s) => (!m || s.updatedAt > m ? s.updatedAt : m), null);

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Platform fees"
        description="Charged on top of the doctor’s fee and shown as a separate line at checkout. Always calculated on the server."
        actions={
          <Button onClick={() => save.mutate()} loading={save.isPending} disabled={isLoading}>
            Save changes
          </Button>
        }
      />
      <Card>
        <CardHeader title="Fee rules" description={lastUpdated ? `Last changed ${fmtDateTime(lastUpdated)} · all changes are audit-logged` : undefined} />
        {isLoading || !Object.keys(rows).length ? (
          <div className="space-y-3 p-5">{ORDER.map((t) => <Skeleton key={t} className="h-16" />)}</div>
        ) : (
          <div className="divide-y divide-border">
            {ORDER.map((t) => {
              const r = rows[t];
              const fee = r.mode === 'FIXED' ? r.value : Math.round((EXAMPLE_FEE * r.value) / 100);
              const set = (patch: Partial<typeof r>) => setRows((all) => ({ ...all, [t]: { ...r, ...patch } }));
              return (
                <div key={t} className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
                  <div>
                    <p className="font-medium">{META[t].title}</p>
                    <p className="text-sm text-muted">{META[t].description}</p>
                    <p className="mt-1 text-xs text-muted">
                      Example: doctor fee {taka(EXAMPLE_FEE)} + platform fee {taka(r.isActive ? fee : 0)} = <b className="text-foreground">{taka(EXAMPLE_FEE + (r.isActive ? fee : 0))}</b>
                    </p>
                  </div>
                  <Select value={r.mode} onChange={(e) => set({ mode: e.target.value as 'FIXED' | 'PERCENT' })} className="md:w-36" aria-label="Fee type">
                    <option value="FIXED">Fixed (৳)</option>
                    <option value="PERCENT">Percent (%)</option>
                  </Select>
                  <div className="relative md:w-32">
                    <Input type="number" min={0} max={r.mode === 'PERCENT' ? 100 : undefined} value={r.value} onChange={(e) => set({ value: Number(e.target.value) })} className="pr-8" aria-label="Value" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">{r.mode === 'FIXED' ? '৳' : '%'}</span>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch checked={r.isActive} onChange={(v) => set({ isActive: v })} label="Enabled" /> Enabled
                  </label>
                </div>
              );
            })}
          </div>
        )}
      </Card>
      <p className="mt-4 text-sm text-muted">
        Who bears the platform fee and how money is settled between the platform and doctors still needs the client’s written confirmation (see spec §20).
      </p>
    </div>
  );
}

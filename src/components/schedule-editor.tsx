'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, Input, Select } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import type { ConsultationType, DoctorDetail, Schedule } from '@/lib/types';
import { cn, DAYS } from '@/lib/utils';

// Bangladesh work-week order: Saturday first.
const ORDER = [6, 0, 1, 2, 3, 4, 5];
const SLOT_OPTIONS = [10, 15, 20, 30, 45, 60];

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

export function ScheduleEditor({ doctor, onSaved }: { doctor: DoctorDetail; onSaved: () => void }) {
  const [rows, setRows] = useState<Schedule[]>(() =>
    doctor.schedules.map(({ type, chamberId, dayOfWeek, startTime, endTime, slotMinutes }) => ({ type, chamberId, dayOfWeek, startTime, endTime, slotMinutes })),
  );
  const [saving, setSaving] = useState(false);
  const canOnline = doctor.consultationTypes.some((t) => t !== 'CHAMBER');
  const canChamber = doctor.consultationTypes.includes('CHAMBER') && doctor.chambers.length > 0;
  const activeChambers = doctor.chambers.filter((c) => c.isActive);

  const add = (dayOfWeek: number) => {
    const type: ConsultationType = canChamber ? 'CHAMBER' : 'ONLINE_VIDEO';
    setRows((r) => [
      ...r,
      { dayOfWeek, type, chamberId: type === 'CHAMBER' ? (activeChambers[0]?.id ?? null) : null, startTime: '17:00', endTime: '21:00', slotMinutes: 15 },
    ]);
  };
  const update = (i: number, patch: Partial<Schedule>) => setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const remove = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i));

  const copyToWeekdays = (day: number) => {
    const source = rows.filter((r) => r.dayOfWeek === day);
    const targets = [6, 0, 1, 2, 3, 4].filter((d) => d !== day);
    setRows((r) => [...r.filter((x) => !targets.includes(x.dayOfWeek)), ...targets.flatMap((d) => source.map((s) => ({ ...s, dayOfWeek: d })))]);
    toast.info(`Copied ${DAYS[day]} to Saturday–Thursday`);
  };

  const errorFor = (row: Schedule, i: number): string | null => {
    const s = toMin(row.startTime);
    const e = toMin(row.endTime);
    if (e - s < row.slotMinutes) return 'End must be after start';
    if (row.type === 'CHAMBER' && !row.chamberId) return 'Choose a chamber';
    const overlap = rows.some((o, j) => j !== i && o.dayOfWeek === row.dayOfWeek && toMin(o.startTime) < e && s < toMin(o.endTime));
    return overlap ? 'Overlaps another block' : null;
  };
  const hasErrors = rows.some((r, i) => errorFor(r, i));

  const save = async () => {
    setSaving(true);
    try {
      await api(`/admin/doctors/${doctor.id}/schedules`, {
        method: 'PUT',
        body: { schedules: rows.map((r) => ({ ...r, chamberId: r.type === 'CHAMBER' ? r.chamberId : undefined })) },
      });
      toast.success('Schedule saved — new slots are live');
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const totalSlots = rows.reduce((n, r) => n + Math.max(0, Math.floor((toMin(r.endTime) - toMin(r.startTime)) / r.slotMinutes)), 0);

  return (
    <Card className="max-w-5xl">
      <CardHeader
        title="Weekly schedule"
        description={`Times are Asia/Dhaka. ${totalSlots} bookable slots per week. Online audio & video share the online blocks.`}
        action={
          <Button onClick={save} loading={saving} disabled={hasErrors}>
            Save schedule
          </Button>
        }
      />
      {!canChamber && doctor.consultationTypes.includes('CHAMBER') && (
        <p className="mx-5 mt-4 rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning">Add a chamber first to create chamber-visit blocks.</p>
      )}
      <div className="divide-y divide-border">
        {ORDER.map((day) => {
          const dayRows = rows.map((r, i) => ({ r, i })).filter(({ r }) => r.dayOfWeek === day);
          return (
            <div key={day} className="flex flex-col gap-3 px-5 py-4 md:flex-row">
              <div className="w-32 shrink-0 pt-1.5">
                <p className="font-medium">{DAYS[day]}</p>
                {dayRows.length === 0 && <p className="text-xs text-muted">Off</p>}
              </div>
              <div className="flex-1 space-y-2">
                {dayRows.map(({ r, i }) => {
                  const err = errorFor(r, i);
                  return (
                    <div key={i}>
                      <div className={cn('flex flex-wrap items-center gap-2 rounded-lg border p-2', err ? 'border-danger/50 bg-danger-soft/40' : 'border-border bg-surface-muted/40')}>
                        <Select
                          value={r.type === 'CHAMBER' ? 'CHAMBER' : 'ONLINE'}
                          onChange={(e) =>
                            update(i, e.target.value === 'CHAMBER' ? { type: 'CHAMBER', chamberId: activeChambers[0]?.id ?? null } : { type: 'ONLINE_VIDEO', chamberId: null })
                          }
                          className="w-36"
                        >
                          {canChamber && <option value="CHAMBER">Chamber</option>}
                          {canOnline && <option value="ONLINE">Online</option>}
                        </Select>
                        {r.type === 'CHAMBER' && (
                          <Select value={r.chamberId ?? ''} onChange={(e) => update(i, { chamberId: e.target.value })} className="w-52">
                            {activeChambers.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </Select>
                        )}
                        <Input type="time" value={r.startTime} onChange={(e) => update(i, { startTime: e.target.value })} className="w-32" aria-label="Start" />
                        <span className="text-muted">–</span>
                        <Input type="time" value={r.endTime} onChange={(e) => update(i, { endTime: e.target.value })} className="w-32" aria-label="End" />
                        <Select value={r.slotMinutes} onChange={(e) => update(i, { slotMinutes: Number(e.target.value) })} className="w-28" aria-label="Slot length">
                          {SLOT_OPTIONS.map((m) => (
                            <option key={m} value={m}>
                              {m} min
                            </option>
                          ))}
                        </Select>
                        <Button variant="ghost" size="icon-sm" onClick={() => remove(i)} aria-label="Remove block" className="ml-auto">
                          <Trash2 />
                        </Button>
                      </div>
                      {err && <p className="mt-1 text-xs text-danger">{err}</p>}
                    </div>
                  );
                })}
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => add(day)} disabled={!canChamber && !canOnline}>
                    <Plus /> Add block
                  </Button>
                  {dayRows.length > 0 && day !== 5 && (
                    <Button variant="ghost" size="sm" onClick={() => copyToWeekdays(day)}>
                      Copy to Sat–Thu
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

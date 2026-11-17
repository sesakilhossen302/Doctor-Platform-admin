'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleAlert, Headphones, Mic, MicOff, PhoneCall, PhoneForwarded, PhoneOff, Radio, Stethoscope, Timer } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { EmptyState, PageHeader } from '@/components/ui/page';
import { Avatar, Badge, Card, CardHeader, Select, Skeleton, Textarea, type Tone } from '@/components/ui/primitives';
import { AgentCall, type CallState } from '@/lib/agora-call';
import { api, session } from '@/lib/api';
import { useRealtime } from '@/lib/realtime';
import type { AvailableDoctor, CallRequest, CallRequestStatus, ConsultationStatus, Specialty } from '@/lib/types';
import { cn, fmtTime, taka } from '@/lib/utils';

const STATUS: Record<CallRequestStatus, { label: string; tone: Tone }> = {
  PAYMENT_PENDING: { label: 'Awaiting payment', tone: 'neutral' },
  QUEUED: { label: 'Waiting', tone: 'warning' },
  CONNECTED: { label: 'With agent', tone: 'info' },
  TRANSFERRED: { label: 'With doctor', tone: 'success' },
  COMPLETED: { label: 'Completed', tone: 'neutral' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
  FAILED: { label: 'Failed', tone: 'danger' },
};
const LEG: Record<ConsultationStatus, { label: string; tone: Tone }> = {
  RINGING: { label: 'Ringing…', tone: 'warning' },
  ONGOING: { label: 'On call', tone: 'success' },
  ENDED: { label: 'Ended', tone: 'neutral' },
  REJECTED: { label: 'Declined', tone: 'danger' },
  MISSED: { label: 'No answer', tone: 'danger' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
};

function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

const since = (iso: string | null, now: number) => {
  if (!iso) return '—';
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export default function CallCenterPage() {
  const qc = useQueryClient();
  const me = session.user;
  const now = useNow();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: queue, isLoading } = useQuery({
    queryKey: ['cc-queue'],
    queryFn: () => api<CallRequest[]>('/call-center/queue'),
    refetchInterval: 15_000, // safety net; realtime events refresh instantly
  });
  const { data: agora } = useQuery({ queryKey: ['agora-config'], queryFn: () => api<{ configured: boolean }>('/calls/config') });

  const refresh = useCallback(() => qc.invalidateQueries({ queryKey: ['cc-queue'] }), [qc]);
  useRealtime('queue:changed', refresh);
  useRealtime('call:status', refresh);
  useRealtime('callrequest:status', refresh);

  // New-call chime + toast for waiting calls.
  const waitingCount = queue?.filter((q) => q.status === 'QUEUED').length ?? 0;
  const prevWaiting = useRef(0);
  useEffect(() => {
    if (waitingCount > prevWaiting.current) toast.info('New call waiting in the queue');
    prevWaiting.current = waitingCount;
  }, [waitingCount]);

  const selected = queue?.find((q) => q.id === selectedId) ?? null;
  const mine = queue?.find((q) => q.agent?.id === me?.id && (q.status === 'CONNECTED' || q.status === 'TRANSFERRED'));
  useEffect(() => {
    if (!selectedId && mine) setSelectedId(mine.id);
  }, [mine, selectedId]);

  const accept = useMutation({
    mutationFn: (id: string) => api<CallRequest>(`/call-center/${id}/accept`, { method: 'POST' }),
    onSuccess: (r) => {
      setSelectedId(r.id);
      refresh();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <>
      <PageHeader
        title="Call center"
        description="Paid instant calls wait here. Accept a call to talk to the patient, then transfer to an available doctor."
        actions={
          <span className="inline-flex items-center gap-2 rounded-full bg-success-soft px-3 py-1.5 text-sm font-medium text-success">
            <Radio className="size-4" /> Live
          </span>
        }
      />

      {agora && !agora.configured && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <p>
            Voice is not connected yet: set <code className="font-mono">AGORA_APP_ID</code> and <code className="font-mono">AGORA_APP_CERTIFICATE</code> in{' '}
            <code className="font-mono">Backend/.env</code> and restart the API. Queue, accept, notes and transfer still work.
          </p>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <Card className="flex max-h-[calc(100vh-220px)] min-h-96 flex-col">
          <CardHeader title="Queue" description={`${waitingCount} waiting · oldest first`} />
          <div className="flex-1 overflow-y-auto p-2">
            {isLoading ? (
              <div className="space-y-2 p-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
            ) : !queue?.length ? (
              <EmptyState icon={Headphones} title="No calls right now" description="Paid instant calls from the patient app appear here instantly." />
            ) : (
              queue.map((r) => {
                const isMine = r.agent?.id === me?.id;
                return (
                  <div
                    key={r.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedId(r.id)}
                    onKeyDown={(e) => e.key === 'Enter' && setSelectedId(r.id)}
                    className={cn(
                      'mb-1.5 w-full cursor-pointer rounded-xl border px-3 py-3 text-left transition-colors',
                      selectedId === r.id ? 'border-primary bg-primary-soft' : 'border-transparent hover:bg-surface-muted',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={r.patient.name ?? r.patient.phone} size={36} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{r.patient.name ?? r.patient.phone}</p>
                        <p className="truncate text-xs text-muted">
                          <span className="font-mono">{r.code}</span> · {r.media === 'VIDEO' ? 'Video' : 'Audio'}
                          {r.agent && !isMine && ` · ${r.agent.name}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge tone={STATUS[r.status].tone} dot>
                          {STATUS[r.status].label}
                        </Badge>
                        <p className="mt-1 inline-flex items-center gap-1 text-xs tabular-nums text-muted">
                          <Timer className="size-3" /> {since(r.status === 'QUEUED' ? r.queuedAt : r.connectedAt, now)}
                        </p>
                      </div>
                    </div>
                    {r.reason && <p className="mt-2 line-clamp-2 text-xs text-muted">“{r.reason}”</p>}
                    {r.status === 'QUEUED' && (
                      <Button
                        size="sm"
                        className="mt-2 w-full"
                        loading={accept.isPending && accept.variables === r.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          accept.mutate(r.id);
                        }}
                      >
                        <PhoneCall /> Accept call
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {selected ? (
          <CallPanel key={selected.id} request={selected} isMine={selected.agent?.id === me?.id} onChanged={refresh} agoraReady={!!agora?.configured} />
        ) : (
          <Card className="flex items-center justify-center">
            <EmptyState icon={PhoneCall} title="Select a call" description="Accept a waiting call from the queue to start talking to the patient." />
          </Card>
        )}
      </div>
    </>
  );
}

function CallPanel({ request: r, isMine, onChanged, agoraReady }: { request: CallRequest; isMine: boolean; onChanged: () => void; agoraReady: boolean }) {
  const now = useNow();
  const [state, setState] = useState<CallState>('idle');
  const [, force] = useState(0);
  const call = useMemo(() => new AgentCall(), []);
  const [notes, setNotes] = useState(r.notes ?? '');
  const [specialtyId, setSpecialtyId] = useState('');
  const active = r.status === 'CONNECTED' || r.status === 'TRANSFERRED';

  // Join the voice channel automatically while this agent owns an active call.
  useEffect(() => {
    call.onChange = () => force((n) => n + 1);
    if (!isMine || !active || !agoraReady) return;
    let cancelled = false;
    setState('connecting');
    call
      .join(r.channelName)
      .then(() => !cancelled && setState('connected'))
      .catch((e) => {
        if (!cancelled) {
          setState('error');
          toast.error(`Voice: ${(e as Error).message}`);
        }
      });
    return () => {
      cancelled = true;
      void call.leave();
    };
  }, [call, isMine, active, agoraReady, r.channelName]);

  const { data: specialties } = useQuery({ queryKey: ['specialties-admin'], queryFn: () => api<Specialty[]>('/admin/specialties') });
  const { data: doctors, refetch: refetchDoctors } = useQuery({
    queryKey: ['cc-doctors', specialtyId],
    queryFn: () => api<AvailableDoctor[]>('/call-center/doctors', { query: { specialtyId } }),
    enabled: isMine && active,
    refetchInterval: 20_000,
  });

  const saveNotes = useMutation({
    mutationFn: () => api(`/call-center/${r.id}/notes`, { method: 'PATCH', body: { notes } }),
    onSuccess: () => toast.success('Notes saved'),
    onError: (e) => toast.error((e as Error).message),
  });
  const transfer = useMutation({
    mutationFn: (doctorId: string) => api(`/call-center/${r.id}/transfer`, { method: 'POST', body: { doctorId } }),
    onSuccess: () => {
      toast.success('Calling the doctor…');
      onChanged();
      void refetchDoctors();
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const complete = useMutation({
    mutationFn: () => api(`/call-center/${r.id}/complete`, { method: 'POST' }),
    onSuccess: async () => {
      await call.leave();
      setState('idle');
      toast.success('Call completed');
      onChanged();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const ringing = r.consultations.some((c) => c.status === 'RINGING');

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex flex-1 items-center gap-4">
            <Avatar name={r.patient.name ?? r.patient.phone} size={56} />
            <div>
              <h2 className="text-lg font-semibold">{r.patient.name ?? 'Patient'}</h2>
              <p className="text-sm text-muted">
                <span className="font-mono">{r.patient.phone}</span> · <span className="font-mono">{r.code}</span> · paid {taka(r.totalAmount)}
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <Badge tone={STATUS[r.status].tone} dot>
                  {STATUS[r.status].label}
                </Badge>
                {active && <span className="text-xs tabular-nums text-muted">on call {since(r.connectedAt, now)}</span>}
              </div>
            </div>
          </div>
          {isMine && active && (
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium',
                  state === 'connected' ? 'bg-success-soft text-success' : state === 'error' ? 'bg-danger-soft text-danger' : 'bg-surface-muted text-muted',
                )}
              >
                <span className={cn('size-2 rounded-full', state === 'connected' ? 'animate-pulse bg-success' : 'bg-current')} />
                {state === 'connected' ? `Voice connected · ${call.remoteUids.size} other${call.remoteUids.size === 1 ? '' : 's'}` : state === 'connecting' ? 'Connecting voice…' : state === 'error' ? 'Voice error' : agoraReady ? 'Voice idle' : 'Voice not configured'}
              </span>
              <Button variant="secondary" size="icon" disabled={state !== 'connected'} onClick={() => call.setMuted(!call.muted)} aria-label="Mute">
                {call.muted ? <MicOff /> : <Mic />}
              </Button>
              <Button variant="danger" onClick={() => complete.mutate()} loading={complete.isPending}>
                <PhoneOff /> End call
              </Button>
            </div>
          )}
        </div>
        {r.reason && (
          <div className="mt-4 rounded-lg bg-surface-muted px-4 py-3 text-sm">
            <span className="text-muted">Patient’s concern: </span>
            {r.reason}
          </div>
        )}
        {!isMine && active && <p className="mt-4 text-sm text-muted">This call is handled by {r.agent?.name}.</p>}
      </Card>

      {isMine && active && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader
              title="Transfer to a doctor"
              description="Only doctors who are online and not on another call are listed. The doctor joins this same call."
            />
            <div className="border-b border-border p-4">
              <Select value={specialtyId} onChange={(e) => setSpecialtyId(e.target.value)}>
                <option value="">All specialties</option>
                {specialties?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nameEn}
                  </option>
                ))}
              </Select>
            </div>
            <ul className="max-h-80 divide-y divide-border overflow-y-auto">
              {!doctors?.length ? (
                <li>
                  <EmptyState icon={Stethoscope} title="No doctor available" description="Doctors appear here when they switch to “online” in the doctor app." />
                </li>
              ) : (
                doctors.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="relative">
                      <Avatar name={d.nameEn} src={d.photoUrl} size={36} />
                      <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-surface bg-success" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{d.nameEn}</p>
                      <p className="truncate text-xs text-muted">
                        {d.designation?.nameEn} · {d.specialties.find((s) => s.isPrimary)?.specialty.nameEn}
                      </p>
                    </div>
                    <Button size="sm" variant="soft" disabled={ringing} loading={transfer.isPending && transfer.variables === d.id} onClick={() => transfer.mutate(d.id)}>
                      <PhoneForwarded /> Transfer
                    </Button>
                  </li>
                ))
              )}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Call notes" description="Visible to admins in the call history. Do not record diagnoses." />
            <div className="space-y-3 p-4">
              <Textarea rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Symptoms the patient described, urgency, which department…" />
              <div className="flex justify-end">
                <Button size="sm" variant="secondary" onClick={() => saveNotes.mutate()} loading={saveNotes.isPending}>
                  Save notes
                </Button>
              </div>
              <div className="rounded-lg border border-warning/30 bg-warning-soft px-3 py-2.5 text-xs leading-relaxed text-warning">
                <b>Support script:</b> greet, confirm name, ask the main concern and how long, check for emergency signs (chest pain, breathing difficulty, unconsciousness, heavy bleeding → advise 999 / nearest hospital immediately). Never diagnose or prescribe — transfer to a doctor.
              </div>
            </div>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader title="Timeline" />
        <ol className="space-y-3 p-5 text-sm">
          <TimelineRow time={r.createdAt} label="Requested by patient" />
          {r.queuedAt && <TimelineRow time={r.queuedAt} label="Paid — joined the queue" />}
          {r.connectedAt && <TimelineRow time={r.connectedAt} label={`Agent ${r.agent?.name ?? ''} connected`} />}
          {r.consultations.map((c) => (
            <TimelineRow
              key={c.id}
              time={c.ringingAt}
              label={
                <>
                  Transferred to <b>{c.doctor.nameEn}</b>{' '}
                  <Badge tone={LEG[c.status].tone} className="ml-1">
                    {LEG[c.status].label}
                  </Badge>
                  {c.durationSec != null && <span className="ml-1 text-muted">{Math.round(c.durationSec / 60)} min</span>}
                </>
              }
            />
          ))}
          {r.completedAt && <TimelineRow time={r.completedAt} label="Call completed" />}
        </ol>
      </Card>
    </div>
  );
}

function TimelineRow({ time, label }: { time: string; label: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="w-20 shrink-0 tabular-nums text-muted">{fmtTime(time)}</span>
      <span className="relative pl-4 before:absolute before:left-0 before:top-1.5 before:size-2 before:rounded-full before:bg-primary">{label}</span>
    </li>
  );
}

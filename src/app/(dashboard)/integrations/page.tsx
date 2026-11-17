'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRing, CheckCircle2, CircleAlert, ExternalLink, Eye, EyeOff, FlaskConical, Mail, Video, type LucideIcon } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page';
import { Badge, Card, Field, Input, Skeleton, Textarea } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { fmtDateTime } from '@/lib/utils';

type SettingView = { value?: string; isSet: boolean; secret: boolean; updatedAt?: string };
type Integrations = { settings: Record<string, SettingView>; status: { agora: boolean; email: boolean; push: boolean } };

export default function IntegrationsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['integrations'], queryFn: () => api<Integrations>('/admin/settings/integrations') });

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Integrations"
        description="Connect video calls, email login codes and push notifications. Secret values are encrypted on the server and never shown again after saving."
      />
      {isLoading || !data ? (
        <div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-72" />)}</div>
      ) : (
        <div className="space-y-5">
          <AgoraCard data={data} />
          <EmailCard data={data} />
          <FirebaseCard data={data} />
        </div>
      )}
    </div>
  );
}

// ───────────────────────── shared pieces ─────────────────────────

function useSave(onDone?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: Record<string, string>) => api<Integrations>('/admin/settings/integrations', { method: 'PUT', body: { values } }),
    onSuccess: (res) => {
      qc.setQueryData(['integrations'], res);
      toast.success('Saved');
      onDone?.();
    },
    onError: (e) => toast.error((e as Error).message),
  });
}

function useTest(path: string) {
  return useMutation({
    mutationFn: (body?: unknown) => api<{ message: string }>(path, { method: 'POST', body }),
    onSuccess: (r) => toast.success(r.message),
    onError: (e) => toast.error((e as Error).message, { duration: 8000 }),
  });
}

function IntegrationCard({
  icon: Icon,
  title,
  description,
  connected,
  children,
  steps,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  connected: boolean;
  children: ReactNode;
  steps: ReactNode;
}) {
  return (
    <Card>
      <div className="flex items-start gap-4 border-b border-border px-5 py-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Icon className="size-5" />
        </span>
        <div className="flex-1">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold">
            {title}
            {connected ? (
              <Badge tone="success" dot>
                Connected
              </Badge>
            ) : (
              <Badge tone="warning" dot>
                Not set up
              </Badge>
            )}
          </h3>
          <p className="mt-0.5 text-[13px] text-muted">{description}</p>
        </div>
      </div>
      <div className="grid gap-5 p-5 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">{children}</div>
        <details className="rounded-lg bg-surface-muted px-4 py-3 text-[13px] leading-relaxed text-muted lg:open:block" open>
          <summary className="cursor-pointer font-medium text-foreground">How to get these</summary>
          <div className="mt-2 space-y-1.5">{steps}</div>
        </details>
      </div>
    </Card>
  );
}

/** Secret input: shows "saved" state; typing a new value replaces it. */
function SecretField({ label, hint, setting, value, onChange, multiline, placeholder }: {
  label: string;
  hint?: string;
  setting: SettingView;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  const ph = setting.isSet ? '•••••••• saved — type to replace' : placeholder;
  return (
    <Field label={label} hint={hint}>
      {multiline ? (
        <Textarea rows={5} value={value} onChange={(e) => onChange(e.target.value)} placeholder={ph} className="font-mono text-xs" />
      ) : (
        <div className="relative">
          <Input type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} placeholder={ph} className="pr-10 font-mono" autoComplete="off" />
          <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-foreground" aria-label="Show">
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      )}
      {setting.isSet && setting.updatedAt && (
        <p className="mt-1 flex items-center gap-1 text-xs text-success">
          <CheckCircle2 className="size-3.5" /> Saved {fmtDateTime(setting.updatedAt)}
        </p>
      )}
    </Field>
  );
}

const A = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-medium text-primary hover:underline">
    {children}
    <ExternalLink className="size-3" />
  </a>
);

// ───────────────────────── Agora ─────────────────────────

function AgoraCard({ data }: { data: Integrations }) {
  const s = data.settings;
  const [appId, setAppId] = useState(s['agora.appId'].value ?? '');
  const [cert, setCert] = useState('');
  useEffect(() => setAppId(s['agora.appId'].value ?? ''), [s]);
  const save = useSave(() => setCert(''));
  const test = useTest('/admin/settings/test/agora');

  return (
    <IntegrationCard
      icon={Video}
      title="Agora — audio & video calls"
      description="Used by the patient app, doctor app and call center. Free tier: 10,000 minutes / month."
      connected={data.status.agora}
      steps={
        <>
          <p>1. Sign up at <A href="https://console.agora.io">console.agora.io</A></p>
          <p>2. <b>Projects → Create project</b>, authentication: <b>Secured mode: APP ID + Token</b></p>
          <p>3. Copy the <b>App ID</b> and the <b>Primary Certificate</b> and paste them here.</p>
          <p>Calls start working immediately — no app update needed.</p>
        </>
      }
    >
      <Field label="App ID" hint="32 characters">
        <Input value={appId} onChange={(e) => setAppId(e.target.value.trim())} placeholder="e.g. 3f1c…9ab2" className="font-mono" />
      </Field>
      <SecretField label="App Certificate" hint="stays on the server" setting={s['agora.certificate']} value={cert} onChange={(v) => setCert(v.trim())} placeholder="Primary certificate" />
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => save.mutate({ 'agora.appId': appId, ...(cert && { 'agora.certificate': cert }) })} loading={save.isPending}>
          Save
        </Button>
        <Button variant="secondary" onClick={() => test.mutate(undefined)} loading={test.isPending} disabled={!data.status.agora}>
          <FlaskConical /> Test
        </Button>
        {s['agora.certificate'].isSet && (
          <Button variant="ghost" onClick={() => save.mutate({ 'agora.certificate': '' })}>
            Remove certificate
          </Button>
        )}
      </div>
    </IntegrationCard>
  );
}

// ───────────────────────── Gmail ─────────────────────────

function EmailCard({ data }: { data: Integrations }) {
  const s = data.settings;
  const [user, setUser] = useState(s['mail.gmailUser'].value ?? '');
  const [fromName, setFromName] = useState(s['mail.fromName'].value ?? '');
  const [pass, setPass] = useState('');
  const [to, setTo] = useState('');
  useEffect(() => {
    setUser(s['mail.gmailUser'].value ?? '');
    setFromName(s['mail.fromName'].value ?? '');
  }, [s]);
  const save = useSave(() => setPass(''));
  const test = useTest('/admin/settings/test/email');

  return (
    <IntegrationCard
      icon={Mail}
      title="Gmail — login codes by email"
      description="Patients and doctors can log in with their email; the 6-digit code is sent from this Gmail account. Gmail allows about 500 emails per day."
      connected={data.status.email}
      steps={
        <>
          <p>1. Use the Gmail account you want codes sent from.</p>
          <p>2. Turn on <b>2-Step Verification</b>: <A href="https://myaccount.google.com/security">Google security</A></p>
          <p>3. Create an <b>App password</b> (name it “Doctor Platform”): <A href="https://myaccount.google.com/apppasswords">App passwords</A></p>
          <p>4. Paste the Gmail address and the 16-letter app password here, then <b>Send test email</b>.</p>
          <p className="text-warning">Your normal Gmail password will not work here.</p>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Gmail address">
          <Input type="email" value={user} onChange={(e) => setUser(e.target.value.trim())} placeholder="yourclinic@gmail.com" />
        </Field>
        <Field label="Sender name" hint="optional">
          <Input value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="ডাক্তার দেখান" />
        </Field>
      </div>
      <SecretField label="App password" hint="16 letters from Google" setting={s['mail.appPassword']} value={pass} onChange={setPass} placeholder="abcd efgh ijkl mnop" />
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => save.mutate({ 'mail.gmailUser': user, 'mail.fromName': fromName, ...(pass && { 'mail.appPassword': pass }) })} loading={save.isPending}>
          Save
        </Button>
      </div>
      <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3 sm:flex-row sm:items-end">
        <Field label="Send a test email to" className="flex-1">
          <Input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="you@example.com" />
        </Field>
        <Button variant="secondary" onClick={() => test.mutate({ to })} loading={test.isPending} disabled={!data.status.email || !to}>
          <FlaskConical /> Send test email
        </Button>
      </div>
    </IntegrationCard>
  );
}

// ───────────────────────── Firebase ─────────────────────────

const FB_FIELDS: [string, string, string][] = [
  ['firebase.projectId', 'Project ID', 'doctor-platform-1a2b3'],
  ['firebase.messagingSenderId', 'Sender ID (project number)', '123456789012'],
  ['firebase.apiKey', 'Web API key', 'AIzaSy…'],
  ['firebase.androidAppId', 'Android app ID', '1:123456789012:android:abc123…'],
  ['firebase.iosAppId', 'iOS app ID (optional)', '1:123456789012:ios:abc123…'],
];

function FirebaseCard({ data }: { data: Integrations }) {
  const s = data.settings;
  const [vals, setVals] = useState<Record<string, string>>({});
  const [sa, setSa] = useState('');
  useEffect(() => setVals(Object.fromEntries(FB_FIELDS.map(([k]) => [k, s[k].value ?? '']))), [s]);
  const save = useSave(() => setSa(''));
  const test = useTest('/admin/settings/test/firebase');
  const clientReady = !!(s['firebase.projectId'].value && s['firebase.apiKey'].value && s['firebase.messagingSenderId'].value && s['firebase.androidAppId'].value);

  return (
    <IntegrationCard
      icon={BellRing}
      title="Firebase — push notifications"
      description="Rings the doctor's phone for incoming calls even when the app is closed, and notifies patients about payments and calls."
      connected={data.status.push && clientReady}
      steps={
        <>
          <p>1. Open <A href="https://console.firebase.google.com">Firebase console</A> → <b>Add project</b>.</p>
          <p>2. <b>Add app → Android</b>, package name <code className="font-mono text-foreground">com.doctorplatform.doctor_app</code>. Skip the file download.</p>
          <p>3. <b>Project settings → General</b>: copy Project ID, Project number (Sender ID), Web API key and the Android <b>App ID</b>.</p>
          <p>4. <b>Project settings → Service accounts → Generate new private key</b>, open the downloaded JSON and paste all of it below.</p>
          <p>The app picks this up on next launch — no rebuild needed.</p>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {FB_FIELDS.map(([k, label, ph]) => (
          <Field key={k} label={label}>
            <Input value={vals[k] ?? ''} onChange={(e) => setVals((v) => ({ ...v, [k]: e.target.value.trim() }))} placeholder={ph} className="font-mono text-xs" />
          </Field>
        ))}
      </div>
      <SecretField
        label="Service account JSON"
        hint="server only"
        setting={s['firebase.serviceAccount']}
        value={sa}
        onChange={setSa}
        multiline
        placeholder={'{\n  "type": "service_account",\n  "project_id": "…",\n  "private_key": "-----BEGIN PRIVATE KEY-----…",\n  "client_email": "…"\n}'}
      />
      {!clientReady && data.status.push && (
        <p className="flex items-center gap-1.5 text-xs text-warning">
          <CircleAlert className="size-3.5" /> Server key saved — also fill in the app fields above so phones can register.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => save.mutate({ ...vals, ...(sa && { 'firebase.serviceAccount': sa }) })} loading={save.isPending}>
          Save
        </Button>
        <Button variant="secondary" onClick={() => test.mutate(undefined)} loading={test.isPending} disabled={!data.status.push}>
          <FlaskConical /> Test connection
        </Button>
      </div>
    </IntegrationCard>
  );
}

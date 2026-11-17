'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarCheck, HeartPulse, ShieldCheck, Stethoscope } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/primitives';
import { api, session, type SessionUser } from '@/lib/api';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters'),
});
type Form = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<Form>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (session.access) router.replace('/');
  }, [router]);

  const onSubmit = async (values: Form) => {
    setError(null);
    try {
      const res = await api<{ accessToken: string; refreshToken: string; user: SessionUser }>('/auth/admin/login', { method: 'POST', body: values });
      session.save(res);
      router.replace('/');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-teal-700 via-teal-800 to-slate-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 size-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -left-16 size-[28rem] rounded-full bg-teal-400/10" />
        <div className="relative flex items-center gap-2.5 text-lg font-semibold">
          <span className="flex size-9 items-center justify-center rounded-xl bg-white/15">
            <Stethoscope className="size-5" />
          </span>
          Doctor Platform
        </div>
        <div className="relative max-w-md">
          <h1 className="text-[34px] font-semibold leading-tight tracking-tight">Run every appointment, doctor and call from one place.</h1>
          <p className="bn mt-4 text-teal-100/90">ডাক্তার, অ্যাপয়েন্টমেন্ট, পেমেন্ট ও কল সেন্টার — সব এক জায়গা থেকে পরিচালনা করুন।</p>
          <ul className="mt-8 space-y-3 text-sm text-teal-50/90">
            {[
              [ShieldCheck, 'Role-based access with a full audit trail'],
              [CalendarCheck, 'Double-booking protection on every slot'],
              [HeartPulse, 'Only verified doctors are shown to patients'],
            ].map(([Icon, text], i) => {
              const I = Icon as typeof ShieldCheck;
              return (
                <li key={i} className="flex items-center gap-3">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-white/10">
                    <I className="size-4" />
                  </span>
                  {text as string}
                </li>
              );
            })}
          </ul>
        </div>
        <p className="relative text-xs text-teal-100/60">Not an emergency service. In an emergency call 999.</p>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Stethoscope className="size-5" />
            </span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
          <p className="mt-1 text-sm text-muted">Admin and call-center staff only.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
            <Field label="Email" error={formState.errors.email?.message}>
              <Input type="email" autoComplete="username" placeholder="you@company.com" {...register('email')} />
            </Field>
            <Field label="Password" error={formState.errors.password?.message}>
              <Input type="password" autoComplete="current-password" placeholder="••••••••" {...register('password')} />
            </Field>
            {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
            <Button type="submit" size="lg" className="w-full" loading={formState.isSubmitting}>
              Sign in
            </Button>
          </form>

          {process.env.NODE_ENV !== 'production' && (
            <p className="mt-6 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted">
              Demo: <span className="font-mono">admin@demo.local</span> / <span className="font-mono">Admin@12345</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

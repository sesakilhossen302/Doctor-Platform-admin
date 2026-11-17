'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, Field, Input, Select, Switch, Textarea } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import type { ConsultationType, Designation, DoctorDetail, Specialty } from '@/lib/types';
import { cn, TYPE_LABEL } from '@/lib/utils';

const num = (min: number, max: number) => z.coerce.number().int().min(min).max(max);

const schema = z.object({
  nameEn: z.string().trim().min(3, 'Name is required').max(120),
  nameBn: z.string().trim().max(120).optional(),
  gender: z.preprocess((v) => (v === '' ? undefined : v), z.enum(['MALE', 'FEMALE', 'OTHER']).optional()),
  designationId: z.coerce.number().int().optional(),
  degrees: z.string().trim().max(300).optional(),
  experienceYears: num(0, 70),
  bmdcNumber: z.string().trim().max(30).optional(),
  onlineFee: num(0, 100000),
  chamberFee: num(0, 100000),
  consultationTypes: z.array(z.enum(['ONLINE_AUDIO', 'ONLINE_VIDEO', 'CHAMBER'])).min(1, 'Choose at least one'),
  specialtyIds: z.array(z.number()).min(1, 'Choose at least one specialty').max(5),
  languages: z.array(z.string()).min(1),
  bio: z.string().trim().max(3000).optional(),
  photoUrl: z.union([z.string().trim().url('Must be a URL'), z.literal('')]).optional(),
  isDemo: z.boolean(),
});
export type DoctorFormValues = z.infer<typeof schema>;

const TYPES: ConsultationType[] = ['CHAMBER', 'ONLINE_AUDIO', 'ONLINE_VIDEO'];
const LANGS = ['Bangla', 'English', 'Hindi', 'Arabic'];

export function toFormValues(d?: DoctorDetail): DoctorFormValues {
  return {
    nameEn: d?.nameEn ?? '',
    nameBn: d?.nameBn ?? '',
    gender: d?.gender ?? undefined,
    designationId: d?.designationId ?? undefined,
    degrees: d?.degrees ?? '',
    experienceYears: d?.experienceYears ?? 0,
    bmdcNumber: d?.bmdcNumber ?? '',
    onlineFee: d?.onlineFee ?? 500,
    chamberFee: d?.chamberFee ?? 700,
    consultationTypes: d?.consultationTypes ?? ['CHAMBER'],
    specialtyIds: d?.specialties.map((s) => s.specialtyId) ?? [],
    languages: d?.languages ?? ['Bangla'],
    bio: d?.bio ?? '',
    photoUrl: d?.photoUrl ?? '',
    isDemo: d?.isDemo ?? false,
  };
}

export function DoctorForm({ initial, onSubmit, submitLabel }: { initial?: DoctorDetail; onSubmit: (v: DoctorFormValues) => Promise<void>; submitLabel: string }) {
  const { data: specialties } = useQuery({ queryKey: ['specialties-admin'], queryFn: () => api<Specialty[]>('/admin/specialties') });
  const { data: designations } = useQuery({ queryKey: ['designations-admin'], queryFn: () => api<Designation[]>('/admin/designations') });

  const { register, handleSubmit, control, formState } = useForm<z.input<typeof schema>, unknown, DoctorFormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(initial),
  });
  const e = formState.errors;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <Card>
        <CardHeader title="Basic information" description="Shown on the doctor’s public profile." />
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <Field label="Full name (English)" error={e.nameEn?.message}>
            <Input placeholder="Dr. Rafiqul Islam" {...register('nameEn')} />
          </Field>
          <Field label="Full name (বাংলা)" hint="optional">
            <Input className="bn" placeholder="ডা. রফিকুল ইসলাম" {...register('nameBn')} />
          </Field>
          <Field label="Designation" hint="পদবি — separate from specialty">
            <Select {...register('designationId')}>
              <option value="">— Select —</option>
              {designations?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nameEn}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Gender">
            <Select {...register('gender')}>
              <option value="">— Select —</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </Select>
          </Field>
          <Field label="Degrees" className="md:col-span-2">
            <Input placeholder="MBBS, FCPS (Medicine)" {...register('degrees')} />
          </Field>
          <Field label="Experience (years)" error={e.experienceYears?.message}>
            <Input type="number" min={0} {...register('experienceYears')} />
          </Field>
          <Field label="BMDC registration no." hint="verified separately">
            <Input placeholder="A-12345" {...register('bmdcNumber')} />
          </Field>
          <Field label="Photo URL" hint="optional" error={e.photoUrl?.message} className="md:col-span-2">
            <Input placeholder="https://…" {...register('photoUrl')} />
          </Field>
          <Field label="Bio" className="md:col-span-2">
            <Textarea rows={4} placeholder="Short professional summary" {...register('bio')} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Specialties" description="Pick up to 5. The first one you select is the primary specialty." />
        <div className="p-5">
          <Controller
            control={control}
            name="specialtyIds"
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {specialties?.map((s) => {
                  const idx = field.value.indexOf(s.id);
                  const on = idx >= 0;
                  return (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => field.onChange(on ? field.value.filter((x) => x !== s.id) : [...field.value, s.id])}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
                        on ? 'border-primary bg-primary-soft text-primary' : 'border-border hover:border-muted',
                      )}
                    >
                      {on && <Check className="size-3.5" />}
                      {s.nameEn}
                      {idx === 0 && <span className="rounded bg-primary px-1 text-[10px] font-semibold text-primary-foreground">PRIMARY</span>}
                    </button>
                  );
                })}
              </div>
            )}
          />
          {e.specialtyIds && <p className="mt-2 text-xs text-danger">{e.specialtyIds.message}</p>}
        </div>
      </Card>

      <Card>
        <CardHeader title="Services & fees" description="Fees in Bangladeshi Taka. Platform fee is added on top at checkout." />
        <div className="grid gap-5 p-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <p className="mb-2 text-[13px] font-medium">Consultation types</p>
            <Controller
              control={control}
              name="consultationTypes"
              render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {TYPES.map((t) => {
                    const on = field.value.includes(t);
                    return (
                      <button
                        type="button"
                        key={t}
                        onClick={() => field.onChange(on ? field.value.filter((x) => x !== t) : [...field.value, t])}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors',
                          on ? 'border-primary bg-primary-soft text-primary' : 'border-border hover:border-muted',
                        )}
                      >
                        {on && <Check className="size-3.5" />}
                        {TYPE_LABEL[t]}
                      </button>
                    );
                  })}
                </div>
              )}
            />
            {e.consultationTypes && <p className="mt-2 text-xs text-danger">{e.consultationTypes.message}</p>}
          </div>
          <Field label="Chamber visit fee (৳)" error={e.chamberFee?.message}>
            <Input type="number" min={0} step={50} {...register('chamberFee')} />
          </Field>
          <Field label="Online consultation fee (৳)" error={e.onlineFee?.message}>
            <Input type="number" min={0} step={50} {...register('onlineFee')} />
          </Field>
          <div className="md:col-span-2">
            <p className="mb-2 text-[13px] font-medium">Languages</p>
            <Controller
              control={control}
              name="languages"
              render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {LANGS.map((l) => {
                    const on = field.value.includes(l);
                    return (
                      <button
                        type="button"
                        key={l}
                        onClick={() => field.onChange(on ? field.value.filter((x) => x !== l) : [...field.value, l])}
                        className={cn('rounded-full border px-3 py-1 text-sm', on ? 'border-primary bg-primary-soft text-primary' : 'border-border')}
                      >
                        {l}
                      </button>
                    );
                  })}
                </div>
              )}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg bg-warning-soft px-4 py-3 md:col-span-2">
            <div>
              <p className="text-sm font-medium text-warning">Demo / sample record</p>
              <p className="text-xs text-muted">Patients will see a “Demo” label. Turn off only for real, verified doctors.</p>
            </div>
            <Controller control={control} name="isDemo" render={({ field }) => <Switch checked={field.value} onChange={field.onChange} label="Demo record" />} />
          </div>
        </div>
      </Card>

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t border-border bg-background/90 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
        <Button type="submit" loading={formState.isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

/** Converts form values to the API payload (empty strings → undefined). */
export function toPayload(v: DoctorFormValues) {
  return {
    ...v,
    nameBn: v.nameBn || undefined,
    degrees: v.degrees || undefined,
    bmdcNumber: v.bmdcNumber || undefined,
    bio: v.bio || undefined,
    photoUrl: v.photoUrl || undefined,
    designationId: v.designationId || undefined,
    gender: v.gender || undefined,
  };
}

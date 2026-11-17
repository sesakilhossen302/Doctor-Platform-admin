'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { DoctorForm, toPayload } from '@/components/doctor-form';
import { PageHeader } from '@/components/ui/page';
import { api } from '@/lib/api';
import type { DoctorDetail } from '@/lib/types';

export default function NewDoctorPage() {
  const router = useRouter();
  const qc = useQueryClient();
  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/doctors" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ChevronLeft className="size-4" /> Doctors
      </Link>
      <PageHeader title="Add doctor" description="New doctors start as Draft · Pending verification. Next you’ll add chambers and a schedule." />
      <DoctorForm
        submitLabel="Create doctor"
        onSubmit={async (v) => {
          try {
            const d = await api<DoctorDetail>('/admin/doctors', { method: 'POST', body: toPayload(v) });
            await qc.invalidateQueries({ queryKey: ['doctors'] });
            toast.success('Doctor created. Add a chamber and schedule next.');
            router.push(`/doctors/${d.id}?tab=chambers`);
          } catch (e) {
            toast.error((e as Error).message);
          }
        }}
      />
    </div>
  );
}

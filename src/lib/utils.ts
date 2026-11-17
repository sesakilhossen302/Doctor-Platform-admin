import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { AppointmentStatus, ConsultationType, DoctorStatus, VerificationStatus } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TZ = 'Asia/Dhaka';

export const taka = (n: number) => `৳${n.toLocaleString('en-IN')}`;

export const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));

export const fmtTime = (iso: string) =>
  new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }).format(new Date(iso));

export const fmtDateTime = (iso: string) => `${fmtDate(iso)}, ${fmtTime(iso)}`;

export const fmtShortDay = (yyyyMmDd: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: '2-digit', month: 'short' }).format(new Date(`${yyyyMmDd}T00:00:00Z`));

export const initials = (name?: string | null) =>
  (name ?? '?')
    .replace(/^Dr\.?\s+/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const TYPE_LABEL: Record<ConsultationType, string> = {
  ONLINE_AUDIO: 'Audio call',
  ONLINE_VIDEO: 'Video call',
  CHAMBER: 'Chamber visit',
};

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

export const APPOINTMENT_STATUS: Record<AppointmentStatus, { label: string; tone: Tone }> = {
  PENDING_PAYMENT: { label: 'Awaiting payment', tone: 'warning' },
  CONFIRMED: { label: 'Confirmed', tone: 'info' },
  COMPLETED: { label: 'Completed', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'danger' },
  NO_SHOW: { label: 'No-show', tone: 'neutral' },
  EXPIRED: { label: 'Expired', tone: 'neutral' },
};

export const DOCTOR_STATUS: Record<DoctorStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: 'Draft', tone: 'neutral' },
  ACTIVE: { label: 'Active', tone: 'success' },
  INACTIVE: { label: 'Inactive', tone: 'warning' },
  ARCHIVED: { label: 'Archived', tone: 'neutral' },
};

export const VERIFICATION_STATUS: Record<VerificationStatus, { label: string; tone: Tone }> = {
  PENDING: { label: 'Pending review', tone: 'warning' },
  VERIFIED: { label: 'Verified', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
};

export const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super admin',
  ADMIN: 'Admin',
  CALL_AGENT: 'Call agent',
  DOCTOR_ASSISTANT: 'Doctor assistant',
  DOCTOR: 'Doctor',
  PATIENT: 'Patient',
};

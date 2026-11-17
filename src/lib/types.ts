export type ConsultationType = 'ONLINE_AUDIO' | 'ONLINE_VIDEO' | 'CHAMBER';
export type DoctorStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';
export type AppointmentStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'EXPIRED';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface Named {
  id: number;
  nameEn: string;
  nameBn: string;
}

export interface Division extends Named {
  slug: string;
  isActive: boolean;
  sortOrder: number;
  _count?: { districts: number; chambers: number };
}
export interface District extends Named {
  slug: string;
  divisionId: number;
  isActive: boolean;
  sortOrder: number;
  _count?: { upazilas: number; chambers: number };
}
export interface Upazila extends Named {
  slug: string;
  districtId: number;
  isCity: boolean;
  isActive: boolean;
  sortOrder: number;
  _count?: { chambers: number };
}

export interface Specialty extends Named {
  slug: string;
  icon: string | null;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  _count?: { doctors: number };
}

export interface Designation extends Named {
  rank: number;
  isActive: boolean;
  _count?: { doctors: number };
}

export interface Hospital {
  id: number;
  name: string;
  nameBn: string | null;
  address: string | null;
  divisionId: number;
  districtId: number;
  upazilaId: number | null;
  district?: { nameEn: string; nameBn: string };
}

export interface DoctorCard {
  id: string;
  slug: string;
  nameEn: string;
  nameBn: string | null;
  gender: Gender | null;
  photoUrl: string | null;
  degrees: string | null;
  experienceYears: number;
  onlineFee: number;
  chamberFee: number;
  ratingAvg: number;
  ratingCount: number;
  consultationTypes: ConsultationType[];
  isAvailableNow: boolean;
  isDemo: boolean;
  verificationStatus: VerificationStatus;
  status?: DoctorStatus;
  bmdcNumber?: string | null;
  designation: { nameEn: string; nameBn: string } | null;
  specialties: { isPrimary: boolean; specialty: { id: number; nameEn: string; nameBn: string } }[];
  chambers: { name: string; district: { nameEn: string; nameBn: string } }[];
  _count?: { appointments: number };
}

export interface Chamber {
  id: string;
  name: string;
  address: string | null;
  hospitalId: number | null;
  divisionId: number;
  districtId: number;
  upazilaId: number | null;
  isActive: boolean;
  district?: { nameEn: string };
  hospital?: { name: string } | null;
}

export interface Schedule {
  id?: string;
  type: ConsultationType;
  chamberId: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotMinutes: number;
}

export interface Leave {
  id: string;
  date: string;
  reason: string | null;
}

export interface DoctorDetail {
  id: string;
  slug: string;
  nameEn: string;
  nameBn: string | null;
  gender: Gender | null;
  photoUrl: string | null;
  bio: string | null;
  degrees: string | null;
  designationId: number | null;
  experienceYears: number;
  bmdcNumber: string | null;
  languages: string[];
  consultationTypes: ConsultationType[];
  onlineFee: number;
  chamberFee: number;
  ratingAvg: number;
  ratingCount: number;
  status: DoctorStatus;
  verificationStatus: VerificationStatus;
  verifiedAt: string | null;
  isAvailableNow: boolean;
  isDemo: boolean;
  user: { phone: string | null; email: string | null; lastLoginAt: string | null } | null;
  designation: Designation | null;
  specialties: { isPrimary: boolean; specialtyId: number; specialty: Specialty }[];
  credentials: { id: string; type: string; number: string | null; status: VerificationStatus; notes: string | null }[];
  chambers: Chamber[];
  schedules: Schedule[];
  leaves: Leave[];
  _count: { appointments: number };
}

export interface Appointment {
  id: string;
  code: string;
  type: ConsultationType;
  status: AppointmentStatus;
  scheduledAt: string;
  endAt: string;
  holdExpiresAt: string | null;
  patientName: string;
  patientAge: number | null;
  patientGender: Gender | null;
  reason: string | null;
  serviceFee: number;
  platformFee: number;
  totalAmount: number;
  cancelReason: string | null;
  createdAt: string;
  doctor: { id: string; nameEn: string; photoUrl: string | null; isDemo: boolean; designation: { nameEn: string } | null; specialties: { specialty: { nameEn: string } }[] };
  chamber: { name: string; district: { nameEn: string } } | null;
  patient?: { id: string; phone: string | null; name: string | null };
}

export interface Dashboard {
  totals: {
    patients: number;
    doctors: number;
    pendingVerification: number;
    appointments: number;
    todayAppointments: number;
    pendingPayment: number;
    revenue: number;
    platformFees: number;
  };
  chart: { day: string; bookings: number; revenue: number }[];
  topSpecialties: { id: number; nameEn: string; nameBn: string; bookings: number }[];
  recent: { id: string; code: string; status: AppointmentStatus; type: ConsultationType; scheduledAt: string; totalAmount: number; patientName: string; doctor: { nameEn: string; photoUrl: string | null } }[];
}

export interface Patient {
  id: string;
  phone: string | null;
  name: string | null;
  email: string | null;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  lastLoginAt: string | null;
  patient: { gender: Gender | null; dateOfBirth: string | null } | null;
  _count: { appointments: number };
}

export interface FeeSetting {
  id: number;
  serviceType: 'APPOINTMENT_ONLINE' | 'APPOINTMENT_CHAMBER' | 'INSTANT_CALL';
  mode: 'FIXED' | 'PERCENT';
  value: number;
  isActive: boolean;
  updatedAt: string;
}

export interface Staff {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  status: 'ACTIVE' | 'SUSPENDED';
  lastLoginAt: string | null;
  createdAt: string;
}

export type CallRequestStatus = 'PAYMENT_PENDING' | 'QUEUED' | 'CONNECTED' | 'TRANSFERRED' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
export type ConsultationStatus = 'RINGING' | 'ONGOING' | 'ENDED' | 'REJECTED' | 'MISSED' | 'CANCELLED';

export interface ConsultationLeg {
  id: string;
  media: 'AUDIO' | 'VIDEO';
  status: ConsultationStatus;
  ringingAt: string;
  acceptedAt: string | null;
  endedAt: string | null;
  durationSec: number | null;
  doctor: { id: string; nameEn: string; photoUrl: string | null; specialties: { specialty: { nameEn: string } }[] };
}

export interface CallRequest {
  id: string;
  code: string;
  status: CallRequestStatus;
  media: 'AUDIO' | 'VIDEO';
  reason: string | null;
  priority: number;
  notes: string | null;
  channelName: string;
  totalAmount: number;
  queuedAt: string | null;
  connectedAt: string | null;
  transferredAt: string | null;
  completedAt: string | null;
  createdAt: string;
  patient: { id: string; name: string | null; phone: string | null };
  agent: { id: string; name: string | null } | null;
  consultations: ConsultationLeg[];
}

export interface AvailableDoctor {
  id: string;
  nameEn: string;
  photoUrl: string | null;
  isDemo: boolean;
  designation: { nameEn: string } | null;
  specialties: { isPrimary: boolean; specialty: { id: number; nameEn: string } }[];
}

export interface PaymentRow {
  id: string;
  code: string;
  provider: 'DEMO' | 'BKASH';
  amount: number;
  serviceFee: number;
  platformFee: number;
  status: 'INITIATED' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
  trxId: string | null;
  failureReason: string | null;
  paidAt: string | null;
  createdAt: string;
  user: { name: string | null; phone: string | null };
  appointment: { code: string; doctor: { nameEn: string } } | null;
  callRequest: { code: string } | null;
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
  ip: string | null;
  createdAt: string;
  actor: { name: string | null; email: string | null; role: string } | null;
}

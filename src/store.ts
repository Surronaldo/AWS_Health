// src/store.ts (cloud-backed via Amplify Data)
import { client } from './amplifyClient';
import { roles, AppointmentStatus, type User, type Appointment, type MedicalRecord } from './types';

// In cloud mode, we derive identities from Cognito.
// Keep a minimal "session" cache for the UI, but real auth is Cognito (Amplify <Auth> UI would be ideal).
export function currentUser(): User | null {
  // For demo: read from local cache you populated at login screen
  const raw = localStorage.getItem('hms.session');
  return raw ? JSON.parse(raw) as User : null;
}
export function authLogout() {
  localStorage.removeItem('hms.session');
}

// In production you should create users via Cognito sign-up and store display names in UserProfile.
// For demo continuity, fake-login keeps the UI working while backend handles data.
export function authLogin(username: string, password: string): User | null {
  // Stub login (replace with Amplify Auth UI or Auth.signIn)
  if (username === 'alice' && password === 'patient123') {
    const u: User = { id: 'DEMO_PATIENT_SUB', username, password, name: 'Alice Johnson', role: roles.Patient };
    localStorage.setItem('hms.session', JSON.stringify(u));
    return u;
  }
  if (username === 'drbob' && password === 'doctor123') {
    const u: User = { id: 'DEMO_DOCTOR_SUB', username, password, name: 'Dr. Bob Smith', role: roles.Doctor };
    localStorage.setItem('hms.session', JSON.stringify(u));
    return u;
  }
  return null;
}

export function seedIfEmpty() {
  // No-op in cloud mode (data is in DynamoDB via Amplify Data)
}

export function listDoctors(): User[] {
  // In a real app, query Cognito for users in Doctors group or keep profiles in UserProfile.
  return [
    { id: 'DEMO_DOCTOR_SUB', username: 'drbob', password: 'doctor123', name: 'Dr. Bob Smith', role: roles.Doctor },
  ];
}

export function listPatients(): User[] {
  return [
    { id: 'DEMO_PATIENT_SUB', username: 'alice', password: 'patient123', name: 'Alice Johnson', role: roles.Patient },
  ];
}

// --- Appointments ---

export async function createAppointment(input: {
  patientId: string;
  doctorId: string;
  date: string;
  time: string;
  reason?: string;
}): Promise<Appointment> {
  const res = await client.models.Appointment.create({
    patientId: input.patientId,
    doctorId: input.doctorId,
    date: input.date,
    time: input.time,
    reason: input.reason,
    status: 'SCHEDULED',
  });
  const a = res.data!;
  return {
    id: a.id,
    patientId: a.patientId,
    doctorId: a.doctorId,
    date: a.date,
    time: a.time,
    reason: a.reason ?? undefined,
    status: AppointmentStatus.Scheduled,
    createdAt: a.createdAt!,
  };
}

export async function listAppointmentsForUser(user: User): Promise<Appointment[]> {
  if (user.role === roles.Patient) {
    const res = await client.models.Appointment.list({
      filter: { patientId: { eq: user.id } },
      limit: 100,
    });
    return (res.data ?? []).map(toAppt).sort(sortAppt);
  }
  if (user.role === roles.Doctor) {
    const res = await client.models.Appointment.list({
      filter: { doctorId: { eq: user.id } },
      limit: 100,
    });
    return (res.data ?? []).map(toAppt).sort(sortAppt);
  }
  return [];
}

export async function cancelAppointment(id: string): Promise<void> {
  const got = await client.models.Appointment.get({ id });
  if (got.data) {
    await client.models.Appointment.update({ ...got.data, status: 'CANCELLED' });
  }
}

export async function completeAppointment(id: string): Promise<void> {
  const got = await client.models.Appointment.get({ id });
  if (got.data) {
    await client.models.Appointment.update({ ...got.data, status: 'COMPLETED' });
  }
}

// --- Records ---

export async function createRecord(input: {
  appointment: Appointment;
  title: string;
  notes: string;
  prescription?: string;
  doctor: User;
}): Promise<MedicalRecord> {
  const rec = await client.models.MedicalRecord.create({
    appointmentId: input.appointment.id,
    patientId: input.appointment.patientId,
    doctorId: input.appointment.doctorId,
    title: input.title,
    notes: input.notes,
    prescription: input.prescription,
    date: input.appointment.date,
  });
  const r = rec.data!;
  return {
    id: r.id,
    appointmentId: r.appointmentId,
    patientId: r.patientId,
    patientName: listPatients().find(p => p.id === r.patientId)?.name ?? 'Patient',
    doctorId: r.doctorId,
    doctorName: listDoctors().find(d => d.id === r.doctorId)?.name ?? 'Doctor',
    title: r.title,
    notes: r.notes,
    prescription: r.prescription ?? undefined,
    date: r.date,
    createdAt: r.createdAt!,
  };
}

export async function listRecordsForPatient(patientId: string): Promise<MedicalRecord[]> {
  const res = await client.models.MedicalRecord.list({
    filter: { patientId: { eq: patientId } },
    limit: 200,
  });
  return (res.data ?? [])
    .map((r) => ({
      id: r.id,
      appointmentId: r.appointmentId,
      patientId: r.patientId,
      patientName: listPatients().find(p => p.id === r.patientId)?.name ?? 'Patient',
      doctorId: r.doctorId,
      doctorName: listDoctors().find(d => d.id === r.doctorId)?.name ?? 'Doctor',
      title: r.title,
      notes: r.notes,
      prescription: r.prescription ?? undefined,
      date: r.date,
      createdAt: r.createdAt!,
    }))
    .sort((a, b) => (a.date + a.createdAt).localeCompare(b.date + b.createdAt));
}

// helpers
function toAppt(a: any): Appointment {
  return {
    id: a.id,
    patientId: a.patientId,
    doctorId: a.doctorId,
    date: a.date,
    time: a.time,
    reason: a.reason ?? undefined,
    status:
      a.status === 'COMPLETED'
        ? AppointmentStatus.Completed
        : a.status === 'CANCELLED'
        ? AppointmentStatus.Cancelled
        : AppointmentStatus.Scheduled,
    createdAt: a.createdAt!,
  };
}
function sortAppt(a: Appointment, b: Appointment) {
  return (a.date + a.time).localeCompare(b.date + b.time);
}

// src/store.ts (cloud-backed via Amplify Data)
import { client } from "./amplifyClient";
import {
  roles,
  AppointmentStatus,
  type User,
  type Appointment,
  type MedicalRecord,
} from "./types";

// --- Minimal session helpers (UI-only). Replace with real Amplify Auth later. ---
export function currentUser(): User | null {
  const raw = localStorage.getItem("hms.session");
  return raw ? (JSON.parse(raw) as User) : null;
}
export function authLogout() {
  localStorage.removeItem("hms.session");
}
export function authLogin(username: string, password: string): User | null {
  if (username === "alice" && password === "patient123") {
    const u: User = {
      id: "DEMO_PATIENT_SUB",
      username,
      password,
      name: "Alice Johnson",
      role: roles.Patient,
    };
    localStorage.setItem("hms.session", JSON.stringify(u));
    return u;
  }
  if (username === "drbob" && password === "doctor123") {
    const u: User = {
      id: "DEMO_DOCTOR_SUB",
      username,
      password,
      name: "Dr. Bob Smith",
      role: roles.Doctor,
    };
    localStorage.setItem("hms.session", JSON.stringify(u));
    return u;
  }
  return null;
}
export function seedIfEmpty() {
  /* no-op in cloud mode */
}

// Temporary static lists (until you wire Cognito groups / profiles)
export function listDoctors(): User[] {
  return [
    {
      id: "DEMO_DOCTOR_SUB",
      username: "drbob",
      password: "doctor123",
      name: "Dr. Bob Smith",
      role: roles.Doctor,
    },
  ];
}
export function listPatients(): User[] {
  return [
    {
      id: "DEMO_PATIENT_SUB",
      username: "alice",
      password: "patient123",
      name: "Alice Johnson",
      role: roles.Patient,
    },
  ];
}

// ---------- Appointments ----------
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
    status: "SCHEDULED",
    createdAt: new Date().toISOString(),
  });
  const a = res.data!;
  return toAppt(a as any);
}

export async function listAppointmentsForUser(user: User): Promise<Appointment[]> {
  if (user.role === roles.Patient) {
    const res = await client.models.Appointment.list({
      filter: { patientId: { eq: user.id } },
      limit: 200,
    });
    return (res.data ?? []).map((x: any) => toAppt(x)).sort(sortAppt);
  }
  if (user.role === roles.Doctor) {
    const res = await client.models.Appointment.list({
      filter: { doctorId: { eq: user.id } },
      limit: 200,
    });
    return (res.data ?? []).map((x: any) => toAppt(x)).sort(sortAppt);
  }
  return [];
}

export async function cancelAppointment(id: string): Promise<void> {
  const got = await client.models.Appointment.get({ id });
  if (got.data) {
    await client.models.Appointment.update({ ...got.data, status: "CANCELLED" });
  }
}

export async function completeAppointment(id: string): Promise<void> {
  const got = await client.models.Appointment.get({ id });
  if (got.data) {
    await client.models.Appointment.update({ ...got.data, status: "COMPLETED" });
  }
}

// ---------- Medical Records ----------
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
    createdAt: new Date().toISOString(),
  });
  const r: any = rec.data!;
  return {
    id: r.id,
    appointmentId: r.appointmentId,
    patientId: r.patientId,
    patientName:
      listPatients().find((p) => p.id === r.patientId)?.name ?? "Patient",
    doctorId: r.doctorId,
    doctorName:
      listDoctors().find((d) => d.id === r.doctorId)?.name ?? "Doctor",
    title: r.title,
    notes: r.notes,
    prescription: r.prescription ?? undefined,
    date: r.date,
    createdAt: r.createdAt!,
  };
}

export async function listRecordsForPatient(
  patientId: string
): Promise<MedicalRecord[]> {
  const res = await client.models.MedicalRecord.list({
    filter: { patientId: { eq: patientId } },
    limit: 200,
  });
  return (res.data ?? [])
    .map((r: any): MedicalRecord => ({
      id: r.id,
      appointmentId: r.appointmentId,
      patientId: r.patientId,
      patientName:
        listPatients().find((p) => p.id === r.patientId)?.name ?? "Patient",
      doctorId: r.doctorId,
      doctorName:
        listDoctors().find((d) => d.id === r.doctorId)?.name ?? "Doctor",
      title: r.title,
      notes: r.notes,
      prescription: r.prescription ?? undefined,
      date: r.date,
      createdAt: r.createdAt!,
    }))
    .sort((a: MedicalRecord, b: MedicalRecord) =>
      (a.date + a.createdAt).localeCompare(b.date + b.createdAt)
    );
}

// ---------- helpers ----------
function toAppt(a: any): Appointment {
  const status =
    a.status === "COMPLETED"
      ? AppointmentStatus.Completed
      : a.status === "CANCELLED"
      ? AppointmentStatus.Cancelled
      : AppointmentStatus.Scheduled;

  return {
    id: a.id,
    patientId: a.patientId,
    doctorId: a.doctorId,
    date: a.date,
    time: a.time,
    reason: a.reason ?? undefined,
    status,
    createdAt: a.createdAt!,
  };
}

function sortAppt(a: Appointment, b: Appointment) {
  return (a.date + a.time).localeCompare(b.date + b.time);
}

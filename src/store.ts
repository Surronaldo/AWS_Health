// src/store.ts
import {
  type Appointment,
  AppointmentStatus,
  type MedicalRecord,
  type Role,
  type User,
  roles,
} from "./types";

const KEY = {
  users: "hms.users",
  appointments: "hms.appts",
  records: "hms.records",
  session: "hms.session",
};

function uid(prefix = ""): string {
  return `${prefix}${Math.random().toString(36).slice(2, 10)}${Date.now()
    .toString(36)
    .slice(-6)}`;
}

function load<T>(k: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(k: string, v: T) {
  localStorage.setItem(k, JSON.stringify(v));
}

export function seedIfEmpty() {
  const users = load<User[]>(KEY.users, []);
  if (users.length > 0) return;

  const seeded: User[] = [
    {
      id: uid("u_"),
      username: "alice",
      password: "patient123",
      name: "Alice Johnson",
      role: roles.Patient,
    },
    {
      id: uid("u_"),
      username: "drbob",
      password: "doctor123",
      name: "Dr. Bob Smith",
      role: roles.Doctor,
    },
    {
      id: uid("u_"),
      username: "drlee",
      password: "doctor123",
      name: "Dr. Emily Lee",
      role: roles.Doctor,
    },
  ];
  save(KEY.users, seeded);
  save<Appointment[]>(KEY.appointments, []);
  save<MedicalRecord[]>(KEY.records, []);
}

export function listUsers(): User[] {
  return load<User[]>(KEY.users, []);
}

export function listDoctors(): User[] {
  return listUsers().filter((u) => u.role === roles.Doctor);
}

export function listPatients(): User[] {
  return listUsers().filter((u) => u.role === roles.Patient);
}

export function authLogin(username: string, password: string): User | null {
  const user = listUsers().find(
    (u) => u.username.toLowerCase() === username.toLowerCase() && u.password === password
  );
  if (!user) return null;
  save(KEY.session, user);
  return user;
}

export function authLogout() {
  localStorage.removeItem(KEY.session);
}

export function currentUser(): User | null {
  return load<User | null>(KEY.session, null);
}

export function createAppointment(input: {
  patientId: string;
  doctorId: string;
  date: string;
  time: string;
  reason?: string;
}): Appointment {
  const appts = load<Appointment[]>(KEY.appointments, []);
  const appt: Appointment = {
    id: uid("a_"),
    patientId: input.patientId,
    doctorId: input.doctorId,
    date: input.date,
    time: input.time,
    reason: input.reason?.trim() || undefined,
    status: AppointmentStatus.Scheduled,
    createdAt: new Date().toISOString(),
  };
  appts.push(appt);
  save(KEY.appointments, appts);
  return appt;
}

export function listAppointmentsForUser(user: User): Appointment[] {
  const appts = load<Appointment[]>(KEY.appointments, []);
  if (user.role === roles.Patient) {
    return appts
      .filter((a) => a.patientId === user.id)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  }
  if (user.role === roles.Doctor) {
    return appts
      .filter((a) => a.doctorId === user.id)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  }
  return [];
}

export function cancelAppointment(id: string) {
  const appts = load<Appointment[]>(KEY.appointments, []);
  const idx = appts.findIndex((a) => a.id === id);
  if (idx >= 0) {
    appts[idx] = { ...appts[idx], status: AppointmentStatus.Cancelled };
    save(KEY.appointments, appts);
  }
}

export function completeAppointment(id: string) {
  const appts = load<Appointment[]>(KEY.appointments, []);
  const idx = appts.findIndex((a) => a.id === id);
  if (idx >= 0) {
    appts[idx] = { ...appts[idx], status: AppointmentStatus.Completed };
    save(KEY.appointments, appts);
  }
}

export function createRecord(input: {
  appointment: Appointment;
  title: string;
  notes: string;
  prescription?: string;
  doctor: User;
}): MedicalRecord {
  const users = listUsers();
  const patient = users.find((u) => u.id === input.appointment.patientId)!;
  const doctor = users.find((u) => u.id === input.appointment.doctorId)!;

  const rec: MedicalRecord = {
    id: uid("r_"),
    appointmentId: input.appointment.id,
    patientId: patient.id,
    patientName: patient.name,
    doctorId: doctor.id,
    doctorName: doctor.name,
    title: input.title.trim(),
    notes: input.notes.trim(),
    prescription: input.prescription?.trim() || undefined,
    date: input.appointment.date,
    createdAt: new Date().toISOString(),
  };

  const all = load<MedicalRecord[]>(KEY.records, []);
  all.push(rec);
  save(KEY.records, all);
  return rec;
}

export function listRecordsForPatient(patientId: string): MedicalRecord[] {
  const all = load<MedicalRecord[]>(KEY.records, []);
  return all
    .filter((r) => r.patientId === patientId)
    .sort((a, b) => (a.date + a.createdAt).localeCompare(b.date + b.createdAt));
}

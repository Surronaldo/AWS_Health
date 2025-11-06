// src/types.ts
export const roles = {
  Patient: "Patient",
  Doctor: "Doctor",
} as const;

export type Role = typeof roles[keyof typeof roles];

export type User = {
  id: string;
  username: string;
  password: string; // demo only (localStorage)
  name: string;
  role: Role;
};

export enum AppointmentStatus {
  Scheduled = "Scheduled",
  Completed = "Completed",
  Cancelled = "Cancelled",
}

export type Appointment = {
  id: string;
  patientId: string;
  doctorId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  reason?: string;
  status: AppointmentStatus;
  createdAt: string; // ISO
};

export type MedicalRecord = {
  id: string;
  appointmentId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  title: string;
  notes: string;
  prescription?: string;
  date: string; // YYYY-MM-DD
  createdAt: string; // ISO
};

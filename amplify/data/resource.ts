// amplify/data/resource.ts
import { a, defineData, type ClientSchema } from '@aws-amplify/backend';

const AppointmentStatus = ['SCHEDULED', 'COMPLETED', 'CANCELLED'] as const;

const schema = a.schema({
  // ---- Appointments ----
  Appointment: a
    .model({
      patientId: a.id().required(),  // Cognito sub of patient
      doctorId: a.id().required(),   // Cognito sub of doctor
      date: a.string().required(),   // YYYY-MM-DD
      time: a.string().required(),   // HH:mm
      reason: a.string(),
      // ❌ enums can't use .default(...) in Gen 2 today; set default in client code instead
      status: a.enum(AppointmentStatus),
      createdAt: a.datetime().default('now'),
    })
    .authorization((allow) => [
      // Patient can CRUD only *their* items (owner stored in patientId)
      allow.ownerDefinedIn('patientId').to(['create', 'read', 'update', 'delete']),
      // Doctors can read/update any appointment (tweak as needed)
      allow.groups(['Doctors']).to(['read', 'update']),
    ])
    // GSIs to list by patient/doctor and sort by date+time
    .secondaryIndexes((index: any) => [
      index('patientId').sortKeys(['date', 'time']).queryField('listAppointmentsByPatient'),
      index('doctorId').sortKeys(['date', 'time']).queryField('listAppointmentsByDoctor'),
    ]),

  // ---- Medical Records ----
  MedicalRecord: a
    .model({
      appointmentId: a.id().required(),
      patientId: a.id().required(),
      doctorId: a.id().required(),
      title: a.string().required(),
      notes: a.string().required(),
      prescription: a.string(),
      date: a.string().required(),  // copy from appointment
      createdAt: a.datetime().default('now'),
    })
    .authorization((allow) => [
      // Doctors create/read records
      allow.groups(['Doctors']).to(['create', 'read']),
      // Patient can read their own records
      allow.ownerDefinedIn('patientId').to(['read']),
    ])
    .secondaryIndexes((index: any) => [
      index('patientId').sortKeys(['date', 'createdAt']).queryField('listRecordsByPatient'),
      index('appointmentId').queryField('listRecordsByAppointment'),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({ schema });

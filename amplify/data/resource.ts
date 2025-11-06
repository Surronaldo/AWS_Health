// amplify/data/resource.ts
import { a, defineData, type ClientSchema } from '@aws-amplify/backend';

// Simple enum for status
const AppointmentStatus = ['SCHEDULED', 'COMPLETED', 'CANCELLED'] as const;
type Status = (typeof AppointmentStatus)[number];

const schema = a.schema({

  // Optional user profile (handy for showing names)
  UserProfile: a
    .model({
      id: a.id(),                 // Cognito sub as id
      name: a.string().required(),// display name
    })
    .identifier(['id'])
    .authorization((allow) => [
      allow.owner(),              // users can CRUD their own profile
      allow.group('Doctors').to(['read']),
    ]),

  Appointment: a
    .model({
      patientId: a.id().required(), // Cognito sub of patient
      doctorId: a.id().required(),  // Cognito sub of doctor
      date: a.string().required(),  // YYYY-MM-DD
      time: a.string().required(),  // HH:mm
      reason: a.string(),
      status: a.enum(AppointmentStatus).default('SCHEDULED'),
      createdAt: a.datetime().default('now'),
    })
    .authorization((allow) => [
      // Patient can CRUD their own appointments
      allow.owner().to(['create','read','update','delete']).identityClaim('sub').references('patientId'),
      // Doctors group can read/update all (simple baseline demo)
      allow.group('Doctors').to(['read','update']),
    ])
    .indexes((index) => [
      index('byPatient').partitionKeys(['patientId']).sortKeys(['date','time']),
      index('byDoctor').partitionKeys(['doctorId']).sortKeys(['date','time']),
    ]),

  MedicalRecord: a
    .model({
      appointmentId: a.id().required(),
      patientId: a.id().required(),
      doctorId: a.id().required(),
      title: a.string().required(),
      notes: a.string().required(),
      prescription: a.string(),
      date: a.string().required(),    // reuse appt date
      createdAt: a.datetime().default('now'),
    })
    .authorization((allow) => [
      // Doctors create/read records
      allow.group('Doctors').to(['create','read']),
      // Patients can read records that belong to them
      allow.owner().to(['read']).identityClaim('sub').references('patientId'),
    ])
    .indexes((index) => [
      index('byPatient').partitionKeys(['patientId']).sortKeys(['date','createdAt']),
      index('byAppointment').partitionKeys(['appointmentId']),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
});

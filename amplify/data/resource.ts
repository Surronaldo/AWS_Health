// amplify/data/resource.ts
import { a, defineData, type ClientSchema } from '@aws-amplify/backend';

const AppointmentStatus = ['SCHEDULED', 'COMPLETED', 'CANCELLED'] as const;

const schema = a.schema({

  UserProfile: a
    .model({
      id: a.id(),                  
      name: a.string().required(), 
    })
    .identifier(['id'])
    .authorization((allow) => [
      allow.owner(),               
      allow.group('Doctors').to(['read']),
    ]),

  Appointment: a
    .model({
      patientId: a.id().required(),
      doctorId: a.id().required(),
      date: a.string().required(),   // YYYY-MM-DD
      time: a.string().required(),   // HH:mm
      reason: a.string(),
      status: a.enum(AppointmentStatus).default('SCHEDULED'),
      createdAt: a.datetime().default('now'),
    })
    .authorization((allow) => [
      allow.owner()
        .to(['create','read','update','delete'])
        .identityClaim('sub')
        .references('patientId'),

      allow.group('Doctors').to(['read','update']),
    ])
    .secondaryIndexes((index: any) => [
      index('patientId')
        .sortKeys(['date','time'])
        .queryField('listAppointmentsByPatient'),

      index('doctorId')
        .sortKeys(['date','time'])
        .queryField('listAppointmentsByDoctor'),
    ]),

  MedicalRecord: a
    .model({
      appointmentId: a.id().required(),
      patientId: a.id().required(),
      doctorId: a.id().required(),
      title: a.string().required(),
      notes: a.string().required(),
      prescription: a.string(),
      date: a.string().required(),
      createdAt: a.datetime().default('now'),
    })
    .authorization((allow) => [
      allow.group('Doctors').to(['create','read']),
      allow.owner()
        .to(['read'])
        .identityClaim('sub')
        .references('patientId'),
    ])
    .secondaryIndexes((index: any) => [
      index('patientId')
        .sortKeys(['date','createdAt'])
        .queryField('listRecordsByPatient'),

      index('appointmentId')
        .queryField('listRecordsByAppointment'),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
});

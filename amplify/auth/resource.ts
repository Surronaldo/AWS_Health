// amplify/auth/resource.ts
import { defineAuth } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: true, // email-based sign-in
  },
  userPoolGroups: {
    Doctors: {},  // assign doctors here
    Patients: {}, // assign patients here
  },
});


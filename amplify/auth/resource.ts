// amplify/auth/resource.ts
import { defineAuth } from '@aws-amplify/backend';

export const auth = defineAuth({
  // Sign in with email (add others if you want)
  loginWith: { email: true },

  // ✅ In Gen 2, define user pool groups with "groups"
  groups: ['Doctors', 'Patients'],
});


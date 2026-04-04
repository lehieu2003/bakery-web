# Deferred Work

## Deferred from: backend-frontend parity check (2026-04-04)

- [x] Forgot Password UI flow for Story 1.3 backend endpoints
  - Scope: wire login screen "Forgot password?" to OTP reset flow using `useResetPassword` + `useResetPasswordVerify`.
  - Include: request OTP step, verify OTP + new password step, success navigation/message, and error handling.
  - Validation: route-level contract tests already exist; add UI/service integration coverage for this flow.
  - Resolution: implemented directly in `components/screens/AuthScreen.tsx` with 2-step flow (send OTP -> verify OTP + new password).

# Deferred Work

## Deferred from: backend-frontend parity check (2026-04-04)

- [x] Forgot Password UI flow for Story 1.3 backend endpoints
  - Scope: wire login screen "Forgot password?" to OTP reset flow using `useResetPassword` + `useResetPasswordVerify`.
  - Include: request OTP step, verify OTP + new password step, success navigation/message, and error handling.
  - Validation: route-level contract tests already exist; add UI/service integration coverage for this flow.
  - Resolution: implemented directly in `components/screens/AuthScreen.tsx` with 2-step flow (send OTP -> verify OTP + new password).
## Deferred from: code review of 6-3-banner-static-page-and-menu-administration (2026-04-10)

- [x] Admin error messages expose raw exception text in menu routes (`app/api/admin/menu/route.ts:229`) — resolved on 2026-04-10 by safe 500 error mapping in admin menu routes.

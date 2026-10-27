-- Account deletion is confirmed with an email OTP (accounts created through
-- Google sign-in have no password to confirm with).
ALTER TYPE "OtpPurpose" ADD VALUE 'DELETE_ACCOUNT';

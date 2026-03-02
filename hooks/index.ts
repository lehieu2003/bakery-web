/**
 * Hooks Index
 * Central export for all hooks
 */

// Auth hooks
export {
  useUser,
  useLogin,
  useLogout,
  useRegister,
  useRegisterVerify,
  useResetPassword,
  useResetPasswordVerify,
  authKeys,
} from './use-auth';

// UI hooks
export { useMobile } from './use-mobile';
export { useToast, toast } from './use-toast';

// Admin hooks - re-export from admin folder
export * from './admin';

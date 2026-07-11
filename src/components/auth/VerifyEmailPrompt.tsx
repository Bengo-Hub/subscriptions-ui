'use client';

import { VerifyEmailBanner, type EmailVerificationState } from '@bengo-hub/shared-ui-lib/auth';
import { useAuthStore } from '@/store/auth';

const ACCOUNTS_VERIFY_URL =
  (process.env.NEXT_PUBLIC_ACCOUNTS_URL || 'https://accounts.codevertexitsolutions.com') +
  '/dashboard/profile';

export function VerifyEmailPrompt() {
  const user = useAuthStore((s) => s.user);
  const state = (user as { email_verification?: EmailVerificationState } | null)?.email_verification;
  if (!state || state.verified) return null;
  return <VerifyEmailBanner state={state} verifyUrl={ACCOUNTS_VERIFY_URL} />;
}

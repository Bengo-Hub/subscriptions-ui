'use client';

import { redirect } from 'next/navigation';

// Plans management is now unified at /plans (adapts based on platform vs tenant role)
export default function PlatformPlansRedirect() {
  redirect('/plans');
}

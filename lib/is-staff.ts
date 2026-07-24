import type { User } from '@/lib/types';

// Mirrors the database public.is_staff() predicate for client-side route
// guards and conditional nav: active Admin or Agent.
export function isStaffUser(user: User | null | undefined): boolean {
  return !!user && user.is_active && (user.role === 'Admin' || user.role === 'Agent');
}

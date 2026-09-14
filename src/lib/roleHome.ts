import type { UserRole } from '../types';

export function getHomePath(role: UserRole | undefined): string {
  return role === 'interviewer' ? '/my-interviews' : '/dashboard';
}

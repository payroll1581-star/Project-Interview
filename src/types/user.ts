export type UserRole = 'admin' | 'interviewer';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  position?: string;
}

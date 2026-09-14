export type UserRole = 'admin' | 'interviewer';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  position?: string;
}

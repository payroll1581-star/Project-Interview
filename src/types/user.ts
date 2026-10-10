export type UserRole = 'admin' | 'interviewer';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  position?: string;
  // Manpower Requisition Form (PDF). Only the server sends it, and only to admins.
  mrfUrl?: string;
}

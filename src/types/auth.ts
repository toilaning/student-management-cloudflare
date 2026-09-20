export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT';

export interface User {
  id: string;          // ADMIN001, GV001..GV020, ST001..ST400
  username: string;
  passwordHash: string; // SHA-256
  role: Role;
  name: string;
  email: string;
  avatar?: string;
  discordId?: string;
  discordUsername?: string;
  isActive: boolean;
}

export interface SessionContext {
  user: User;
  token?: string;
}

export type PermissionAction = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'APPROVE';
export type Resource = 'STUDENT' | 'TEACHER' | 'CLASSROOM' | 'SCHEDULE' | 'ATTENDANCE' | 'PAYROLL' | 'TUITION' | 'AUDIT' | 'REQUEST';

export interface Permission {
  role: Role;
  resource: Resource;
  actions: PermissionAction[];
}

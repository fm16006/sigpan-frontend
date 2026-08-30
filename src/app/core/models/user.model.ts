export type UserRole = 'ADMIN' | 'CASHIER' | 'CUSTOMER' | 'PRODUCTION';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}
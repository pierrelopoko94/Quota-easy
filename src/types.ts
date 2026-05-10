export type Role = 'chef' | 'user';

export interface UserProfile {
  uid: string;
  name: string;
  email?: string;
  role: Role;
  photoURL?: string;
  groupId?: string;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  chefId: string;
  budget: number;
  createdAt: string;
}

export interface AccessCode {
  code: string;
  groupId: string;
  used: boolean;
  usedBy?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  groupId: string;
  participantId: string;
  participantName: string;
  amount: number;
  date: string;
  description: string;
  category: string;
  createdBy: string;
}

export interface Announcement {
  id: string;
  groupId: string;
  title: string;
  message: string;
  importance: 'normal' | 'high';
  date: string;
  createdBy: string;
}

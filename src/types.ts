export type ApplicationType = 'new' | 'correction' | 'death';

export type ApplicationStatus = 'pending' | 'processing' | 'approved' | 'rejected';

export interface UserProfile {
  uid: string;
  fullName: string;
  phoneNumber: string;
  address: string;
  photoURL?: string;
  role: 'user' | 'admin';
  createdAt: number;
  balance: number;
}

export interface Application {
  id: string;
  userId: string;
  type: ApplicationType;
  status: ApplicationStatus;
  applicantName: string;
  formData: any;
  createdAt: number;
  updatedAt: number;
  comment?: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

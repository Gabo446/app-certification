export type ProfileDto = {
  id?: string;
  jobTitle: string;
  department: string;
  managerName: string;
  organization: string;
  userId?: string; // Optional reference to user
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
}

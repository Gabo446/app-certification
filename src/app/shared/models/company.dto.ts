export type companyDto = {
  id?: string;
  businessName: string;
  tradeName: string;
  rut: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  region: string;
  postalCode: string;
  businessSector: string;
  businessType: string; // SPA, LTDA, SA, etc.
  website?: string;
  description?: string;
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
  employeeCount: number;
  annualRevenue?: number;
  foundedYear?: number;
  taxId: string; // RUT formatted for tax purposes
}

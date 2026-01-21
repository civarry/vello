export interface EarningItem {
  label: string;
  amount: number;
}

export interface DeductionItem {
  label: string;
  amount: number;
}

export interface PayslipData {
  earnings: EarningItem[];
  deductions: DeductionItem[];
  totalEarnings: number;
  totalDeductions: number;
  netPay: number;
  metadata?: Record<string, unknown>;
}

export interface PayslipWithRelations {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  data: PayslipData;
  pdfUrl: string | null;
  createdAt: Date;
  employee: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    email: string | null;
    department: string | null;
    position: string | null;
  };
  template: {
    id: string;
    name: string;
  };
}

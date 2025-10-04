export interface User {
  id: string;
  email: string;
  password?: string;
  name: string;
  role: 'Admin' | 'Manager' | 'Employee';
  companyId: string;
  company?: Company;
  managerId?: string;
  employeeAssignment?: {
    managerId: string;
    manager: User;
  };
  createdAt: string;
  updatedAt?: string;
}

export interface Company {
  id: string;
  name: string;
  country?: string;
  defaultCurrency: string;
  baseCurrency?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Expense {
  id: string;
  employeeId: string;
  employee?: User;
  companyId: string;
  company?: Company;
  amount: number;
  originalCurrency: string;
  companyCurrencyAmount: number;
  category: string;
  description?: string;
  date: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  receipt?: string;
  approvals?: ApprovalStep[];
  createdAt: string;
  updatedAt?: string;
}

export interface ApprovalRule {
  id: string;
  companyId: string;
  autoApproveLimit: number;
  requireManagerApproval: boolean;
  requireFinanceApproval: boolean;
  requireDirectorApproval: boolean;
  fastTrackThreshold: number;
  maxExpenseAmount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApprovalStep {
  id: string;
  expenseId: string;
  expense?: Expense;
  approverId: string;
  approver?: User;
  approverRole: 'Manager' | 'Finance' | 'Director';
  stepNumber: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  comments?: string;
  createdAt: string;
  decidedAt?: string;
}

export interface ApprovalFlowStep {
  id: string;
  companyId: string;
  stepNumber: number;
  approverRole: 'Manager' | 'Finance' | 'Director';
  staticApproverId?: string;
  staticApprover?: User;
}


import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  signin: (email: string, password: string) =>
    api.post('/auth/signin', { email, password }),
  signup: (data: {
    email: string;
    password: string;
    name: string;
    role: string;
    companyId: string;
  }) => api.post('/auth/signup', data),
  me: () => api.get('/auth/me'),
};

// Companies API
export const companiesAPI = {
  getAll: () => api.get('/companies'),
  create: (data: { name: string; defaultCurrency: string }) =>
    api.post('/companies', data),
};

// Users API
export const usersAPI = {
  getAll: (companyId?: string) =>
    api.get('/users', { params: { companyId } }),
  create: (data: any) => api.post('/users', data),
  update: (userId: string, data: any) => api.put(`/users/${userId}`, data),
  delete: (userId: string) => api.delete(`/users/${userId}`),
};

// Expenses API
export const expensesAPI = {
  getAll: (params?: any) => api.get('/expenses', { params }),
  getById: (id: string) => api.get(`/expenses/${id}`),
  create: (data: any) => api.post('/expenses', data),
  getNextApprover: (id: string) => api.get(`/expenses/${id}/next-approver`),
  scanReceipt: (imageFile: File) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    return api.post('/expenses/ocr', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// Approval API
export const approvalAPI = {
  approve: (data: {
    expenseId: string;
    approverId: string;
    decision: 'Approved' | 'Rejected';
    comments?: string;
  }) => api.post('/approval-flow/approve', data),
  getPending: (approverId: string) =>
    api.get('/approval-flow/pending', { params: { approverId } }),
  getHistory: (expenseId: string) =>
    api.get('/approval-flow/history', { params: { expenseId } }),
};


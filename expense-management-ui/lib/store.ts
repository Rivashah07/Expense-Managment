import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  companyId: string;
  company: {
    id: string;
    name: string;
    defaultCurrency: string;
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  isHydrated: boolean;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  token: null,
  isHydrated: false,
  setAuth: (user, token) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }
    set({ user, token });
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    set({ user: null, token: null });
  },
  setHydrated: () => set({ isHydrated: true }),
}));

// Hydrate from localStorage on client side
if (typeof window !== 'undefined') {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      useAuthStore.setState({ user, token, isHydrated: true });
    } catch (e) {
      console.error('Failed to parse user from localStorage');
    }
  } else {
    useAuthStore.setState({ isHydrated: true });
  }
}


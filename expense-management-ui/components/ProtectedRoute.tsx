'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, token } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!token || !user) {
      router.push('/signin');
      return;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      // Redirect to appropriate dashboard based on role
      if (user.role === 'Admin') {
        router.push('/admin');
      } else if (user.role === 'Manager') {
        router.push('/manager');
      } else {
        router.push('/employee');
      }
    }
  }, [user, token, allowedRoles, router]);

  if (!token || !user) {
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}


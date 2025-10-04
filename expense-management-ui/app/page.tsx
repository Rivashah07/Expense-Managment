'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const { user, token } = useAuthStore();

  useEffect(() => {
    if (user && token) {
      if (user.role === 'Admin') {
        router.push('/admin');
      } else if (user.role === 'Manager') {
        router.push('/manager');
      } else {
        router.push('/employee');
      }
    }
  }, [user, token, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="text-center space-y-6 p-8">
        <h1 className="text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
          Expense Management
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl">
          Multi-role expense management system with sequential approval workflow
        </p>
        <div className="flex gap-4 justify-center mt-8">
          <Link href="/signin">
            <Button size="lg" className="text-lg px-8">
              Sign In
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="lg" variant="outline" className="text-lg px-8">
              Sign Up
            </Button>
          </Link>
        </div>
        <div className="mt-12 text-sm text-gray-500">
          <p>✅ Sequential Approval Workflow</p>
          <p>✅ Multi-Role Support (Admin, Manager, Employee)</p>
          <p>✅ Conditional Fast-Track Rules</p>
        </div>
      </div>
    </div>
  );
}

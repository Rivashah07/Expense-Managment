'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/store';
import { usersAPI } from '@/lib/api';

export default function UsersTestPage() {
  const { user } = useAuthStore();
  const [status, setStatus] = useState('Initializing...');
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    checkSetup();
  }, [user]);

  const checkSetup = () => {
    if (!user) {
      setStatus('❌ No user logged in');
      setError('Please sign in first');
      return;
    }

    setStatus(`✅ User: ${user.name} (${user.role})`);
    
    if (!user.companyId) {
      setError('❌ No companyId found in user object');
    } else {
      setError(`✅ CompanyId: ${user.companyId}`);
    }
  };

  const testLoadUsers = async () => {
    try {
      setStatus('Loading users...');
      setError('');
      
      if (!user?.companyId) {
        throw new Error('No company ID available');
      }

      const { data } = await usersAPI.getAll(user.companyId);
      setUsers(data || []);
      setStatus(`✅ Loaded ${data?.length || 0} users`);
      setError('');
    } catch (err: any) {
      setStatus('❌ Failed to load users');
      setError(err.response?.data?.error || err.message || 'Unknown error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>User Management - Debug Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Status:</h3>
            <p className="text-sm">{status}</p>
          </div>

          {error && (
            <div className={`p-3 rounded ${error.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="font-semibold">User Info:</h3>
            <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>

          <Button onClick={testLoadUsers} className="w-full">
            Test Load Users
          </Button>

          {users.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Loaded Users ({users.length}):</h3>
              <div className="space-y-2">
                {users.map((u) => (
                  <div key={u.id} className="bg-white p-3 rounded border">
                    <p className="font-medium">{u.name}</p>
                    <p className="text-sm text-gray-600">{u.email}</p>
                    <p className="text-xs text-gray-500">Role: {u.role}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t">
            <a href="/admin" className="text-blue-600 hover:underline text-sm">
              ← Back to Admin Dashboard
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


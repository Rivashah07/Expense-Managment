'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestPage() {
  const [backendStatus, setBackendStatus] = useState<string>('');
  const [frontendStatus, setFrontendStatus] = useState<string>('Frontend is working! ✅');

  const testBackend = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/companies');
      const data = await response.json();
      setBackendStatus(`Backend connected! ✅ Found ${data.length} companies`);
    } catch (error) {
      setBackendStatus(`Backend connection failed ❌: ${error}`);
    }
  };

  const testLocalStorage = () => {
    try {
      localStorage.setItem('test', 'value');
      const value = localStorage.getItem('test');
      localStorage.removeItem('test');
      alert(`LocalStorage works! ✅ Test value: ${value}`);
    } catch (error) {
      alert(`LocalStorage failed ❌: ${error}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>System Test Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="font-semibold mb-2">Frontend Status:</p>
            <p className="text-green-600">{frontendStatus}</p>
          </div>

          <div>
            <Button onClick={testBackend} className="w-full">
              Test Backend Connection
            </Button>
            {backendStatus && (
              <p className={`mt-2 ${backendStatus.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
                {backendStatus}
              </p>
            )}
          </div>

          <div>
            <Button onClick={testLocalStorage} variant="outline" className="w-full">
              Test LocalStorage
            </Button>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-gray-600 mb-2">Quick Links:</p>
            <div className="space-y-2">
              <a href="/signup" className="block text-blue-600 hover:underline">→ Signup Page</a>
              <a href="/signin" className="block text-blue-600 hover:underline">→ Signin Page</a>
              <a href="/admin" className="block text-blue-600 hover:underline">→ Admin Dashboard</a>
            </div>
          </div>

          <div className="pt-4 border-t text-xs text-gray-500">
            <p>Frontend: http://localhost:3001</p>
            <p>Backend: http://localhost:3000</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


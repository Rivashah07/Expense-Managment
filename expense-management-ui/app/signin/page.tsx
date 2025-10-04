'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { toast } from 'sonner';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotDialogOpen, setForgotDialogOpen] = useState(false);
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data } = await authAPI.signin(email, password);
      setAuth(data.user, data.token);
      toast.success('Welcome back!');
      
      // Redirect based on role
      if (data.user.role === 'Admin') {
        router.push('/admin');
      } else if (data.user.role === 'Manager') {
        router.push('/manager');
      } else {
        router.push('/employee');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (!forgotPasswordEmail) {
      toast.error('Please enter your email address');
      return;
    }
    
    // Mock functionality - just show success message
    toast.success(`Password reset link sent to ${forgotPasswordEmail}`);
    setForgotDialogOpen(false);
    setForgotPasswordEmail('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
          <CardDescription>Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          
          <div className="mt-4 flex items-center justify-between text-sm">
            <Dialog open={forgotDialogOpen} onOpenChange={setForgotDialogOpen}>
              <DialogTrigger asChild>
                <button className="text-blue-600 hover:underline">
                  Forgot Password?
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reset Password</DialogTitle>
                  <DialogDescription>
                    Enter your email address and we'll send you a link to reset your password.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">Email</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="you@example.com"
                      value={forgotPasswordEmail}
                      onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleForgotPassword} className="w-full">
                    Send Reset Link
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <span className="text-gray-600">
              Don't have an account?{' '}
              <Link href="/signup" className="text-blue-600 hover:underline">
                Sign up
              </Link>
            </span>
          </div>
          <div className="mt-6 border-t pt-6">
            <p className="text-sm text-gray-600 mb-2">Demo accounts:</p>
            <div className="space-y-1 text-xs text-gray-500">
              <p>• admin@acme.com / password123</p>
              <p>• manager@acme.com / password123</p>
              <p>• employee1@acme.com / password123</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


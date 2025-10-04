'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { usersAPI, expensesAPI, companiesAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Badge } from '@/components/ui/badge';

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [users, setUsers] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalExpenses: 0, pendingExpenses: 0 });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [usersRes, expensesRes] = await Promise.all([
        usersAPI.getAll(user?.company.id),
        expensesAPI.getAll({ companyId: user?.company.id }),
      ]);
      
      setUsers(usersRes.data);
      setExpenses(expensesRes.data);
      setStats({
        totalUsers: usersRes.data.length,
        totalExpenses: expensesRes.data.length,
        pendingExpenses: expensesRes.data.filter((e: any) => e.status === 'Pending').length,
      });
    } catch (error) {
      console.error('Failed to load data');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold">Admin Dashboard</h2>
            <p className="text-gray-600 mt-2">Manage users, expenses, and company settings</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/users">
              <Button variant="outline">Manage Users</Button>
            </Link>
            <Link href="/admin/rules">
              <Button variant="outline">Approval Rules</Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{stats.totalUsers}</CardTitle>
              <CardDescription>Total Users</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{stats.totalExpenses}</CardTitle>
              <CardDescription>Total Expenses</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-yellow-600">{stats.pendingExpenses}</CardTitle>
              <CardDescription>Pending Approvals</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Company Users</CardTitle>
            <CardDescription>All registered users in your organization</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Badge>{u.role}</Badge>
                    </TableCell>
                    <TableCell>{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Expenses</CardTitle>
            <CardDescription>Latest expense submissions</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.slice(0, 10).map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{expense.employee?.name || 'N/A'}</TableCell>
                    <TableCell>{expense.category}</TableCell>
                    <TableCell className="font-semibold">${parseFloat(expense.amount).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge className={
                        expense.status === 'Approved' ? 'bg-green-100 text-green-800' :
                        expense.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }>
                        {expense.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}


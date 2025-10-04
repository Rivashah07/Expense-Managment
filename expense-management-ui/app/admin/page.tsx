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
import { Users, DollarSign, Clock, TrendingUp, Settings, UserCog } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';

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

  const totalExpenseAmount = expenses.reduce((sum, exp) => sum + parseFloat(exp.companyCurrencyAmount || exp.amount), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Admin Dashboard
            </h2>
            <p className="text-gray-600 mt-2">Manage users, expenses, and company settings</p>
          </div>
          <div className="flex gap-3">
            <Link href="/admin/users">
              <Button variant="outline" className="flex items-center gap-2">
                <UserCog className="w-4 h-4" />
                Manage Users
              </Button>
            </Link>
            <Link href="/admin/rules">
              <Button className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600">
                <Settings className="w-4 h-4" />
                Approval Rules
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
              <Users className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-gray-500 mt-1">Active in organization</p>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Expenses</CardTitle>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalExpenses}</div>
              <p className="text-xs text-gray-500 mt-1">All time submissions</p>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Pending Approvals</CardTitle>
              <Clock className="h-5 w-5 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{stats.pendingExpenses}</div>
              <p className="text-xs text-gray-500 mt-1">Awaiting review</p>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Amount</CardTitle>
              <DollarSign className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(totalExpenseAmount, user?.company?.defaultCurrency || 'USD')}
              </div>
              <p className="text-xs text-gray-500 mt-1">All expenses</p>
            </CardContent>
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

        {/* Expense Breakdown by Category */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Expenses by Category</CardTitle>
              <CardDescription>Breakdown of spending across categories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {['Travel', 'Meals', 'Office Supplies', 'Equipment', 'Other'].map((category) => {
                  const categoryExpenses = expenses.filter(e => e.category === category);
                  const categoryTotal = categoryExpenses.reduce((sum, e) => sum + parseFloat(e.companyCurrencyAmount || e.amount), 0);
                  const percentage = totalExpenseAmount > 0 ? (categoryTotal / totalExpenseAmount * 100).toFixed(1) : 0;
                  
                  const categoryIcons: any = {
                    'Travel': '✈️',
                    'Meals': '🍽️',
                    'Office Supplies': '📎',
                    'Equipment': '💻',
                    'Other': '📦'
                  };

                  return (
                    <div key={category} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium flex items-center gap-2">
                          <span>{categoryIcons[category]}</span>
                          {category}
                        </span>
                        <span className="text-gray-600">
                          {formatCurrency(categoryTotal, user?.company?.defaultCurrency || 'USD')} ({percentage}%)
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Approval Status Overview</CardTitle>
              <CardDescription>Current state of expense approvals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {[
                  { status: 'Pending', color: 'from-yellow-400 to-yellow-600', icon: '⏳' },
                  { status: 'Approved', color: 'from-green-400 to-green-600', icon: '✅' },
                  { status: 'Rejected', color: 'from-red-400 to-red-600', icon: '❌' }
                ].map(({ status, color, icon }) => {
                  const statusExpenses = expenses.filter(e => e.status === status);
                  const statusTotal = statusExpenses.reduce((sum, e) => sum + parseFloat(e.companyCurrencyAmount || e.amount), 0);
                  const percentage = totalExpenseAmount > 0 ? (statusTotal / totalExpenseAmount * 100).toFixed(1) : 0;

                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium flex items-center gap-2">
                          <span>{icon}</span>
                          {status}
                        </span>
                        <div className="text-right">
                          <div className="font-bold">
                            {formatCurrency(statusTotal, user?.company?.defaultCurrency || 'USD')}
                          </div>
                          <div className="text-xs text-gray-500">
                            {statusExpenses.length} expense{statusExpenses.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full bg-gradient-to-r ${color} transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

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


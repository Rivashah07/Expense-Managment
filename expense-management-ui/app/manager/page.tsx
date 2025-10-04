'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { approvalAPI, expensesAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function ManagerDashboard() {
  const { user } = useAuthStore();
  const [pendingExpenses, setPendingExpenses] = useState<any[]>([]);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPendingExpenses();
  }, [user]);

  const loadPendingExpenses = async () => {
    try {
      const { data } = await approvalAPI.getPending(user!.id);
      setPendingExpenses(data);
    } catch (error) {
      toast.error('Failed to load pending expenses');
    }
  };

  const handleApproval = async (decision: 'Approved' | 'Rejected') => {
    if (!selectedExpense) return;
    setLoading(true);

    try {
      const result = await approvalAPI.approve({
        expenseId: selectedExpense.expenseId,
        approverId: user!.id,
        decision,
        comments,
      });
      
      toast.success(
        `Expense ${decision.toLowerCase()}! ${result.data.fastTracked ? '⚡ Fast-tracked' : ''}`
      );
      setSelectedExpense(null);
      setComments('');
      loadPendingExpenses();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to process approval');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: any = {
      Pending: 'bg-yellow-100 text-yellow-800',
      Approved: 'bg-green-100 text-green-800',
      Rejected: 'bg-red-100 text-red-800',
    };
    return <Badge className={colors[status] || ''}>{status}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Manager Dashboard</h2>
          <p className="text-gray-600 mt-2">Review and approve expense requests</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{pendingExpenses.length}</CardTitle>
              <CardDescription>Pending Approvals</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pending Expense Approvals</CardTitle>
            <CardDescription>Review and approve or reject expense requests</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500">
                      No pending approvals
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingExpenses.map((approval) => (
                    <TableRow key={approval.id}>
                      <TableCell className="font-medium">
                        {approval.expense.employee.name}
                      </TableCell>
                      <TableCell>{format(new Date(approval.expense.date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>{approval.expense.category}</TableCell>
                      <TableCell className="font-semibold">
                        ${parseFloat(approval.expense.amount).toFixed(2)}
                      </TableCell>
                      <TableCell>{getStatusBadge(approval.status)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => setSelectedExpense(approval)}
                        >
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={!!selectedExpense} onOpenChange={() => setSelectedExpense(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Review Expense</DialogTitle>
            </DialogHeader>
            {selectedExpense && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Employee</Label>
                    <p className="text-sm font-medium">{selectedExpense.expense.employee.name}</p>
                  </div>
                  <div>
                    <Label>Amount</Label>
                    <p className="text-2xl font-bold text-green-600">
                      ${parseFloat(selectedExpense.expense.amount).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <Label>Category</Label>
                    <p className="text-sm">{selectedExpense.expense.category}</p>
                  </div>
                  <div>
                    <Label>Date</Label>
                    <p className="text-sm">{format(new Date(selectedExpense.expense.date), 'MMM dd, yyyy')}</p>
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <p className="text-sm">{selectedExpense.expense.description || 'No description'}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comments">Comments</Label>
                  <Input
                    id="comments"
                    placeholder="Add your comments..."
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => handleApproval('Approved')}
                    disabled={loading}
                  >
                    Approve
                  </Button>
                  <Button
                    className="flex-1 bg-red-600 hover:bg-red-700"
                    onClick={() => handleApproval('Rejected')}
                    disabled={loading}
                  >
                    Reject
                  </Button>
                </div>
                {parseFloat(selectedExpense.expense.amount) > 500 && (
                  <p className="text-xs text-blue-600 text-center">
                    ⚡ This expense will be fast-tracked (amount {'>'} $500)
                  </p>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}


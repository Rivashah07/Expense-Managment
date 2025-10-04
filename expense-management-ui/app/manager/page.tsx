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
import { Textarea } from '@/components/ui/textarea';
import { approvalAPI, expensesAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/currency';
import { CheckCircle, XCircle, DollarSign, Calendar, User } from 'lucide-react';

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
                      <TableCell>
                        <div className="font-semibold">
                          {formatCurrency(parseFloat(approval.expense.companyCurrencyAmount || approval.expense.amount), user?.company?.defaultCurrency || 'USD')}
                        </div>
                        {approval.expense.originalCurrency !== user?.company?.defaultCurrency && (
                          <div className="text-xs text-gray-500">
                            Original: {formatCurrency(parseFloat(approval.expense.amount), approval.expense.originalCurrency)}
                          </div>
                        )}
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
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle className="text-2xl">Review Expense Request</DialogTitle>
            </DialogHeader>
            {selectedExpense && (
              <div className="space-y-6">
                {/* Expense Amount Highlight */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Company Currency Amount</p>
                      <p className="text-4xl font-bold text-blue-600">
                        {formatCurrency(
                          parseFloat(selectedExpense.expense.companyCurrencyAmount || selectedExpense.expense.amount),
                          user?.company?.defaultCurrency || 'USD'
                        )}
                      </p>
                      {selectedExpense.expense.originalCurrency !== user?.company?.defaultCurrency && (
                        <p className="text-sm text-gray-600 mt-2">
                          Original: {formatCurrency(parseFloat(selectedExpense.expense.amount), selectedExpense.expense.originalCurrency)}
                        </p>
                      )}
                    </div>
                    <DollarSign className="w-16 h-16 text-blue-300" />
                  </div>
                </div>

                {/* Expense Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <Label className="text-gray-600">Employee</Label>
                      <p className="text-sm font-semibold">{selectedExpense.expense.employee.name}</p>
                      <p className="text-xs text-gray-500">{selectedExpense.expense.employee.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <Label className="text-gray-600">Date</Label>
                      <p className="text-sm font-medium">
                        {format(new Date(selectedExpense.expense.date), 'MMMM dd, yyyy')}
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-600">Category</Label>
                    <Badge className="mt-1">{selectedExpense.expense.category}</Badge>
                  </div>

                  <div>
                    <Label className="text-gray-600">Status</Label>
                    <div className="mt-1">
                      {getStatusBadge(selectedExpense.status)}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <Label className="text-gray-600">Description</Label>
                  <p className="text-sm mt-1 p-3 bg-gray-50 rounded border">
                    {selectedExpense.expense.description || 'No description provided'}
                  </p>
                </div>

                {/* Comments */}
                <div className="space-y-2">
                  <Label htmlFor="comments">Add Your Comments</Label>
                  <Textarea
                    id="comments"
                    placeholder="Optional: Add comments about this approval decision..."
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                {/* Fast Track Notice */}
                {parseFloat(selectedExpense.expense.amount) > 500 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800 flex items-center gap-2">
                      <span className="text-xl">⚡</span>
                      <span>
                        <strong>Fast-track eligible:</strong> This expense exceeds $500 and will be processed immediately upon approval.
                      </span>
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700 h-12 text-base"
                    onClick={() => handleApproval('Approved')}
                    disabled={loading}
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    {loading ? 'Processing...' : 'Approve'}
                  </Button>
                  <Button
                    className="flex-1 bg-red-600 hover:bg-red-700 h-12 text-base"
                    onClick={() => handleApproval('Rejected')}
                    disabled={loading}
                  >
                    <XCircle className="w-5 h-5 mr-2" />
                    {loading ? 'Processing...' : 'Reject'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}


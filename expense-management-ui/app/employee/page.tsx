'use client';

import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { expensesAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { toast } from 'sonner';
import { format } from 'date-fns';
import ReceiptUploadDialog from '@/components/ReceiptUploadDialog';
import { Upload, Scan, Loader2, DollarSign, Clock, XCircle } from 'lucide-react';
import { extractReceiptData, validateReceiptImage } from '@/lib/ocr';
import { convertCurrency, getPopularCurrencies } from '@/lib/currency';

export default function EmployeeDashboard() {
  const { user } = useAuthStore();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currencies] = useState(getPopularCurrencies());
  const [formData, setFormData] = useState({
    amount: '',
    originalCurrency: user?.company?.defaultCurrency || 'USD',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadExpenses();
  }, [user]);

  const loadExpenses = async () => {
    try {
      const { data } = await expensesAPI.getAll({ employeeId: user?.id });
      setExpenses(data);
    } catch (error) {
      toast.error('Failed to load expenses');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateReceiptImage(file);
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid file');
      return;
    }

    setReceiptFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    
    // Start OCR scanning
    setScanning(true);
    toast.info('Scanning receipt... This may take a few seconds');

    try {
      const ocrResult = await extractReceiptData(file);
      
      // Auto-fill form with OCR results
      if (ocrResult.amount) {
        setFormData(prev => ({ ...prev, amount: ocrResult.amount!.toString() }));
      }
      if (ocrResult.date) {
        setFormData(prev => ({ ...prev, date: ocrResult.date! }));
      }
      if (ocrResult.description) {
        setFormData(prev => ({ ...prev, description: ocrResult.description! }));
      }
      if (ocrResult.category) {
        setFormData(prev => ({ ...prev, category: ocrResult.category! }));
      }

      toast.success(`Receipt scanned! Confidence: ${ocrResult.confidence}%`);
    } catch (error) {
      toast.error('Failed to scan receipt. Please enter details manually.');
    } finally {
      setScanning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Convert currency if different from company default
      let companyCurrencyAmount = parseFloat(formData.amount);
      
      if (formData.originalCurrency !== user?.company?.defaultCurrency) {
        try {
          companyCurrencyAmount = await convertCurrency(
            parseFloat(formData.amount),
            formData.originalCurrency,
            user?.company?.defaultCurrency || 'USD'
          );
        } catch (err) {
          toast.warning('Currency conversion failed. Using original amount.');
        }
      }

      await expensesAPI.create({
        ...formData,
        amount: parseFloat(formData.amount),
        companyCurrencyAmount,
        employeeId: user?.id,
        companyId: user?.company.id,
      });
      
      toast.success('Expense submitted successfully!');
      
      // Reset form
      setFormData({
        amount: '',
        originalCurrency: user?.company?.defaultCurrency || 'USD',
        category: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
      });
      setReceiptFile(null);
      setPreviewUrl('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      loadExpenses();
    } catch (error) {
      toast.error('Failed to submit expense');
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

  // Calculate stats
  const totalAmount = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
  const pendingCount = expenses.filter(e => e.status === 'Pending').length;
  const approvedCount = expenses.filter(e => e.status === 'Approved').length;
  const rejectedCount = expenses.filter(e => e.status === 'Rejected').length;
  const approvalRate = expenses.length > 0 ? (approvedCount / expenses.length * 100).toFixed(1) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              My Expenses
            </h2>
            <p className="text-gray-600 mt-1">Track and submit your expense reports</p>
          </div>
          <div className="flex space-x-3">
            <ReceiptUploadDialog 
              onExpenseCreated={loadExpenses}
              employeeId={user?.id || ''}
              companyId={user?.company?.id || ''}
            />
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0">
                  <Upload className="w-4 h-4 mr-2" />
                  Manual Entry
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Submit Expense</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Receipt Upload with OCR */}
                <div className="space-y-2">
                  <Label>Receipt (Optional - Auto-scan with OCR)</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="receipt-upload"
                    />
                    <label htmlFor="receipt-upload" className="cursor-pointer">
                      {previewUrl ? (
                        <div className="space-y-2">
                          <img src={previewUrl} alt="Receipt preview" className="max-h-40 mx-auto rounded" />
                          <p className="text-sm text-gray-600">Click to change receipt</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {scanning ? (
                            <Loader2 className="w-12 h-12 mx-auto text-blue-500 animate-spin" />
                          ) : (
                            <Upload className="w-12 h-12 mx-auto text-gray-400" />
                          )}
                          <div>
                            <p className="text-sm font-medium">
                              {scanning ? 'Scanning receipt...' : 'Click to upload receipt'}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              AI will auto-fill expense details
                            </p>
                          </div>
                        </div>
                      )}
                    </label>
                  </div>
                  {scanning && (
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <Scan className="w-4 h-4 animate-pulse" />
                      <span>Analyzing receipt with OCR...</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select 
                      value={formData.originalCurrency} 
                      onValueChange={(value) => setFormData({ ...formData, originalCurrency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((c) => (
                          <SelectItem key={c.currency} value={c.currency}>
                            {c.currencySymbol} {c.currency}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Travel">✈️ Travel</SelectItem>
                      <SelectItem value="Office Supplies">📎 Office Supplies</SelectItem>
                      <SelectItem value="Meals">🍽️ Meals</SelectItem>
                      <SelectItem value="Equipment">💻 Equipment</SelectItem>
                      <SelectItem value="Other">📦 Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g., Lunch meeting with client"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading || scanning}>
                  {loading ? 'Submitting...' : scanning ? 'Wait for scan...' : 'Submit Expense'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Submitted</CardTitle>
              <DollarSign className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                ${totalAmount.toFixed(2)}
              </div>
              <p className="text-xs text-gray-500 mt-1">{expenses.length} expense{expenses.length !== 1 ? 's' : ''}</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
              <Clock className="h-5 w-5 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
              <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Approved</CardTitle>
              <Badge className="h-5 w-5 bg-green-100 text-green-600 border-0" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
              <p className="text-xs text-gray-500 mt-1">{approvalRate}% approval rate</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Rejected</CardTitle>
              <XCircle className="h-5 w-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
              <p className="text-xs text-gray-500 mt-1">Needs revision</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Expense History</CardTitle>
            <CardDescription>Track your submitted expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500">
                      No expenses yet. Submit your first expense!
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map((expense) => (
                    <TableRow key={expense.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{format(new Date(expense.date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        <span className="text-sm">{expense.category}</span>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{expense.description || '-'}</TableCell>
                      <TableCell className="font-semibold text-purple-600">
                        ${parseFloat(expense.amount).toFixed(2)}
                        {expense.originalCurrency && expense.originalCurrency !== user?.company?.defaultCurrency && (
                          <div className="text-xs text-gray-500 font-normal">
                            {expense.originalCurrency}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(expense.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}


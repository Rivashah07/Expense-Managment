'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Upload, Camera, FileImage, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { expensesAPI } from '@/lib/api';
import { toast } from 'sonner';

interface ReceiptUploadDialogProps {
  onExpenseCreated: () => void;
  employeeId: string;
  companyId: string;
}

interface OCRResult {
  amount: number;
  currency: string;
  category: string;
  description: string;
  date: string;
  rawText: string;
}

export default function ReceiptUploadDialog({ onExpenseCreated, employeeId, companyId }: ReceiptUploadDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [formData, setFormData] = useState({
    amount: '',
    originalCurrency: 'USD',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setOcrResult(null);
      } else {
        toast.error('Please select an image file');
      }
    }
  };

  const handleScanReceipt = async () => {
    if (!selectedFile) return;

    setIsScanning(true);
    try {
      const { data } = await expensesAPI.scanReceipt(selectedFile);
      setOcrResult(data);
      
      // Auto-fill form with OCR results
      setFormData({
        amount: data.amount.toString(),
        originalCurrency: data.currency,
        category: data.category,
        description: data.description,
        date: data.date,
      });
      
      toast.success('Receipt scanned successfully!');
    } catch (error) {
      console.error('OCR Error:', error);
      toast.error('Failed to scan receipt. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await expensesAPI.create({
        ...formData,
        amount: parseFloat(formData.amount),
        companyCurrencyAmount: parseFloat(formData.amount),
        employeeId,
        companyId,
      });
      
      toast.success('Expense submitted successfully!');
      handleClose();
      onExpenseCreated();
    } catch (error) {
      console.error('Submit Error:', error);
      toast.error('Failed to submit expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedFile(null);
    setPreviewUrl(null);
    setOcrResult(null);
    setFormData({
      amount: '',
      originalCurrency: 'USD',
      category: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerCamera = () => {
    fileInputRef.current?.click();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Upload className="w-4 h-4 mr-2" />
          Upload New Expense
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Receipt & Create Expense</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* File Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1. Upload Receipt</CardTitle>
              <CardDescription>Take a photo or upload an image of your receipt</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedFile ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <div className="space-y-4">
                    <div className="flex justify-center space-x-4">
                      <Button
                        variant="outline"
                        onClick={triggerCamera}
                        className="flex items-center space-x-2"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Take Photo</span>
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center space-x-2"
                      >
                        <FileImage className="w-4 h-4" />
                        <span>Upload Image</span>
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500">
                      Supported formats: JPG, PNG, GIF (Max 10MB)
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <img
                      src={previewUrl!}
                      alt="Receipt preview"
                      className="w-full h-48 object-contain border rounded-lg"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                        setOcrResult(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                  
                  <Button
                    onClick={handleScanReceipt}
                    disabled={isScanning}
                    className="w-full"
                  >
                    {isScanning ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Scanning Receipt...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Scan Receipt
                      </>
                    )}
                  </Button>
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </CardContent>
          </Card>

          {/* OCR Results Section */}
          {ocrResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                  2. Scanned Data
                </CardTitle>
                <CardDescription>Review and edit the extracted information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Amount</Label>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{ocrResult.currency}</Badge>
                      <span className="text-lg font-semibold">${ocrResult.amount}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Category</Label>
                    <Badge variant="secondary">{ocrResult.category}</Badge>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm text-gray-600">{ocrResult.description || 'No description found'}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Date</Label>
                  <p className="text-sm text-gray-600">{new Date(ocrResult.date).toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Form Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {ocrResult ? '3. Review & Submit' : '2. Enter Expense Details'}
              </CardTitle>
              <CardDescription>
                {ocrResult ? 'Review the scanned data and make any necessary changes' : 'Fill in the expense details manually'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
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
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="CAD">CAD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Travel">Travel</SelectItem>
                      <SelectItem value="Office Supplies">Office Supplies</SelectItem>
                      <SelectItem value="Meals">Meals</SelectItem>
                      <SelectItem value="Equipment">Equipment</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter expense description"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                
                <div className="flex space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || !formData.amount || !formData.category}
                    className="flex-1"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Expense'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

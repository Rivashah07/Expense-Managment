// OCR utility functions that use the backend API

import { expensesAPI } from './api';

export interface OCRResult {
  amount?: number;
  currency?: string;
  category?: string;
  description?: string;
  date?: string;
  confidence?: number;
}

export function validateReceiptImage(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'Please select an image file' };
  }

  // Check file size (10MB limit)
  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, error: 'File size must be less than 10MB' };
  }

  return { valid: true };
}

export async function extractReceiptData(file: File): Promise<OCRResult> {
  try {
    const { data } = await expensesAPI.scanReceipt(file);
    return {
      amount: data.amount,
      currency: data.currency,
      category: data.category,
      description: data.description,
      date: data.date,
      confidence: 85, // Mock confidence score
    };
  } catch (error) {
    console.error('OCR processing error:', error);
    throw new Error('Failed to process receipt image');
  }
}
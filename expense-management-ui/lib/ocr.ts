import Tesseract from 'tesseract.js';

export interface OCRResult {
  amount?: number;
  date?: string;
  description?: string;
  merchantName?: string;
  category?: string;
  confidence: number;
}

/**
 * Extract expense data from receipt image using OCR
 */
export async function extractReceiptData(imageFile: File): Promise<OCRResult> {
  try {
    const { data: { text } } = await Tesseract.recognize(imageFile, 'eng', {
      logger: (m) => console.log(m),
    });

    console.log('OCR Text:', text);

    // Extract amount (looking for currency symbols and numbers)
    const amountRegex = /(?:USD|EUR|GBP|\$|€|£)\s*(\d+(?:\.\d{2})?)|(\d+\.\d{2})/gi;
    const amountMatches = text.match(amountRegex);
    let amount: number | undefined;
    
    if (amountMatches && amountMatches.length > 0) {
      // Get the largest amount (usually the total)
      const amounts = amountMatches.map(m => {
        const num = m.replace(/[^\d.]/g, '');
        return parseFloat(num);
      }).filter(n => !isNaN(n));
      amount = Math.max(...amounts);
    }

    // Extract date (various formats)
    const dateRegex = /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})\b/;
    const dateMatch = text.match(dateRegex);
    let date: string | undefined;
    
    if (dateMatch) {
      try {
        const parsedDate = new Date(dateMatch[0]);
        if (!isNaN(parsedDate.getTime())) {
          date = parsedDate.toISOString().split('T')[0];
        }
      } catch (e) {
        console.error('Date parsing error:', e);
      }
    }

    // Extract merchant name (usually first line or near top)
    const lines = text.split('\n').filter(line => line.trim().length > 2);
    const merchantName = lines[0]?.trim() || undefined;

    // Determine category based on keywords
    const categoryKeywords: { [key: string]: string[] } = {
      'Travel': ['airline', 'flight', 'hotel', 'taxi', 'uber', 'lyft', 'airbnb', 'booking'],
      'Meals': ['restaurant', 'cafe', 'coffee', 'food', 'dining', 'pizza', 'burger', 'bar'],
      'Office Supplies': ['office', 'staples', 'depot', 'supplies', 'paper', 'pen', 'ink'],
      'Equipment': ['electronics', 'computer', 'laptop', 'phone', 'tablet', 'hardware'],
      'Other': []
    };

    let category = 'Other';
    const lowerText = text.toLowerCase();
    
    for (const [cat, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        category = cat;
        break;
      }
    }

    // Generate description from merchant and items
    const description = merchantName ? `Expense at ${merchantName}` : 'Receipt expense';

    // Calculate confidence score based on what we found
    let confidence = 0;
    if (amount) confidence += 40;
    if (date) confidence += 30;
    if (merchantName) confidence += 20;
    if (category !== 'Other') confidence += 10;

    return {
      amount,
      date,
      description,
      merchantName,
      category,
      confidence
    };
  } catch (error) {
    console.error('OCR Error:', error);
    throw new Error('Failed to process receipt image');
  }
}

/**
 * Validate image file before processing
 */
export function validateReceiptImage(file: File): { valid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Please upload a valid image (JPEG, PNG, or WebP)' };
  }

  if (file.size > maxSize) {
    return { valid: false, error: 'Image size should be less than 10MB' };
  }

  return { valid: true };
}


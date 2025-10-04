import { GoogleGenerativeAI } from '@google/generative-ai';

interface ParsedExpenseData {
  amount: number;
  currency: string;
  category: string;
  description: string;
  date: string;
  merchant: string;
  confidence: number;
  rawText: string;
}

class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  private getSystemPrompt(): string {
    return `You are an expert expense management AI that extracts structured data from receipt images. Your task is to analyze receipt images and extract accurate expense information.

EXPENSE CATEGORIES:
- Travel (hotels, flights, transportation, accommodation)
- Meals (restaurants, food, dining, catering)
- Office Supplies (stationery, paper, office materials)
- Equipment (computers, software, hardware, tools)
- Communication (phone, internet, postage)
- Training (courses, conferences, education)
- Marketing (advertising, promotional materials)
- Utilities (electricity, water, gas, internet)
- Professional Services (legal, consulting, accounting)
- Other (miscellaneous expenses)

CURRENCY CODES:
- USD (US Dollar) - $ symbol or USD text
- EUR (Euro) - € symbol or EUR text
- GBP (British Pound) - £ symbol or GBP text
- CAD (Canadian Dollar) - CAD text
- AUD (Australian Dollar) - AUD text
- JPY (Japanese Yen) - ¥ symbol or JPY text

EXTRACTION RULES:
1. AMOUNT: Extract the total amount paid (usually the largest number on the receipt)
2. CURRENCY: Identify the currency from symbols or text
3. DATE: Extract the transaction date in YYYY-MM-DD format
4. MERCHANT: Extract the business/merchant name
5. DESCRIPTION: Create a brief description of the expense
6. CATEGORY: Categorize based on merchant type and items purchased
7. CONFIDENCE: Rate your confidence in the extraction (0-100)

RESPONSE FORMAT:
Return ONLY a valid JSON object with this exact structure:
{
  "amount": number,
  "currency": "string (3-letter code)",
  "category": "string (from categories above)",
  "description": "string (brief description)",
  "date": "string (YYYY-MM-DD)",
  "merchant": "string (business name)",
  "confidence": number (0-100)
}

IMPORTANT:
- If you cannot extract certain information, use null for that field
- Always return valid JSON
- Be conservative with confidence scores
- Focus on accuracy over completeness
- If the image is unclear or not a receipt, return null for all fields with confidence 0`;
  }

  async parseReceiptImage(imageBuffer: Buffer): Promise<ParsedExpenseData> {
    try {
      // Convert buffer to base64
      const base64Image = imageBuffer.toString('base64');
      
      // Create the prompt
      const prompt = `${this.getSystemPrompt()}

Please analyze this receipt image and extract the expense information.`;

      // Generate content with the image
      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Image,
            mimeType: 'image/jpeg'
          }
        }
      ]);

      const response = await result.response;
      const text = response.text();

      // Parse the JSON response
      let parsedData: ParsedExpenseData;
      try {
        // Clean the response text to extract JSON
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in response');
        }
        
        parsedData = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error('Failed to parse Gemini response:', text);
        throw new Error('Invalid JSON response from Gemini API');
      }

      // Validate and clean the data
      const cleanedData: ParsedExpenseData = {
        amount: parsedData.amount || 0,
        currency: parsedData.currency || 'USD',
        category: parsedData.category || 'Other',
        description: parsedData.description || '',
        date: parsedData.date || new Date().toISOString().split('T')[0],
        merchant: parsedData.merchant || '',
        confidence: Math.max(0, Math.min(100, parsedData.confidence || 0)),
        rawText: text
      };

      // Additional validation
      if (cleanedData.amount <= 0) {
        cleanedData.confidence = Math.min(cleanedData.confidence, 50);
      }

      if (!cleanedData.date || cleanedData.date === 'null') {
        cleanedData.date = new Date().toISOString().split('T')[0];
        cleanedData.confidence = Math.min(cleanedData.confidence, 70);
      }

      return cleanedData;

    } catch (error) {
      console.error('Gemini API error:', error);
      
      // Return fallback data with low confidence
      return {
        amount: 0,
        currency: 'USD',
        category: 'Other',
        description: 'Failed to parse receipt',
        date: new Date().toISOString().split('T')[0],
        merchant: '',
        confidence: 0,
        rawText: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async parseReceiptText(text: string): Promise<ParsedExpenseData> {
    try {
      const prompt = `${this.getSystemPrompt()}

Please analyze this receipt text and extract the expense information:

${text}`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text();

      // Parse the JSON response
      let parsedData: ParsedExpenseData;
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in response');
        }
        
        parsedData = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error('Failed to parse Gemini response:', responseText);
        throw new Error('Invalid JSON response from Gemini API');
      }

      // Validate and clean the data
      const cleanedData: ParsedExpenseData = {
        amount: parsedData.amount || 0,
        currency: parsedData.currency || 'USD',
        category: parsedData.category || 'Other',
        description: parsedData.description || '',
        date: parsedData.date || new Date().toISOString().split('T')[0],
        merchant: parsedData.merchant || '',
        confidence: Math.max(0, Math.min(100, parsedData.confidence || 0)),
        rawText: responseText
      };

      return cleanedData;

    } catch (error) {
      console.error('Gemini text parsing error:', error);
      
      // Return fallback data with low confidence
      return {
        amount: 0,
        currency: 'USD',
        category: 'Other',
        description: 'Failed to parse receipt text',
        date: new Date().toISOString().split('T')[0],
        merchant: '',
        confidence: 0,
        rawText: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

export default new GeminiService();

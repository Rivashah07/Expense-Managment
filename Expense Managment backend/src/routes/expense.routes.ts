import { Router } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { ExpenseStatus } from '@prisma/client';
import { getNextApprover } from '../services/approvalService';
import multer from 'multer';
import Tesseract from 'tesseract.js';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

const createExpenseSchema = z.object({
  employeeId: z.string().uuid(),
  companyId: z.string().uuid(),
  amount: z.number().positive(),
  originalCurrency: z.string().length(3).toUpperCase(),
  companyCurrencyAmount: z.number().positive(),
  category: z.string().min(1),
  description: z.string().optional(),
  date: z.string().datetime().or(z.date()),
});

// OCR endpoint for receipt scanning
/**
 * @openapi
 * /api/expenses/ocr:
 *   post:
 *     tags:
 *       - Expenses
 *     summary: Extract expense data from receipt image using OCR
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Extracted expense data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 amount:
 *                   type: number
 *                 currency:
 *                   type: string
 *                 category:
 *                   type: string
 *                 description:
 *                   type: string
 *                 date:
 *                   type: string
 *                 rawText:
 *                   type: string
 *       400:
 *         description: Invalid image or OCR processing failed
 */
router.post('/ocr', upload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('No image file provided', 400);
  }

  try {
    // Perform OCR on the uploaded image
    const { data: { text } } = await Tesseract.recognize(
      req.file.buffer,
      'eng',
      {
        logger: m => console.log(m)
      }
    );

    // Parse the extracted text to find expense information
    const parsedData = parseReceiptText(text);

    res.json({
      ...parsedData,
      rawText: text,
    });
  } catch (error) {
    console.error('OCR processing error:', error);
    throw new AppError('Failed to process receipt image', 500);
  }
}));

// Helper function to parse receipt text and extract expense information
function parseReceiptText(text: string) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let amount = 0;
  let currency = 'USD';
  let category = 'Other';
  let description = '';
  let date = new Date().toISOString().split('T')[0];

  // Extract amount (look for patterns like $123.45, 123.45, etc.)
  const amountPatterns = [
    /\$?(\d+\.?\d*)/g,
    /(\d+\.?\d*)\s*USD/g,
    /(\d+\.?\d*)\s*EUR/g,
    /(\d+\.?\d*)\s*GBP/g,
  ];

  for (const pattern of amountPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      // Get the largest amount found (likely the total)
      const amounts = matches.map(match => {
        const num = parseFloat(match.replace(/[^\d.]/g, ''));
        return isNaN(num) ? 0 : num;
      });
      const maxAmount = Math.max(...amounts);
      if (maxAmount > amount) {
        amount = maxAmount;
      }
    }
  }

  // Extract currency
  if (text.includes('EUR') || text.includes('€')) {
    currency = 'EUR';
  } else if (text.includes('GBP') || text.includes('£')) {
    currency = 'GBP';
  } else if (text.includes('USD') || text.includes('$')) {
    currency = 'USD';
  }

  // Extract date (look for common date patterns)
  const datePatterns = [
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g,
    /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/g,
    /(\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{2,4})/gi,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        const parsedDate = new Date(match[0]);
        if (!isNaN(parsedDate.getTime())) {
          date = parsedDate.toISOString().split('T')[0];
          break;
        }
      } catch (e) {
        // Continue to next pattern
      }
    }
  }

  // Extract description (usually the first few lines or merchant name)
  const descriptionLines = lines.slice(0, 3).filter(line => 
    !line.match(/\d+\.?\d*/) && // Not just numbers
    line.length > 3 && // Not too short
    !line.toLowerCase().includes('total') &&
    !line.toLowerCase().includes('subtotal')
  );
  
  if (descriptionLines.length > 0) {
    description = descriptionLines[0];
  }

  // Categorize based on keywords
  const lowerText = text.toLowerCase();
  if (lowerText.includes('hotel') || lowerText.includes('accommodation') || lowerText.includes('travel')) {
    category = 'Travel';
  } else if (lowerText.includes('restaurant') || lowerText.includes('food') || lowerText.includes('meal')) {
    category = 'Meals';
  } else if (lowerText.includes('office') || lowerText.includes('supplies') || lowerText.includes('stationery')) {
    category = 'Office Supplies';
  } else if (lowerText.includes('equipment') || lowerText.includes('computer') || lowerText.includes('software')) {
    category = 'Equipment';
  }

  return {
    amount,
    currency,
    category,
    description,
    date,
  };
}

/**
 * @openapi
 * /api/expenses:
 *   post:
 *     tags:
 *       - Expenses
 *     summary: Submit a new expense
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employeeId
 *               - companyId
 *               - amount
 *               - originalCurrency
 *               - companyCurrencyAmount
 *               - category
 *               - date
 *             properties:
 *               employeeId:
 *                 type: string
 *                 format: uuid
 *               companyId:
 *                 type: string
 *                 format: uuid
 *               amount:
 *                 type: number
 *               originalCurrency:
 *                 type: string
 *                 example: EUR
 *               companyCurrencyAmount:
 *                 type: number
 *               category:
 *                 type: string
 *                 example: Travel
 *               description:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Expense submitted successfully
 *       400:
 *         description: Validation error
 */
router.post('/', asyncHandler(async (req, res) => {
  const data = createExpenseSchema.parse(req.body);

  const expense = await prisma.expense.create({
    data: {
      employeeId: data.employeeId,
      companyId: data.companyId,
      amount: data.amount,
      originalCurrency: data.originalCurrency,
      companyCurrencyAmount: data.companyCurrencyAmount,
      category: data.category,
      description: data.description,
      date: new Date(data.date),
      status: ExpenseStatus.Pending,
    },
    include: {
      employee: true,
      company: true,
    },
  });

  // Get the next approver (first step)
  try {
    const nextApprover = await getNextApprover(expense.id);
    res.status(201).json({
      expense,
      nextApprover,
    });
  } catch (error) {
    res.status(201).json({
      expense,
      nextApprover: null,
      warning: 'Expense created but approval flow not configured',
    });
  }
}));

/**
 * @openapi
 * /api/expenses:
 *   get:
 *     tags:
 *       - Expenses
 *     summary: Get all expenses (filter by company, employee, or status)
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, Approved, Rejected]
 *     responses:
 *       200:
 *         description: List of expenses
 */
router.get('/', asyncHandler(async (req, res) => {
  const { companyId, employeeId, status } = req.query;

  const expenses = await prisma.expense.findMany({
    where: {
      ...(companyId && { companyId: companyId as string }),
      ...(employeeId && { employeeId: employeeId as string }),
      ...(status && { status: status as ExpenseStatus }),
    },
    include: {
      employee: true,
      company: true,
      approvals: {
        include: {
          approver: true,
        },
        orderBy: { stepNumber: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(expenses);
}));

/**
 * @openapi
 * /api/expenses/{id}:
 *   get:
 *     tags:
 *       - Expenses
 *     summary: Get expense by ID with approval history
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Expense details with approval history
 *       404:
 *         description: Expense not found
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const expense = await prisma.expense.findUnique({
    where: { id: req.params.id },
    include: {
      employee: {
        include: {
          employeeAssignment: {
            include: {
              manager: true,
            },
          },
        },
      },
      company: true,
      approvals: {
        include: {
          approver: true,
        },
        orderBy: { stepNumber: 'asc' },
      },
    },
  });

  if (!expense) {
    throw new AppError('Expense not found', 404);
  }

  // Get next approver if still pending
  let nextApprover: any = null;
  if (expense.status === ExpenseStatus.Pending) {
    try {
      nextApprover = await getNextApprover(expense.id);
    } catch (error) {
      // Ignore if approval flow not configured
    }
  }

  res.json({
    ...expense,
    nextApprover,
  });
}));

/**
 * @openapi
 * /api/expenses/{id}/next-approver:
 *   get:
 *     tags:
 *       - Expenses
 *     summary: Get the next approver for an expense (core function)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Next approver details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stepNumber:
 *                   type: integer
 *                 approverRole:
 *                   type: string
 *                 approverId:
 *                   type: string
 *                 approverName:
 *                   type: string
 *                 approverEmail:
 *                   type: string
 *       404:
 *         description: Expense not found or no next approver
 */
router.get('/:id/next-approver', asyncHandler(async (req, res) => {
  const nextApprover = await getNextApprover(req.params.id);

  if (!nextApprover) {
    return res.json({
      message: 'No pending approvals - all steps completed or expense already decided',
      nextApprover: null,
    });
  }

  res.json(nextApprover);
}));

export default router;


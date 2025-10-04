import { Router } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { ExpenseStatus } from '@prisma/client';
import { getNextApprover } from '../services/approvalService';
import multer from 'multer';
import geminiService from '../services/geminiService';

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
  date: z.string().refine((val) => {
    // Accept both date (YYYY-MM-DD) and datetime formats
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const datetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    return dateRegex.test(val) || datetimeRegex.test(val) || !isNaN(Date.parse(val));
  }, "Invalid date format").transform((val) => {
    // Convert date string to datetime if needed
    if (val.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return new Date(val + 'T00:00:00.000Z').toISOString();
    }
    return val;
  }),
});

// AI-powered receipt parsing endpoint using Google Gemini
/**
 * @openapi
 * /api/expenses/ocr:
 *   post:
 *     tags:
 *       - Expenses
 *     summary: Extract expense data from receipt image using AI (Google Gemini)
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
 *         description: Extracted expense data with AI confidence score
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
 *                 merchant:
 *                   type: string
 *                 confidence:
 *                   type: number
 *                   description: AI confidence score (0-100)
 *                 rawText:
 *                   type: string
 *       400:
 *         description: Invalid image or AI processing failed
 *       500:
 *         description: Server error during AI processing
 */
router.post('/ocr', upload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('No image file provided', 400);
  }

  try {
    // Use Gemini AI to parse the receipt image
    const parsedData = await geminiService.parseReceiptImage(req.file.buffer);

    // Check if the AI was confident in its extraction
    if (parsedData.confidence < 30) {
      return res.status(200).json({
        ...parsedData,
        warning: 'Low confidence in data extraction. Please verify the information.',
      });
    }

    res.json(parsedData);
  } catch (error) {
    console.error('AI receipt parsing error:', error);
    throw new AppError('Failed to process receipt image with AI', 500);
  }
}));

// Additional endpoint for text-based receipt parsing (fallback)
/**
 * @openapi
 * /api/expenses/ocr-text:
 *   post:
 *     tags:
 *       - Expenses
 *     summary: Extract expense data from receipt text using AI
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 description: Raw text extracted from receipt
 *     responses:
 *       200:
 *         description: Extracted expense data from text
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
 *                 merchant:
 *                   type: string
 *                 confidence:
 *                   type: number
 *                 rawText:
 *                   type: string
 */
router.post('/ocr-text', asyncHandler(async (req, res) => {
  const { text } = req.body;
  
  if (!text || typeof text !== 'string') {
    throw new AppError('Text content is required', 400);
  }

  try {
    const parsedData = await geminiService.parseReceiptText(text);
    res.json(parsedData);
  } catch (error) {
    console.error('AI text parsing error:', error);
    throw new AppError('Failed to process receipt text with AI', 500);
  }
}));

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
  try {
    console.log('Received expense data:', req.body);
    const data = createExpenseSchema.parse(req.body);
    console.log('Parsed expense data:', data);

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
  } catch (error) {
    console.error('Expense creation error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
    throw error;
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


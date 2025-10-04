import { Router } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { ExpenseStatus } from '@prisma/client';
import { getNextApprover } from '../services/approvalService';

const router = Router();

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


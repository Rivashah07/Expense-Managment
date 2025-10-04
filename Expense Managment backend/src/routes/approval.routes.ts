import { Router } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { ApprovalRole } from '@prisma/client';
import { processApprovalDecision } from '../services/approvalService';

const router = Router();

const createFlowStepSchema = z.object({
  companyId: z.string().uuid(),
  stepNumber: z.number().int().positive(),
  approverRole: z.enum(['Manager', 'Finance', 'Director']),
  staticApproverId: z.string().uuid().optional(),
});

const approvalDecisionSchema = z.object({
  expenseId: z.string().uuid(),
  approverId: z.string().uuid(),
  decision: z.enum(['Approved', 'Rejected']),
  comments: z.string().optional(),
});

/**
 * @openapi
 * /api/approval-flow:
 *   post:
 *     tags:
 *       - Approval Flow
 *     summary: Create an approval flow step
 *     description: Define sequential approval steps (e.g., Step 1 Manager, Step 2 Finance, Step 3 Director)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyId
 *               - stepNumber
 *               - approverRole
 *             properties:
 *               companyId:
 *                 type: string
 *                 format: uuid
 *               stepNumber:
 *                 type: integer
 *                 example: 1
 *               approverRole:
 *                 type: string
 *                 enum: [Manager, Finance, Director]
 *               staticApproverId:
 *                 type: string
 *                 format: uuid
 *                 description: Required for Finance/Director roles, optional for Manager
 *     responses:
 *       201:
 *         description: Approval flow step created
 *       400:
 *         description: Validation error
 */
router.post('/', asyncHandler(async (req, res) => {
  const data = createFlowStepSchema.parse(req.body);

  // Validate that Finance/Director roles have a static approver
  if (
    (data.approverRole === 'Finance' || data.approverRole === 'Director') &&
    !data.staticApproverId
  ) {
    throw new AppError('Finance and Director roles require a staticApproverId', 400);
  }

  const flowStep = await prisma.approvalFlowStep.create({
    data: {
      companyId: data.companyId,
      stepNumber: data.stepNumber,
      approverRole: ApprovalRole[data.approverRole],
      staticApproverId: data.staticApproverId,
    },
    include: {
      staticApprover: true,
    },
  });

  res.status(201).json(flowStep);
}));

/**
 * @openapi
 * /api/approval-flow:
 *   get:
 *     tags:
 *       - Approval Flow
 *     summary: Get approval flow steps
 *     parameters:
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of approval flow steps
 */
router.get('/', asyncHandler(async (req, res) => {
  const { companyId } = req.query;

  if (!companyId) {
    throw new AppError('companyId query parameter is required', 400);
  }

  const flowSteps = await prisma.approvalFlowStep.findMany({
    where: { companyId: companyId as string },
    include: {
      staticApprover: true,
    },
    orderBy: { stepNumber: 'asc' },
  });

  res.json(flowSteps);
}));

/**
 * @openapi
 * /api/approval-flow/seed-default:
 *   post:
 *     tags:
 *       - Approval Flow
 *     summary: Seed default 3-step approval flow (Manager -> Finance -> Director)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyId
 *               - financeApproverId
 *               - directorApproverId
 *             properties:
 *               companyId:
 *                 type: string
 *                 format: uuid
 *               financeApproverId:
 *                 type: string
 *                 format: uuid
 *               directorApproverId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Default flow created
 */
router.post('/seed-default', asyncHandler(async (req, res) => {
  const { companyId, financeApproverId, directorApproverId } = req.body;

  if (!companyId || !financeApproverId || !directorApproverId) {
    throw new AppError('companyId, financeApproverId, and directorApproverId are required', 400);
  }

  // Delete existing flow steps for this company
  await prisma.approvalFlowStep.deleteMany({
    where: { companyId },
  });

  // Create 3-step flow
  const steps = await prisma.$transaction([
    prisma.approvalFlowStep.create({
      data: {
        companyId,
        stepNumber: 1,
        approverRole: ApprovalRole.Manager,
      },
    }),
    prisma.approvalFlowStep.create({
      data: {
        companyId,
        stepNumber: 2,
        approverRole: ApprovalRole.Finance,
        staticApproverId: financeApproverId,
      },
    }),
    prisma.approvalFlowStep.create({
      data: {
        companyId,
        stepNumber: 3,
        approverRole: ApprovalRole.Director,
        staticApproverId: directorApproverId,
      },
    }),
  ]);

  res.status(201).json({
    message: 'Default 3-step approval flow created',
    steps,
  });
}));

/**
 * @openapi
 * /api/approval-flow/approve:
 *   post:
 *     tags:
 *       - Approval Flow
 *     summary: Approve or reject an expense (Manager/Finance/Director)
 *     description: |
 *       Process approval/rejection with conditional rules:
 *       - If amount > $500 OR approver role is Finance, fast-track to next step immediately
 *       - Otherwise, follow sequential flow
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - expenseId
 *               - approverId
 *               - decision
 *             properties:
 *               expenseId:
 *                 type: string
 *                 format: uuid
 *               approverId:
 *                 type: string
 *                 format: uuid
 *               decision:
 *                 type: string
 *                 enum: [Approved, Rejected]
 *               comments:
 *                 type: string
 *     responses:
 *       200:
 *         description: Approval decision recorded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 approval:
 *                   $ref: '#/components/schemas/ExpenseApproval'
 *                 expenseStatus:
 *                   type: string
 *                 fastTracked:
 *                   type: boolean
 *       400:
 *         description: Validation error
 *       403:
 *         description: Not authorized to approve at this step
 */
router.post('/approve', asyncHandler(async (req, res) => {
  const data = approvalDecisionSchema.parse(req.body);

  const result = await processApprovalDecision(
    data.expenseId,
    data.approverId,
    data.decision,
    data.comments
  );

  res.json(result);
}));

/**
 * @openapi
 * /api/approval-flow/pending:
 *   get:
 *     tags:
 *       - Approval Flow
 *     summary: Get pending approvals for an approver
 *     parameters:
 *       - in: query
 *         name: approverId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of expenses pending approval
 */
router.get('/pending', asyncHandler(async (req, res) => {
  const { approverId } = req.query;

  if (!approverId) {
    throw new AppError('approverId query parameter is required', 400);
  }

  // Get all pending expense approvals for this approver
  const pendingApprovals = await prisma.expenseApproval.findMany({
    where: {
      approverId: approverId as string,
      status: 'Pending',
    },
    include: {
      expense: {
        include: {
          employee: true,
          company: true,
        },
      },
      approver: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(pendingApprovals);
}));

/**
 * @openapi
 * /api/approval-flow/history:
 *   get:
 *     tags:
 *       - Approval Flow
 *     summary: Get approval history for an expense
 *     parameters:
 *       - in: query
 *         name: expenseId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Approval history
 */
router.get('/history', asyncHandler(async (req, res) => {
  const { expenseId } = req.query;

  if (!expenseId) {
    throw new AppError('expenseId query parameter is required', 400);
  }

  const approvals = await prisma.expenseApproval.findMany({
    where: { expenseId: expenseId as string },
    include: {
      approver: true,
    },
    orderBy: { stepNumber: 'asc' },
  });

  res.json(approvals);
}));

export default router;


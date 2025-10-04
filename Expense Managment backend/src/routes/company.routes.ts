import { Router } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { asyncHandler, AppError } from '../middleware/errorHandler';

const router = Router();

const createCompanySchema = z.object({
  name: z.string().min(1),
  defaultCurrency: z.string().length(3).toUpperCase(),
});

/**
 * @openapi
 * /api/companies:
 *   post:
 *     tags:
 *       - Companies
 *     summary: Create a new company
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - defaultCurrency
 *             properties:
 *               name:
 *                 type: string
 *               defaultCurrency:
 *                 type: string
 *                 example: USD
 *     responses:
 *       201:
 *         description: Company created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Company'
 *       400:
 *         description: Validation error
 */
router.post('/', asyncHandler(async (req, res) => {
  const data = createCompanySchema.parse(req.body);
  
  const company = await prisma.company.create({
    data,
  });

  res.status(201).json(company);
}));

/**
 * @openapi
 * /api/companies:
 *   get:
 *     tags:
 *       - Companies
 *     summary: Get all companies
 *     responses:
 *       200:
 *         description: List of companies
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Company'
 */
router.get('/', asyncHandler(async (req, res) => {
  const companies = await prisma.company.findMany({
    include: {
      _count: {
        select: { users: true, expenses: true },
      },
    },
  });

  res.json(companies);
}));

/**
 * @openapi
 * /api/companies/{id}:
 *   get:
 *     tags:
 *       - Companies
 *     summary: Get company by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Company details
 *       404:
 *         description: Company not found
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const company = await prisma.company.findUnique({
    where: { id: req.params.id },
    include: {
      users: true,
      approvalFlow: true,
    },
  });

  if (!company) {
    throw new AppError('Company not found', 404);
  }

  res.json(company);
}));

export default router;


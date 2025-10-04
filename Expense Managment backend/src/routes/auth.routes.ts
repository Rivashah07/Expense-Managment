import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { generateToken } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(['Admin', 'Manager', 'Employee']),
  companyId: z.string().uuid(),
});

const signinSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

/**
 * @openapi
 * /api/auth/signup:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *               - role
 *               - companyId
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               name:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [Admin, Manager, Employee]
 *               companyId:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 */
router.post('/signup', asyncHandler(async (req, res) => {
  const data = signupSchema.parse(req.body);

  // Check if user exists
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    throw new AppError('Email already registered', 409);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(data.password, 10);

  // Create user
  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      name: data.name,
      role: UserRole[data.role],
      companyId: data.companyId,
    },
    include: {
      company: true,
    },
  });

  // Generate token
  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
  });

  res.status(201).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      company: user.company,
    },
  });
}));

/**
 * @openapi
 * /api/auth/signin:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Sign in a user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Signed in successfully
 */
router.post('/signin', asyncHandler(async (req, res) => {
  const data = signinSchema.parse(req.body);

  // Find user
  const user = await prisma.user.findUnique({
    where: { email: data.email },
    include: {
      company: true,
    },
  });

  if (!user || !user.password) {
    throw new AppError('Invalid credentials', 401);
  }

  // Verify password
  const valid = await bcrypt.compare(data.password, user.password);

  if (!valid) {
    throw new AppError('Invalid credentials', 401);
  }

  // Generate token
  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
  });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      company: user.company,
    },
  });
}));

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Get current user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user details
 */
router.get('/me', asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    throw new AppError('Authentication required', 401);
  }

  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
  const jwt = require('jsonwebtoken');
  const decoded = jwt.verify(token, JWT_SECRET) as any;

  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    include: {
      company: true,
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    company: user.company,
  });
}));

export default router;


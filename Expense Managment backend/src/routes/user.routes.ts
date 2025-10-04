import { Router } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const router = Router();

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['Admin', 'Manager', 'Employee']),
  companyId: z.string().uuid(),
  password: z.string().min(6),
});

const assignManagerSchema = z.object({
  employeeId: z.string().uuid(),
  managerId: z.string().uuid(),
  companyId: z.string().uuid(),
});

/**
 * @openapi
 * /api/users:
 *   post:
 *     tags:
 *       - Users
 *     summary: Create a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - name
 *               - role
 *               - companyId
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               name:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [Admin, Manager, Employee]
 *               companyId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation error
 */
router.post('/', asyncHandler(async (req, res) => {
  const data = createUserSchema.parse(req.body);

  const hashedPassword = await bcrypt.hash(data.password, 10);

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

  res.status(201).json(user);
}));

/**
 * @openapi
 * /api/users:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get all users (optionally filter by company)
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of users
 */
router.get('/', asyncHandler(async (req, res) => {
  const { companyId } = req.query;

  const users = await prisma.user.findMany({
    where: companyId ? { companyId: companyId as string } : undefined,
    include: {
      company: true,
      employeeAssignment: {
        include: {
          manager: true,
        },
      },
    },
  });

  res.json(users);
}));

/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get user by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details
 *       404:
 *         description: User not found
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: {
      company: true,
      employeeAssignment: {
        include: {
          manager: true,
        },
      },
      managedEmployees: {
        include: {
          employee: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json(user);
}));

/**
 * @openapi
 * /api/users/manager-assignments:
 *   post:
 *     tags:
 *       - Users
 *     summary: Assign a manager to an employee
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employeeId
 *               - managerId
 *               - companyId
 *             properties:
 *               employeeId:
 *                 type: string
 *                 format: uuid
 *               managerId:
 *                 type: string
 *                 format: uuid
 *               companyId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Manager assigned successfully
 *       400:
 *         description: Validation error
 */
router.post('/manager-assignments', asyncHandler(async (req, res) => {
  const data = assignManagerSchema.parse(req.body);

  // Verify employee and manager exist
  const [employee, manager] = await Promise.all([
    prisma.user.findUnique({ where: { id: data.employeeId } }),
    prisma.user.findUnique({ where: { id: data.managerId } }),
  ]);

  if (!employee || !manager) {
    throw new AppError('Employee or Manager not found', 404);
  }

  if (manager.role !== UserRole.Manager && manager.role !== UserRole.Admin) {
    throw new AppError('Manager must have Manager or Admin role', 400);
  }

  const assignment = await prisma.managerAssignment.create({
    data,
    include: {
      employee: true,
      manager: true,
    },
  });

  res.status(201).json(assignment);
}));

/**
 * @openapi
 * /api/users/manager-assignments:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get all manager assignments
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of manager assignments
 */
router.get('/manager-assignments', asyncHandler(async (req, res) => {
  const { companyId } = req.query;

  const assignments = await prisma.managerAssignment.findMany({
    where: companyId ? { companyId: companyId as string } : undefined,
    include: {
      employee: true,
      manager: true,
    },
  });

  res.json(assignments);
}));

/**
 * @openapi
 * /api/users/{id}:
 *   put:
 *     tags:
 *       - Users
 *     summary: Update a user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               name:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [Admin, Manager, Employee]
 *               managerId:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated successfully
 *       404:
 *         description: User not found
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { email, name, role, managerId, password } = req.body;

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { id },
  });

  if (!existingUser) {
    throw new AppError('User not found', 404);
  }

  // Update user
  const updateData: any = {};
  if (email) updateData.email = email;
  if (name) updateData.name = name;
  if (role) updateData.role = UserRole[role as keyof typeof UserRole];
  if (password) updateData.password = await bcrypt.hash(password, 10);

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    include: {
      company: true,
      employeeAssignment: {
        include: {
          manager: true,
        },
      },
    },
  });

  // Handle manager assignment
  if (managerId !== undefined) {
    if (managerId === '' || managerId === null) {
      // Remove manager assignment
      await prisma.managerAssignment.deleteMany({
        where: { employeeId: id },
      });
    } else {
      // Check if assignment already exists for this employee
      const existingAssignment = await prisma.managerAssignment.findFirst({
        where: {
          employeeId: id,
          managerId: managerId,
        },
      });

      if (!existingAssignment) {
        // Delete old assignment and create new one
        await prisma.managerAssignment.deleteMany({
          where: { employeeId: id },
        });

        await prisma.managerAssignment.create({
          data: {
            employeeId: id,
            managerId: managerId,
            companyId: existingUser.companyId,
          },
        });
      }
    }
  }

  // Fetch updated user with relations
  const updatedUser = await prisma.user.findUnique({
    where: { id },
    include: {
      company: true,
      employeeAssignment: {
        include: {
          manager: true,
        },
      },
    },
  });

  res.json(updatedUser);
}));

/**
 * @openapi
 * /api/users/{id}:
 *   delete:
 *     tags:
 *       - Users
 *     summary: Delete a user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Delete related manager assignments first
  await prisma.managerAssignment.deleteMany({
    where: {
      OR: [
        { employeeId: id },
        { managerId: id },
      ],
    },
  });

  // Delete the user
  await prisma.user.delete({
    where: { id },
  });

  res.json({ message: 'User deleted successfully', id });
}));

export default router;


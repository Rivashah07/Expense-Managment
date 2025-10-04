import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ApprovalRole, ExpenseStatus } from '@prisma/client';

/**
 * Core function: Get the next approver for an expense based on approval flow
 * Returns the next approver details or null if all steps are complete
 */
export const getNextApprover = async (expenseId: string) => {
  // Get the expense with all approval records
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: {
      approvals: {
        orderBy: { stepNumber: 'asc' },
      },
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
    },
  });

  if (!expense) {
    throw new AppError('Expense not found', 404);
  }

  // Get all approval flow steps for the company
  const flowSteps = await prisma.approvalFlowStep.findMany({
    where: { companyId: expense.companyId },
    orderBy: { stepNumber: 'asc' },
    include: {
      staticApprover: true,
    },
  });

  if (flowSteps.length === 0) {
    throw new AppError('No approval flow defined for this company', 400);
  }

  // Find the current step (first pending or no existing approval)
  let currentStepNumber = 1;
  
  for (const approval of expense.approvals) {
    if (approval.status === ExpenseStatus.Pending) {
      // There's already a pending approval at this step
      currentStepNumber = approval.stepNumber;
      break;
    } else if (approval.status === ExpenseStatus.Rejected) {
      // Expense was rejected - no next approver
      return null;
    } else if (approval.status === ExpenseStatus.Approved) {
      // Move to next step
      currentStepNumber = approval.stepNumber + 1;
    }
  }

  // Check if we've completed all steps
  if (currentStepNumber > flowSteps.length) {
    return null; // All approvals complete
  }

  // Get the current flow step
  const currentFlowStep = flowSteps.find((s) => s.stepNumber === currentStepNumber);
  
  if (!currentFlowStep) {
    throw new AppError(`Approval flow step ${currentStepNumber} not found`, 400);
  }

  // Determine the approver based on role
  let approverId: string;
  
  if (currentFlowStep.approverRole === ApprovalRole.Manager) {
    // For Manager role, get the employee's assigned manager
    if (!expense.employee.employeeAssignment) {
      throw new AppError('Employee has no assigned manager', 400);
    }
    approverId = expense.employee.employeeAssignment.managerId;
  } else if (currentFlowStep.staticApproverId) {
    // Use static approver (for Finance/Director roles)
    approverId = currentFlowStep.staticApproverId;
  } else {
    throw new AppError(`No approver found for step ${currentStepNumber}`, 400);
  }

  // Get the approver user details
  const approver = await prisma.user.findUnique({
    where: { id: approverId },
  });

  if (!approver) {
    throw new AppError('Approver user not found', 404);
  }

  return {
    stepNumber: currentStepNumber,
    approverRole: currentFlowStep.approverRole,
    approverId: approver.id,
    approverName: approver.name,
    approverEmail: approver.email,
  };
};

/**
 * Process approval/rejection with conditional rules
 * Conditional Rule: If amount > $500 OR approver role is Finance, move to next step immediately
 */
export const processApprovalDecision = async (
  expenseId: string,
  approverId: string,
  decision: 'Approved' | 'Rejected',
  comments?: string
) => {
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: {
      approvals: {
        orderBy: { stepNumber: 'asc' },
      },
    },
  });

  if (!expense) {
    throw new AppError('Expense not found', 404);
  }

  // Get the next approver info to determine current step
  const nextApproverInfo = await getNextApprover(expenseId);
  
  if (!nextApproverInfo) {
    throw new AppError('No pending approval for this expense', 400);
  }

  // Verify this is the correct approver
  if (nextApproverInfo.approverId !== approverId) {
    throw new AppError('You are not authorized to approve this expense at this step', 403);
  }

  const currentStepNumber = nextApproverInfo.stepNumber;
  const approverRole = nextApproverInfo.approverRole;

  // Create or update the approval record
  const approval = await prisma.expenseApproval.upsert({
    where: {
      expenseId_stepNumber: {
        expenseId,
        stepNumber: currentStepNumber,
      },
    },
    update: {
      status: decision === 'Approved' ? ExpenseStatus.Approved : ExpenseStatus.Rejected,
      comments,
      decidedAt: new Date(),
    },
    create: {
      expenseId,
      stepNumber: currentStepNumber,
      approverId,
      approverRole,
      status: decision === 'Approved' ? ExpenseStatus.Approved : ExpenseStatus.Rejected,
      comments,
      decidedAt: new Date(),
    },
  });

  // If rejected, update expense status to Rejected
  if (decision === 'Rejected') {
    await prisma.expense.update({
      where: { id: expenseId },
      data: { status: ExpenseStatus.Rejected },
    });

    return {
      message: 'Expense rejected',
      approval,
      expenseStatus: ExpenseStatus.Rejected,
    };
  }

  // CONDITIONAL RULE: Check if we should fast-track
  // Rule: If amount > $500 OR approverRole is Finance, move to next step immediately
  const THRESHOLD_AMOUNT = 500;
  const shouldFastTrack = 
    expense.companyCurrencyAmount.toNumber() > THRESHOLD_AMOUNT ||
    approverRole === ApprovalRole.Finance;

  let expenseStatus = expense.status;

  if (shouldFastTrack) {
    // Check if there are more steps
    const totalSteps = await prisma.approvalFlowStep.count({
      where: { companyId: expense.companyId },
    });

    if (currentStepNumber >= totalSteps) {
      // This was the last step - mark expense as approved
      await prisma.expense.update({
        where: { id: expenseId },
        data: { status: ExpenseStatus.Approved },
      });
      expenseStatus = ExpenseStatus.Approved;
    }
  } else {
    // Normal flow - check if all approvals are complete
    const allApprovals = await prisma.expenseApproval.findMany({
      where: { expenseId },
    });

    const flowSteps = await prisma.approvalFlowStep.findMany({
      where: { companyId: expense.companyId },
    });

    const allApproved = allApprovals.length === flowSteps.length &&
      allApprovals.every((a) => a.status === ExpenseStatus.Approved);

    if (allApproved) {
      await prisma.expense.update({
        where: { id: expenseId },
        data: { status: ExpenseStatus.Approved },
      });
      expenseStatus = ExpenseStatus.Approved;
    }
  }

  return {
    message: 'Approval recorded successfully',
    approval,
    expenseStatus,
    fastTracked: shouldFastTrack,
  };
};


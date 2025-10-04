import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Expense Management API',
      version: '1.0.0',
      description: 'Multi-role expense management system with sequential approval workflow',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      schemas: {
        Company: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            defaultCurrency: { type: 'string', example: 'USD' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['Admin', 'Manager', 'Employee'] },
            companyId: { type: 'string', format: 'uuid' },
          },
        },
        Expense: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            amount: { type: 'number' },
            originalCurrency: { type: 'string' },
            companyCurrencyAmount: { type: 'number' },
            category: { type: 'string' },
            description: { type: 'string' },
            date: { type: 'string', format: 'date-time' },
            status: { type: 'string', enum: ['Pending', 'Approved', 'Rejected'] },
            employeeId: { type: 'string', format: 'uuid' },
          },
        },
        ApprovalFlowStep: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            companyId: { type: 'string', format: 'uuid' },
            stepNumber: { type: 'integer' },
            approverRole: { type: 'string', enum: ['Manager', 'Finance', 'Director'] },
            staticApproverId: { type: 'string', format: 'uuid', nullable: true },
          },
        },
        ExpenseApproval: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            expenseId: { type: 'string', format: 'uuid' },
            stepNumber: { type: 'integer' },
            approverId: { type: 'string', format: 'uuid' },
            approverRole: { type: 'string', enum: ['Manager', 'Finance', 'Director'] },
            status: { type: 'string', enum: ['Pending', 'Approved', 'Rejected'] },
            comments: { type: 'string', nullable: true },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: { type: 'string' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);


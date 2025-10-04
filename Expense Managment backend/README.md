# Expense Management System - Backend API

A multi-role (Admin, Manager, Employee) expense management system with sequential approval workflow, conditional rules, and PostgreSQL database.

## Features

- **Multi-Role User Management**: Admin, Manager, and Employee roles
- **Company Setup**: Multi-tenant with default currency support
- **Expense Submission**: Track expenses with currency conversion
- **Sequential Approval Workflow**: Configurable multi-step approval flow
- **Conditional Rules**: Smart approval routing based on amount thresholds and roles
- **Manager Assignments**: Employee-to-Manager relationship management
- **Complete API Documentation**: Swagger/OpenAPI specs

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Validation**: Zod
- **AI/OCR**: Google Gemini API for intelligent receipt parsing
- **Documentation**: Swagger (swagger-jsdoc + swagger-ui-express)

## Installation

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+

### Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Create a `.env` file with the following variables:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/expense_management?schema=public"
   JWT_SECRET="your-super-secret-jwt-key-here"
   JWT_EXPIRES_IN="7d"
   GEMINI_API_KEY="your-google-gemini-api-key-here"
   PORT=3000
   NODE_ENV="development"
   ```

   **Note**: You need to obtain a Google Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey) for AI-powered receipt parsing.

3. **Run migrations**:
   ```bash
   npx prisma migrate dev --name init
   ```

4. **Generate Prisma Client**:
   ```bash
   npx prisma generate
   ```

5. **Start the server**:
   ```bash
   npm run dev
   ```

The server will start at `http://localhost:3000`

## API Documentation

Once the server is running, visit:

- **Swagger UI**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/health

## Database Schema

### Core Models

1. **Company**: Multi-tenant support with default currency
2. **User**: Users with roles (Admin/Manager/Employee)
3. **ManagerAssignment**: Employee-to-Manager relationships
4. **Expense**: Expense records with multi-currency support
5. **ApprovalFlowStep**: Sequential approval flow configuration
6. **ExpenseApproval**: Tracks approval state for each step

### Enums

- **UserRole**: `Admin`, `Manager`, `Employee`
- **ApprovalRole**: `Manager`, `Finance`, `Director`
- **ExpenseStatus**: `Pending`, `Approved`, `Rejected`

## API Endpoints

### Companies
- `POST /api/companies` - Create a company
- `GET /api/companies` - List all companies
- `GET /api/companies/:id` - Get company details

### Users
- `POST /api/users` - Create a user
- `GET /api/users` - List users (filter by company)
- `GET /api/users/:id` - Get user details
- `POST /api/users/manager-assignments` - Assign manager to employee
- `GET /api/users/manager-assignments` - List manager assignments

### Expenses
- `POST /api/expenses` - Submit an expense
- `GET /api/expenses` - List expenses (filter by company/employee/status)
- `GET /api/expenses/:id` - Get expense with approval history
- `GET /api/expenses/:id/next-approver` - **Get next approver (core function)**
- `POST /api/expenses/ocr` - **AI-powered receipt parsing with Google Gemini**
- `POST /api/expenses/ocr-text` - **AI-powered text-based receipt parsing**

### Approval Flow
- `POST /api/approval-flow` - Create approval flow step
- `GET /api/approval-flow` - Get approval flow for a company
- `POST /api/approval-flow/seed-default` - Create default 3-step flow
- `POST /api/approval-flow/approve` - **Approve/reject expense (with conditional rules)**
- `GET /api/approval-flow/pending` - Get pending approvals for an approver
- `GET /api/approval-flow/history` - Get approval history for an expense

## Core Features

### 1. Sequential Approval Workflow

Expenses follow a configurable sequential approval flow:
- **Step 1**: Manager approval (employee's assigned manager)
- **Step 2**: Finance approval (static approver)
- **Step 3**: Director approval (static approver)

**Implementation**: See `getNextApprover()` in `src/services/approvalService.ts`

### 2. Conditional Approval Rules

After a manager approves, the system checks:
- **IF** amount > $500 **OR** approver role is Finance
- **THEN** fast-track to next step immediately
- **ELSE** follow normal sequential flow

**Implementation**: See `processApprovalDecision()` in `src/services/approvalService.ts`

### 3. Manager Assignment

Employees must be assigned to a manager for the approval workflow to function. Use the manager assignment endpoint to establish these relationships.

## Example Usage Flow

### 1. Setup Company and Users

```bash
# Create a company
curl -X POST http://localhost:3000/api/companies \
  -H "Content-Type: application/json" \
  -d '{"name": "Acme Corp", "defaultCurrency": "USD"}'

# Create users (Admin, Manager, Employees, Finance, Director)
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "manager@acme.com",
    "name": "John Manager",
    "role": "Manager",
    "companyId": "<company_id>"
  }'

# Assign employee to manager
curl -X POST http://localhost:3000/api/users/manager-assignments \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "<employee_id>",
    "managerId": "<manager_id>",
    "companyId": "<company_id>"
  }'
```

### 2. Setup Approval Flow

```bash
# Seed default 3-step flow
curl -X POST http://localhost:3000/api/approval-flow/seed-default \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "<company_id>",
    "financeApproverId": "<finance_user_id>",
    "directorApproverId": "<director_user_id>"
  }'
```

### 3. Submit and Approve Expense

```bash
# Employee submits expense
curl -X POST http://localhost:3000/api/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "<employee_id>",
    "companyId": "<company_id>",
    "amount": 750,
    "originalCurrency": "USD",
    "companyCurrencyAmount": 750,
    "category": "Travel",
    "description": "Conference trip",
    "date": "2025-10-04T10:00:00Z"
  }'

# Get next approver
curl http://localhost:3000/api/expenses/<expense_id>/next-approver

# Manager approves (amount > $500 triggers fast-track)
curl -X POST http://localhost:3000/api/approval-flow/approve \
  -H "Content-Type: application/json" \
  -d '{
    "expenseId": "<expense_id>",
    "approverId": "<manager_id>",
    "decision": "Approved",
    "comments": "Approved for business travel"
  }'
```

## Development

### Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Run production build
- `npx prisma studio` - Open Prisma Studio (database GUI)
- `npx prisma migrate dev` - Create and apply migrations

### Database Management

```bash
# Reset database
npx prisma migrate reset

# View database in GUI
npx prisma studio
```

## Error Handling

The API uses robust error handling with:
- **400**: Validation errors (Zod)
- **403**: Authorization errors
- **404**: Resource not found
- **409**: Unique constraint violations
- **500**: Server errors

All errors return JSON with `error` and optional `details` fields.

## Architecture Highlights

- **Clean separation**: Routes → Services → Database
- **Type safety**: Full TypeScript with Prisma types
- **Validation**: Zod schemas for all inputs
- **Documentation**: OpenAPI/Swagger specs on all endpoints
- **Error handling**: Centralized error middleware
- **Async handling**: Consistent async/await patterns

## License

ISC


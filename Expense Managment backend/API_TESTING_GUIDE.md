# API Testing Guide

This guide provides step-by-step instructions to test the Expense Management System API using curl or any REST client.

## Prerequisites

1. **Setup database**: Update `.env` with your PostgreSQL credentials
2. **Run migrations**: `npx prisma migrate dev --name init`
3. **Generate Prisma Client**: `npx prisma generate`
4. **Seed database** (optional): `npm run seed`
5. **Start server**: `npm run dev`

Server runs at: `http://localhost:3000`

## Testing Workflow

### Step 1: Create a Company

```bash
curl -X POST http://localhost:3000/api/companies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tech Innovations Inc",
    "defaultCurrency": "USD"
  }'
```

**Save the returned `id` as `COMPANY_ID`**

### Step 2: Create Users

#### Create Admin
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@tech.com",
    "name": "Admin User",
    "role": "Admin",
    "companyId": "COMPANY_ID"
  }'
```

#### Create Manager
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "manager@tech.com",
    "name": "John Manager",
    "role": "Manager",
    "companyId": "COMPANY_ID"
  }'
```
**Save the returned `id` as `MANAGER_ID`**

#### Create Employee
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "employee@tech.com",
    "name": "Jane Employee",
    "role": "Employee",
    "companyId": "COMPANY_ID"
  }'
```
**Save the returned `id` as `EMPLOYEE_ID`**

#### Create Finance User
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "finance@tech.com",
    "name": "Finance Manager",
    "role": "Manager",
    "companyId": "COMPANY_ID"
  }'
```
**Save the returned `id` as `FINANCE_ID`**

#### Create Director
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "director@tech.com",
    "name": "Director CEO",
    "role": "Admin",
    "companyId": "COMPANY_ID"
  }'
```
**Save the returned `id` as `DIRECTOR_ID`**

### Step 3: Assign Employee to Manager

```bash
curl -X POST http://localhost:3000/api/users/manager-assignments \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "EMPLOYEE_ID",
    "managerId": "MANAGER_ID",
    "companyId": "COMPANY_ID"
  }'
```

### Step 4: Setup Approval Flow (3-Step)

```bash
curl -X POST http://localhost:3000/api/approval-flow/seed-default \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "COMPANY_ID",
    "financeApproverId": "FINANCE_ID",
    "directorApproverId": "DIRECTOR_ID"
  }'
```

This creates:
- **Step 1**: Manager (dynamic - uses employee's assigned manager)
- **Step 2**: Finance (static approver)
- **Step 3**: Director (static approver)

### Step 5: Submit Expenses

#### Test Expense #1: Amount < $500 (Normal Flow)

```bash
curl -X POST http://localhost:3000/api/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "EMPLOYEE_ID",
    "companyId": "COMPANY_ID",
    "amount": 250,
    "originalCurrency": "USD",
    "companyCurrencyAmount": 250,
    "category": "Office Supplies",
    "description": "Keyboard and mouse",
    "date": "2025-10-04T10:00:00Z"
  }'
```
**Save the returned `expense.id` as `EXPENSE1_ID`**

#### Test Expense #2: Amount > $500 (Fast-Track)

```bash
curl -X POST http://localhost:3000/api/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "EMPLOYEE_ID",
    "companyId": "COMPANY_ID",
    "amount": 850,
    "originalCurrency": "USD",
    "companyCurrencyAmount": 850,
    "category": "Travel",
    "description": "Conference tickets and hotel",
    "date": "2025-10-05T10:00:00Z"
  }'
```
**Save the returned `expense.id` as `EXPENSE2_ID`**

### Step 6: Check Next Approver

#### For Expense 1 (< $500)
```bash
curl http://localhost:3000/api/expenses/EXPENSE1_ID/next-approver
```

**Expected**: Manager should be the next approver (Step 1)

#### For Expense 2 (> $500)
```bash
curl http://localhost:3000/api/expenses/EXPENSE2_ID/next-approver
```

**Expected**: Manager should be the next approver (Step 1)

### Step 7: Manager Approves Expenses

#### Approve Expense 1 (< $500 - Normal Flow)

```bash
curl -X POST http://localhost:3000/api/approval-flow/approve \
  -H "Content-Type: application/json" \
  -d '{
    "expenseId": "EXPENSE1_ID",
    "approverId": "MANAGER_ID",
    "decision": "Approved",
    "comments": "Approved for office supplies"
  }'
```

**Expected Response**:
- `fastTracked: false` (amount ≤ $500)
- Status remains `Pending` (needs Finance approval next)

#### Approve Expense 2 (> $500 - Fast-Track)

```bash
curl -X POST http://localhost:3000/api/approval-flow/approve \
  -H "Content-Type: application/json" \
  -d '{
    "expenseId": "EXPENSE2_ID",
    "approverId": "MANAGER_ID",
    "decision": "Approved",
    "comments": "Approved for business travel"
  }'
```

**Expected Response**:
- `fastTracked: true` (amount > $500 triggers conditional rule)
- Status moves to next step immediately

### Step 8: Check Next Approver After Manager Approval

#### For Expense 1
```bash
curl http://localhost:3000/api/expenses/EXPENSE1_ID/next-approver
```

**Expected**: Finance should be next approver (Step 2)

#### For Expense 2
```bash
curl http://localhost:3000/api/expenses/EXPENSE2_ID/next-approver
```

**Expected**: Finance should be next approver (Step 2) - fast-tracked

### Step 9: Finance Approves

#### Finance Approves Expense 1

```bash
curl -X POST http://localhost:3000/api/approval-flow/approve \
  -H "Content-Type: application/json" \
  -d '{
    "expenseId": "EXPENSE1_ID",
    "approverId": "FINANCE_ID",
    "decision": "Approved",
    "comments": "Finance approved"
  }'
```

**Expected Response**:
- `fastTracked: true` (Finance role triggers fast-track rule)

#### Finance Approves Expense 2

```bash
curl -X POST http://localhost:3000/api/approval-flow/approve \
  -H "Content-Type: application/json" \
  -d '{
    "expenseId": "EXPENSE2_ID",
    "approverId": "FINANCE_ID",
    "decision": "Approved",
    "comments": "Finance approved - high value expense"
  }'
```

**Expected Response**:
- `fastTracked: true` (Finance role triggers fast-track)

### Step 10: Director Final Approval

#### Director Approves Expense 1

```bash
curl -X POST http://localhost:3000/api/approval-flow/approve \
  -H "Content-Type: application/json" \
  -d '{
    "expenseId": "EXPENSE1_ID",
    "approverId": "DIRECTOR_ID",
    "decision": "Approved",
    "comments": "Final approval granted"
  }'
```

**Expected**: Expense status becomes `Approved`

### Step 11: Verify Final Status

```bash
curl http://localhost:3000/api/expenses/EXPENSE1_ID
```

**Expected**: `status: "Approved"`, `nextApprover: null`

### Step 12: View Approval History

```bash
curl "http://localhost:3000/api/approval-flow/history?expenseId=EXPENSE1_ID"
```

**Expected**: Array of 3 approvals with details for each step

### Step 13: Get Pending Approvals for a User

```bash
curl "http://localhost:3000/api/approval-flow/pending?approverId=MANAGER_ID"
```

**Expected**: List of all expenses pending the manager's approval

### Step 14: Test Rejection Flow

#### Submit a new expense
```bash
curl -X POST http://localhost:3000/api/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "EMPLOYEE_ID",
    "companyId": "COMPANY_ID",
    "amount": 300,
    "originalCurrency": "USD",
    "companyCurrencyAmount": 300,
    "category": "Entertainment",
    "description": "Team dinner",
    "date": "2025-10-06T10:00:00Z"
  }'
```
**Save the returned `expense.id` as `EXPENSE3_ID`**

#### Manager rejects the expense
```bash
curl -X POST http://localhost:3000/api/approval-flow/approve \
  -H "Content-Type: application/json" \
  -d '{
    "expenseId": "EXPENSE3_ID",
    "approverId": "MANAGER_ID",
    "decision": "Rejected",
    "comments": "Not a business expense"
  }'
```

**Expected**: Expense status becomes `Rejected`, no further approvals needed

## Testing Summary

### Conditional Rules Tested

1. ✅ **Amount > $500**: Expense 2 ($850) triggered fast-track
2. ✅ **Finance Role**: Finance approvals trigger fast-track
3. ✅ **Normal Flow**: Expense 1 ($250) follows sequential approval

### Core Features Tested

- ✅ Company and User setup
- ✅ Manager-Employee assignments
- ✅ Approval flow configuration
- ✅ Expense submission
- ✅ `getNextApprover()` function
- ✅ Sequential approval workflow
- ✅ Conditional fast-track rules
- ✅ Approval/Rejection logic
- ✅ Approval history tracking

## Additional Tests

### List All Expenses for a Company
```bash
curl "http://localhost:3000/api/expenses?companyId=COMPANY_ID"
```

### Filter Expenses by Status
```bash
curl "http://localhost:3000/api/expenses?status=Approved"
curl "http://localhost:3000/api/expenses?status=Pending"
curl "http://localhost:3000/api/expenses?status=Rejected"
```

### Get All Users in a Company
```bash
curl "http://localhost:3000/api/users?companyId=COMPANY_ID"
```

### View Approval Flow
```bash
curl "http://localhost:3000/api/approval-flow?companyId=COMPANY_ID"
```

## Swagger Documentation

For interactive testing, visit:
```
http://localhost:3000/api-docs
```

The Swagger UI provides:
- Complete API documentation
- Interactive request/response testing
- Schema definitions
- Error response examples


# Architecture Documentation

## Overview

This is a **Node.js/Express + TypeScript** backend API for a multi-role expense management system with PostgreSQL and Prisma ORM.

## Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Runtime | Node.js 18+ | JavaScript runtime |
| Language | TypeScript | Type safety |
| Framework | Express.js | Web server framework |
| Database | PostgreSQL | Relational database |
| ORM | Prisma | Database access and migrations |
| Validation | Zod | Request validation |
| Documentation | Swagger (OpenAPI 3.0) | API documentation |

## Project Structure

```
Expense Managment/
├── prisma/
│   ├── schema.prisma          # Database schema definition
│   └── seed.ts                # Database seeding script
├── src/
│   ├── config/
│   │   ├── database.ts        # Prisma client initialization
│   │   └── swagger.ts         # Swagger/OpenAPI configuration
│   ├── middleware/
│   │   └── errorHandler.ts    # Global error handling middleware
│   ├── routes/
│   │   ├── company.routes.ts  # Company CRUD endpoints
│   │   ├── user.routes.ts     # User and manager assignment endpoints
│   │   ├── expense.routes.ts  # Expense submission and retrieval
│   │   └── approval.routes.ts # Approval flow and decision endpoints
│   ├── services/
│   │   └── approvalService.ts # Core approval logic (getNextApprover, processApprovalDecision)
│   └── server.ts              # Express app initialization and startup
├── .env                       # Environment variables (DATABASE_URL, PORT)
├── .gitignore
├── package.json
├── tsconfig.json
├── README.md
├── API_TESTING_GUIDE.md
└── ARCHITECTURE.md (this file)
```

## Database Schema

### Entity Relationship Diagram

```
Company (1) ────────────────┐
  │                          │
  │ (1:N)                    │ (1:N)
  ├─> User (Admin/Manager/Employee)
  │     │                    │
  │     │ (Manager:N Employee via ManagerAssignment)
  │     │                    │
  │     └─> Expense          │
  │           │              │
  │           │ (1:N)        │
  │           └─> ExpenseApproval
  │                          │
  └─> ApprovalFlowStep ──────┘
       (defines sequential steps)
```

### Key Models

#### 1. **Company**
- Multi-tenant base entity
- Has `defaultCurrency` for expense conversion
- Contains users, expenses, approval flow

#### 2. **User**
- Role: `Admin`, `Manager`, or `Employee`
- Linked to a single company
- Can be an approver, employee, or both

#### 3. **ManagerAssignment**
- One-to-one relationship: Employee → Manager
- Required for approval workflow (Step 1 uses employee's manager)

#### 4. **Expense**
- Submitted by an employee
- Tracks original currency and company currency amounts
- Status: `Pending`, `Approved`, `Rejected`

#### 5. **ApprovalFlowStep**
- Defines sequential approval steps per company
- Example: Step 1 (Manager) → Step 2 (Finance) → Step 3 (Director)
- Manager role uses dynamic approver (employee's manager)
- Finance/Director use static approvers

#### 6. **ExpenseApproval**
- Tracks approval state for each step of an expense
- Unique constraint: one approval per (expense, stepNumber)
- Records approver, status, comments, timestamps

### Enums

```typescript
enum UserRole {
  Admin, Manager, Employee
}

enum ApprovalRole {
  Manager, Finance, Director
}

enum ExpenseStatus {
  Pending, Approved, Rejected
}
```

## Core Features Implementation

### 1. Sequential Approval Workflow

**Location**: `src/services/approvalService.ts` → `getNextApprover()`

**Algorithm**:
1. Fetch expense with all approval records
2. Get company's approval flow steps (ordered by stepNumber)
3. Iterate through existing approvals:
   - If any is `Pending` → return that step's approver
   - If any is `Rejected` → return null (workflow ends)
   - If `Approved` → move to next step
4. If current step > total steps → return null (all complete)
5. Determine approver:
   - For `Manager` role: Use employee's assigned manager
   - For `Finance`/`Director`: Use static approver from flow step
6. Return approver details

**Key Logic**:
```typescript
// An expense can only move to next approver after current one approves/rejects
for (const approval of expense.approvals) {
  if (approval.status === ExpenseStatus.Pending) {
    currentStepNumber = approval.stepNumber;
    break; // Stop at first pending
  } else if (approval.status === ExpenseStatus.Rejected) {
    return null; // Workflow terminated
  } else if (approval.status === ExpenseStatus.Approved) {
    currentStepNumber = approval.stepNumber + 1; // Move to next
  }
}
```

### 2. Conditional Approval Rules

**Location**: `src/services/approvalService.ts` → `processApprovalDecision()`

**Rule**: 
- **IF** expense amount > $500 **OR** approver role is `Finance`
- **THEN** fast-track (move to next step immediately)
- **ELSE** follow normal sequential flow

**Implementation**:
```typescript
const THRESHOLD_AMOUNT = 500;
const shouldFastTrack = 
  expense.companyCurrencyAmount.toNumber() > THRESHOLD_AMOUNT ||
  approverRole === ApprovalRole.Finance;

if (shouldFastTrack) {
  // Check if last step → mark expense as Approved
  if (currentStepNumber >= totalSteps) {
    await prisma.expense.update({
      where: { id: expenseId },
      data: { status: ExpenseStatus.Approved },
    });
  }
} else {
  // Normal flow: check if all steps are approved
  const allApproved = allApprovals.length === flowSteps.length &&
    allApprovals.every((a) => a.status === ExpenseStatus.Approved);
  
  if (allApproved) {
    await prisma.expense.update({
      where: { id: expenseId },
      data: { status: ExpenseStatus.Approved },
    });
  }
}
```

**Effect**:
- High-value expenses (> $500) can skip intermediate manual checks
- Finance approvals automatically fast-track to next step
- Normal expenses follow full sequential approval

### 3. Manager Assignment

**Requirement**: Employees must be assigned to a manager before submitting expenses.

**Endpoint**: `POST /api/users/manager-assignments`

**Validation**:
- Manager must have `Manager` or `Admin` role
- One-to-one relationship (employee can have only one manager)

**Usage in Workflow**:
```typescript
// Step 1 of approval flow uses employee's assigned manager
if (currentFlowStep.approverRole === ApprovalRole.Manager) {
  if (!expense.employee.employeeAssignment) {
    throw new AppError('Employee has no assigned manager', 400);
  }
  approverId = expense.employee.employeeAssignment.managerId;
}
```

## API Design Principles

### RESTful Endpoints

| HTTP Method | Endpoint Pattern | Purpose |
|-------------|------------------|---------|
| POST | `/api/{resource}` | Create a new resource |
| GET | `/api/{resource}` | List all resources (with filters) |
| GET | `/api/{resource}/:id` | Get single resource by ID |
| POST | `/api/{resource}/{action}` | Perform an action |

### Response Patterns

**Success (200/201)**:
```json
{
  "id": "uuid",
  "field1": "value1",
  "field2": "value2"
}
```

**Error (4xx/5xx)**:
```json
{
  "error": "Error message",
  "details": "Optional detailed information"
}
```

### Error Handling

**Centralized Error Middleware** (`src/middleware/errorHandler.ts`):

1. **Zod Validation Errors** (400):
   - Returns field-level validation messages
   - Example: `"email: Invalid email format"`

2. **Custom App Errors** (400/403/404):
   - Thrown via `throw new AppError(message, statusCode)`
   - Example: `throw new AppError('Expense not found', 404)`

3. **Prisma Errors**:
   - `P2002` → 409 (Unique constraint violation)
   - `P2025` → 404 (Record not found)

4. **Unhandled Errors** (500):
   - Logs error to console
   - Returns generic message in production

### Async Error Handling

**Pattern**:
```typescript
export const asyncHandler = (fn: Function) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
```

**Usage**:
```typescript
router.post('/', asyncHandler(async (req, res) => {
  // Any thrown error is caught and passed to error middleware
  const data = schema.parse(req.body); // Zod validation
  const result = await prisma.model.create({ data });
  res.json(result);
}));
```

## Swagger/OpenAPI Documentation

**Location**: `src/config/swagger.ts`

**Features**:
- Complete API documentation
- Schema definitions for all models
- Request/response examples
- Interactive testing UI

**Access**: `http://localhost:3000/api-docs`

**JSDoc Comments**:
```typescript
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
 *               - amount
 *               - category
 *             properties:
 *               amount:
 *                 type: number
 *     responses:
 *       201:
 *         description: Expense created
 */
```

## Data Flow Examples

### Expense Submission Flow

```
1. Employee submits expense
   POST /api/expenses { employeeId, amount, category, ... }
   
2. Create expense record (status: Pending)
   
3. Call getNextApprover(expenseId)
   - Fetch approval flow steps for company
   - Determine Step 1 approver (employee's manager)
   
4. Return expense + nextApprover details
   {
     expense: { id, status: "Pending", ... },
     nextApprover: { stepNumber: 1, approverId, approverName, ... }
   }
```

### Approval Decision Flow

```
1. Manager approves expense
   POST /api/approval-flow/approve 
   { expenseId, approverId, decision: "Approved", comments }
   
2. Verify approver is correct for current step
   - Call getNextApprover(expenseId)
   - Compare approverId
   
3. Create/update ExpenseApproval record
   { expenseId, stepNumber: 1, status: "Approved", decidedAt }
   
4. Apply conditional rules
   IF amount > $500 OR approverRole === Finance:
     - Fast-track: Check if last step → mark expense Approved
   ELSE:
     - Check if all steps approved → mark expense Approved
   
5. Return approval result
   {
     message: "Approval recorded",
     approval: { ... },
     expenseStatus: "Pending" | "Approved",
     fastTracked: true/false
   }
```

## Database Migrations

**Create Migration**:
```bash
npx prisma migrate dev --name migration_name
```

**Apply Migrations** (production):
```bash
npx prisma migrate deploy
```

**Reset Database** (dev only):
```bash
npx prisma migrate reset
```

**View Database**:
```bash
npx prisma studio
```

## Environment Variables

**Required** (`.env`):
```
DATABASE_URL="postgresql://user:password@host:port/database?schema=public"
PORT=3000
```

## Development Workflow

1. **Install dependencies**: `npm install`
2. **Setup database**: Update `.env` with PostgreSQL credentials
3. **Run migrations**: `npx prisma migrate dev --name init`
4. **Generate Prisma Client**: `npx prisma generate`
5. **Seed database** (optional): `npm run seed`
6. **Start dev server**: `npm run dev`
7. **Test API**: Use Swagger UI at `http://localhost:3000/api-docs`

## Production Deployment

1. **Build**: `npm run build`
2. **Set environment**: `NODE_ENV=production`
3. **Run migrations**: `npx prisma migrate deploy`
4. **Start server**: `npm start`

## Testing Strategy

### Manual Testing
- Use Swagger UI for interactive testing
- Follow `API_TESTING_GUIDE.md` for complete workflow testing

### Automated Testing (Future)
- Unit tests: `src/services/approvalService.ts` logic
- Integration tests: API endpoints with test database
- Tools: Jest, Supertest

## Performance Considerations

1. **Database Indexes**:
   - Prisma auto-creates indexes for `@id`, `@unique`, and foreign keys
   - Consider adding indexes for frequently queried fields (e.g., `status`, `companyId`)

2. **Query Optimization**:
   - Use `include` for eager loading related data
   - Avoid N+1 queries by fetching related entities in one query

3. **Connection Pooling**:
   - Prisma manages connection pool automatically
   - Configure in `schema.prisma` if needed

## Security Considerations

### Current Implementation
- Input validation via Zod
- SQL injection prevention via Prisma (parameterized queries)
- Error messages sanitized in production

### Future Enhancements
- **Authentication**: JWT tokens, session management
- **Authorization**: Role-based access control (RBAC)
- **Rate Limiting**: Prevent API abuse
- **CORS**: Configure allowed origins
- **Helmet**: Security headers

## Scalability

### Horizontal Scaling
- Stateless API design (no in-memory sessions)
- Multiple instances can run behind load balancer

### Database Scaling
- Read replicas for heavy read workloads
- Connection pooling (PgBouncer)
- Database sharding by company (multi-tenancy)

### Caching
- Redis for frequently accessed data (user sessions, approval flows)
- Reduce database load

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Prisma ORM | Type-safe database access, excellent TypeScript integration, auto-migrations |
| Zod Validation | Runtime type checking, TypeScript inference, composable schemas |
| Express.js | Mature, minimal, flexible, large ecosystem |
| PostgreSQL | ACID compliance, complex queries, relational data model fits domain |
| Swagger | Industry standard, interactive docs, client SDK generation |
| Async/Await | Clean async code, better error handling than callbacks/promises chains |

## Future Enhancements

1. **Authentication & Authorization**
   - JWT-based authentication
   - Role-based access control per endpoint

2. **Notifications**
   - Email/SMS when approval required
   - Webhook events for integrations

3. **Reporting & Analytics**
   - Expense reports by category, employee, date range
   - Approval turnaround time metrics

4. **File Attachments**
   - Upload receipts/invoices
   - S3/cloud storage integration

5. **Multi-Currency Conversion**
   - Automatic currency conversion API integration
   - Historical exchange rates

6. **Audit Logs**
   - Track all changes to expenses and approvals
   - Compliance and forensics

7. **Advanced Approval Rules**
   - Budget constraints
   - Category-specific approval flows
   - Delegation when approvers are unavailable

## Conclusion

This architecture provides a solid foundation for a production-ready expense management system with:
- ✅ Clean separation of concerns (routes → services → database)
- ✅ Type safety throughout (TypeScript + Prisma + Zod)
- ✅ Robust error handling
- ✅ Comprehensive API documentation
- ✅ Flexible approval workflow engine
- ✅ Scalable multi-tenant design

The codebase is maintainable, testable, and ready for future enhancements.


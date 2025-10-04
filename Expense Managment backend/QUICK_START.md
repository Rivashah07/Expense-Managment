# Quick Start Guide

Get your expense management API up and running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 14+ running locally or remotely
- npm or yarn

## Step 1: Configure Database

Edit `.env` file with your PostgreSQL credentials:

```bash
DATABASE_URL="postgresql://YOUR_USERNAME:YOUR_PASSWORD@localhost:5432/expense_db?schema=public"
PORT=3000
```

**Example**:
```bash
DATABASE_URL="postgresql://postgres:password123@localhost:5432/expense_db?schema=public"
```

## Step 2: Create Database

```bash
# Connect to PostgreSQL and create database
createdb expense_db

# OR using psql:
psql -U postgres -c "CREATE DATABASE expense_db;"
```

## Step 3: Run Migrations

```bash
npx prisma migrate dev --name init
```

This will:
- Create all database tables
- Generate Prisma Client
- Apply schema to database

## Step 4: Seed Sample Data (Optional but Recommended)

```bash
npm run seed
```

This creates:
- 1 Company ("Acme Corporation")
- 6 Users (Admin, Manager, 2 Employees, Finance, Director)
- Manager assignments
- 3-step approval flow (Manager → Finance → Director)
- 2 Sample expenses

**Sample Credentials Created**:
- `admin@acme.com` - Admin User
- `manager@acme.com` - Bob Manager
- `employee1@acme.com` - Charlie Employee
- `employee2@acme.com` - Diana Worker
- `finance@acme.com` - Eve Finance
- `director@acme.com` - Frank Director

## Step 5: Start the Server

```bash
npm run dev
```

Server starts at: **http://localhost:3000**

## Step 6: Test the API

### Option A: Swagger UI (Recommended)

Visit: **http://localhost:3000/api-docs**

Interactive API documentation with:
- All endpoints documented
- Try-it-out functionality
- Schema definitions
- Request/response examples

### Option B: Health Check

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2025-10-04T..."
}
```

### Option C: List Companies

```bash
curl http://localhost:3000/api/companies
```

If you ran the seed, you'll see "Acme Corporation" with UUIDs.

## Quick Test Workflow

If you seeded the database, you can immediately test the approval flow:

### 1. Get Company ID

```bash
curl http://localhost:3000/api/companies
```

Copy the `id` from the response.

### 2. Get User IDs

```bash
curl "http://localhost:3000/api/users?companyId=COMPANY_ID"
```

Find the IDs for:
- An employee (role: "Employee")
- The manager (role: "Manager")

### 3. Submit an Expense

```bash
curl -X POST http://localhost:3000/api/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "EMPLOYEE_ID",
    "companyId": "COMPANY_ID",
    "amount": 600,
    "originalCurrency": "USD",
    "companyCurrencyAmount": 600,
    "category": "Travel",
    "description": "Flight to conference",
    "date": "2025-10-04T10:00:00Z"
  }'
```

This returns the expense and the **next approver** (should be the manager).

### 4. Manager Approves

```bash
curl -X POST http://localhost:3000/api/approval-flow/approve \
  -H "Content-Type: application/json" \
  -d '{
    "expenseId": "EXPENSE_ID",
    "approverId": "MANAGER_ID",
    "decision": "Approved",
    "comments": "Approved for business travel"
  }'
```

**Expected**: `"fastTracked": true` (amount > $500 triggers conditional rule)

### 5. Check Approval History

```bash
curl "http://localhost:3000/api/approval-flow/history?expenseId=EXPENSE_ID"
```

Shows all approval steps for the expense.

## Common Commands

### Development
```bash
npm run dev          # Start dev server with hot reload
npm run build        # Build TypeScript to JavaScript
npm start            # Run production build
```

### Database
```bash
npx prisma studio    # Open database GUI in browser
npx prisma migrate dev --name NAME  # Create new migration
npx prisma migrate reset  # Reset database (DELETES ALL DATA)
npx prisma generate  # Regenerate Prisma Client
npm run seed         # Seed sample data
```

### Project Structure
```bash
npm run build        # Compile TypeScript
node dist/server.js  # Run compiled JavaScript
```

## Troubleshooting

### Error: "Can't reach database server"

**Solution**: 
1. Verify PostgreSQL is running: `psql --version`
2. Check DATABASE_URL in `.env`
3. Test connection: `psql "$DATABASE_URL"`

### Error: "Prisma schema validation failed"

**Solution**: 
```bash
npx prisma generate
npx prisma migrate dev
```

### Port 3000 already in use

**Solution**: 
Change PORT in `.env` to 3001 or another available port.

### Module not found errors

**Solution**: 
```bash
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

1. **Read the API Documentation**: See `API_TESTING_GUIDE.md` for complete workflow testing
2. **Understand the Architecture**: See `ARCHITECTURE.md` for design decisions
3. **Explore Swagger UI**: Visit http://localhost:3000/api-docs
4. **Test Core Features**:
   - Sequential approval flow
   - Conditional rules (amount > $500, Finance role)
   - Rejection flow
   - Manager assignments

## Key Features to Test

✅ **Multi-role system**: Admin, Manager, Employee  
✅ **Expense submission**: With multi-currency support  
✅ **Sequential approvals**: Manager → Finance → Director  
✅ **Conditional rules**: Fast-track for high-value expenses  
✅ **getNextApprover()**: Core function to determine next approver  
✅ **Approval history**: Track all decisions  
✅ **Manager assignments**: Employee-to-Manager relationships  

## Support

- **API Documentation**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/health
- **Database GUI**: `npx prisma studio`

## Production Deployment

When ready for production:

1. Set `NODE_ENV=production`
2. Use production PostgreSQL instance
3. Run `npx prisma migrate deploy` (instead of `migrate dev`)
4. Build: `npm run build`
5. Start: `npm start`
6. Consider using PM2, Docker, or cloud platforms (Heroku, AWS, Railway)

---

**You're all set! 🚀**

Start testing the API with Swagger UI at: **http://localhost:3000/api-docs**


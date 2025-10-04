# Expense Management System - Workflow Diagrams

## 1. Expense Submission & Approval Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     EXPENSE SUBMISSION                          │
└─────────────────────────────────────────────────────────────────┘

Employee                 API                    Database
   │                      │                        │
   │  POST /api/expenses  │                        │
   ├─────────────────────>│                        │
   │                      │  Create Expense        │
   │                      ├───────────────────────>│
   │                      │  (status: Pending)     │
   │                      │                        │
   │                      │  getNextApprover()     │
   │                      ├───────────────────────>│
   │                      │  Fetch approval flow   │
   │                      │  & manager assignment  │
   │                      │<───────────────────────┤
   │  Response:           │                        │
   │  - Expense details   │                        │
   │  - Next approver     │                        │
   │<─────────────────────┤                        │
   │                      │                        │
```

## 2. Sequential Approval Workflow (3 Steps)

```
┌─────────────────────────────────────────────────────────────────┐
│              SEQUENTIAL APPROVAL FLOW                           │
└─────────────────────────────────────────────────────────────────┘

          ┌──────────────┐
          │   EXPENSE    │
          │  (Pending)   │
          └──────┬───────┘
                 │
                 ▼
     ┌───────────────────────┐
     │   STEP 1: MANAGER     │
     │  (Employee's Manager) │
     └───────┬───────────────┘
             │
      ┌──────┴──────┐
      │             │
      ▼             ▼
  APPROVED      REJECTED ───────> Expense Status = REJECTED
      │                           (Workflow Ends)
      │
      │  Check Conditional Rules:
      │  IF amount > $500 OR role = Finance
      │  THEN fastTracked = true
      │
      ▼
┌────────────────────┐
│  STEP 2: FINANCE   │
│ (Static Approver)  │
└────────┬───────────┘
         │
   ┌─────┴─────┐
   │           │
   ▼           ▼
APPROVED   REJECTED ───────> Expense Status = REJECTED
   │                          (Workflow Ends)
   │
   │  Check Conditional Rules:
   │  role = Finance → fastTracked = true
   │
   ▼
┌─────────────────────┐
│ STEP 3: DIRECTOR    │
│  (Static Approver)  │
└─────────┬───────────┘
          │
    ┌─────┴─────┐
    │           │
    ▼           ▼
APPROVED    REJECTED ───────> Expense Status = REJECTED
    │
    │
    ▼
┌──────────────────────┐
│ Expense Status =     │
│     APPROVED         │
│ (Workflow Complete)  │
└──────────────────────┘
```

## 3. Conditional Rules Logic

```
┌─────────────────────────────────────────────────────────────────┐
│              CONDITIONAL APPROVAL RULES                         │
└─────────────────────────────────────────────────────────────────┘

Manager approves expense
         │
         ▼
    ┌────────────────────────┐
    │ Check Conditions:      │
    │                        │
    │ 1. Amount > $500?      │
    │ 2. Approver = Finance? │
    └────────┬───────────────┘
             │
      ┌──────┴──────┐
      │             │
      ▼             ▼
    YES           NO
(Fast-Track)  (Normal Flow)
      │             │
      │             │
      ▼             ▼
Move to next   Wait for all
step NOW       steps to approve
      │             │
      │             │
      └──────┬──────┘
             │
             ▼
    Is this the last step?
             │
      ┌──────┴──────┐
      │             │
      ▼             ▼
     YES           NO
      │             │
      │             │
      ▼             ▼
 Mark expense   Move to next
  APPROVED      pending step
```

## 4. getNextApprover() Algorithm

```
┌─────────────────────────────────────────────────────────────────┐
│            getNextApprover(expenseId) LOGIC                     │
└─────────────────────────────────────────────────────────────────┘

START
  │
  ▼
┌────────────────────────┐
│ Fetch expense with     │
│ all approval records   │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│ Get company's approval │
│ flow steps (ordered)   │
└────────┬───────────────┘
         │
         ▼
┌──────────────────────────────┐
│ Iterate existing approvals:  │
│                              │
│ FOR EACH approval:           │
│   IF status = Pending        │
│     → Return current step    │
│   IF status = Rejected       │
│     → Return NULL            │
│   IF status = Approved       │
│     → Move to next step      │
└────────┬─────────────────────┘
         │
         ▼
┌────────────────────────┐
│ currentStepNumber >    │
│ totalSteps?            │
└────────┬───────────────┘
         │
   ┌─────┴─────┐
   │           │
   ▼           ▼
  YES         NO
   │           │
   │           ▼
   │    ┌──────────────────┐
   │    │ Get flow step    │
   │    │ for current step │
   │    └─────┬────────────┘
   │          │
   │          ▼
   │    ┌──────────────────────┐
   │    │ Determine approver:  │
   │    │                      │
   │    │ IF role = Manager:   │
   │    │   Use employee's     │
   │    │   assigned manager   │
   │    │                      │
   │    │ ELSE:                │
   │    │   Use static         │
   │    │   approver ID        │
   │    └─────┬────────────────┘
   │          │
   │          ▼
   │    ┌──────────────────┐
   │    │ Fetch approver   │
   │    │ user details     │
   │    └─────┬────────────┘
   │          │
   ▼          ▼
Return      Return
NULL      { stepNumber,
(All        approverRole,
done)       approverId,
            approverName,
            approverEmail }
```

## 5. Database Entity Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                 DATABASE SCHEMA                                 │
└─────────────────────────────────────────────────────────────────┘

                    ┌──────────────┐
                    │   Company    │
                    ├──────────────┤
                    │ id (PK)      │
                    │ name         │
                    │ currency     │
                    └──────┬───────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
            ▼              ▼              ▼
     ┌───────────┐  ┌──────────┐  ┌─────────────┐
     │   User    │  │ Expense  │  │ FlowStep    │
     ├───────────┤  ├──────────┤  ├─────────────┤
     │ id (PK)   │  │ id (PK)  │  │ id (PK)     │
     │ email     │  │ amount   │  │ stepNumber  │
     │ name      │  │ currency │  │ approverRole│
     │ role      │  │ category │  │ staticApprId│
     │ companyId │  │ status   │  │ companyId   │
     └─────┬─────┘  └────┬─────┘  └─────────────┘
           │             │
           │             │
           ▼             ▼
  ┌─────────────────┐   ┌──────────────────┐
  │ManagerAssign    │   │ ExpenseApproval  │
  ├─────────────────┤   ├──────────────────┤
  │ id (PK)         │   │ id (PK)          │
  │ employeeId (FK) │   │ expenseId (FK)   │
  │ managerId (FK)  │   │ stepNumber       │
  │ companyId (FK)  │   │ approverId (FK)  │
  └─────────────────┘   │ approverRole     │
                        │ status           │
                        │ comments         │
                        │ decidedAt        │
                        └──────────────────┘
```

## 6. API Request Flow Example

```
┌─────────────────────────────────────────────────────────────────┐
│              APPROVAL REQUEST FLOW                              │
└─────────────────────────────────────────────────────────────────┘

Manager          API Route         Service Layer      Database
   │                │                    │               │
   │  POST /api/    │                    │               │
   │  approval-flow/│                    │               │
   │  approve       │                    │               │
   ├───────────────>│                    │               │
   │                │  1. Validate Zod   │               │
   │                │     schema         │               │
   │                │                    │               │
   │                │  2. Call           │               │
   │                │  processApproval   │               │
   │                │  Decision()        │               │
   │                ├───────────────────>│               │
   │                │                    │               │
   │                │                    │ 3. Fetch      │
   │                │                    │    expense    │
   │                │                    ├──────────────>│
   │                │                    │<──────────────┤
   │                │                    │               │
   │                │                    │ 4. Call       │
   │                │                    │ getNextApprover│
   │                │                    ├──────────────>│
   │                │                    │<──────────────┤
   │                │                    │               │
   │                │                    │ 5. Verify     │
   │                │                    │    approver   │
   │                │                    │               │
   │                │                    │ 6. Create/    │
   │                │                    │    Update     │
   │                │                    │    approval   │
   │                │                    ├──────────────>│
   │                │                    │<──────────────┤
   │                │                    │               │
   │                │                    │ 7. Apply      │
   │                │                    │    conditional│
   │                │                    │    rules      │
   │                │                    │               │
   │                │                    │ 8. Update     │
   │                │                    │    expense    │
   │                │                    │    status     │
   │                │                    ├──────────────>│
   │                │                    │<──────────────┤
   │                │                    │               │
   │                │  9. Return result  │               │
   │                │<───────────────────┤               │
   │                │                    │               │
   │  Response:     │                    │               │
   │  {             │                    │               │
   │   message,     │                    │               │
   │   approval,    │                    │               │
   │   status,      │                    │               │
   │   fastTracked  │                    │               │
   │  }             │                    │               │
   │<───────────────┤                    │               │
   │                │                    │               │
```

## 7. User Roles & Permissions

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER ROLES                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────┐
│    ADMIN    │
├─────────────┤
│ • Manage    │
│   company   │
│ • Create    │
│   users     │
│ • Setup     │
│   approval  │
│   flow      │
│ • Can be    │
│   approver  │
└─────────────┘

┌─────────────┐
│   MANAGER   │
├─────────────┤
│ • Approve   │
│   expenses  │
│ • Manage    │
│   team      │
│ • Submit    │
│   expenses  │
│ • Can be    │
│   approver  │
│   (Step 1)  │
└─────────────┘

┌─────────────┐
│  EMPLOYEE   │
├─────────────┤
│ • Submit    │
│   expenses  │
│ • View own  │
│   expenses  │
│ • Must have │
│   manager   │
│   assigned  │
└─────────────┘
```

## 8. Conditional Rules Decision Tree

```
┌─────────────────────────────────────────────────────────────────┐
│            CONDITIONAL RULES DECISION TREE                      │
└─────────────────────────────────────────────────────────────────┘

                    Expense Approved
                          │
                          ▼
              ┌───────────────────────┐
              │ Amount > $500?        │
              └───────┬───────────────┘
                      │
         ┌────────────┴────────────┐
         │                         │
        YES                       NO
         │                         │
         │                         ▼
         │              ┌────────────────────┐
         │              │ Approver = Finance?│
         │              └────────┬───────────┘
         │                       │
         │              ┌────────┴────────┐
         │              │                 │
         │             YES               NO
         │              │                 │
         └──────┬───────┘                 │
                │                         │
                ▼                         ▼
        ┌───────────────┐        ┌──────────────┐
        │  FAST-TRACK   │        │ NORMAL FLOW  │
        ├───────────────┤        ├──────────────┤
        │ • Move to     │        │ • Wait for   │
        │   next step   │        │   all steps  │
        │   immediately │        │   to approve │
        │ • Check if    │        │ • Sequential │
        │   last step   │        │   processing │
        │ • Return      │        │ • Return     │
        │   fastTracked:│        │   fastTracked│
        │   true        │        │   :false     │
        └───────────────┘        └──────────────┘
```

## 9. Expense Status State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│              EXPENSE STATUS TRANSITIONS                         │
└─────────────────────────────────────────────────────────────────┘

                    ┌──────────┐
                    │ CREATED  │
                    └────┬─────┘
                         │
                         ▼
                   ┌──────────┐
             ┌─────│ PENDING  │─────┐
             │     └──────────┘     │
             │                      │
             │                      │
    Approver │                      │ Approver
    Rejects  │                      │ Approves
             │                      │ (last step)
             ▼                      ▼
        ┌─────────┐            ┌──────────┐
        │REJECTED │            │ APPROVED │
        └─────────┘            └──────────┘
        (Terminal)              (Terminal)

Notes:
• Once REJECTED or APPROVED, status is final
• PENDING → APPROVED only after all steps approve
• PENDING → REJECTED can happen at any step
```

---

## Legend

```
┌──────┐
│ Box  │  = Process/State
└──────┘

   │
   ▼      = Flow Direction
   
───────   = Decision/Branch

(PK)      = Primary Key
(FK)      = Foreign Key
```

---

**These diagrams illustrate the complete workflow of the expense management system.**

For implementation details, see:
- **Code**: `src/services/approvalService.ts`
- **API Docs**: http://localhost:3000/api-docs
- **Testing**: `API_TESTING_GUIDE.md`


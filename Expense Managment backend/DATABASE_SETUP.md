# Database Setup Guide

The backend requires PostgreSQL to run. You're seeing "Route not found" errors because the database is not configured.

## Error You're Experiencing

```
Error: P1001: Can't reach database server at `localhost:5432`
```

This means PostgreSQL is not installed or not running.

---

## 🚀 Quick Setup Options

### Option 1: Install PostgreSQL with Homebrew (Recommended for macOS)

```bash
# Install PostgreSQL
brew install postgresql@14

# Start PostgreSQL service
brew services start postgresql@14

# Create database
createdb expense_management

# Update .env (already done)
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/expense_management?schema=public"
```

### Option 2: Use Docker (Cross-platform)

```bash
# Pull and run PostgreSQL in Docker
docker run --name postgres-expense \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=expense_management \
  -p 5432:5432 \
  -d postgres:14

# Database will be available at localhost:5432
# .env is already configured correctly
```

### Option 3: Use a Free Cloud Database (No local install)

**Railway.app** (Free tier, easiest):

1. Go to https://railway.app
2. Sign up (GitHub login)
3. Click "New Project" → "Provision PostgreSQL"
4. Click on PostgreSQL service → "Connect" → Copy "DATABASE_URL"
5. Update `.env`:
   ```
   DATABASE_URL="<paste-railway-url-here>"
   ```

**Supabase** (Free tier):

1. Go to https://supabase.com
2. Create account and new project
3. Go to Settings → Database → Connection string
4. Copy URI and update `.env`

**Neon** (Free tier):

1. Go to https://neon.tech
2. Create account and project
3. Copy connection string
4. Update `.env`

---

## After Database is Running

Once you have PostgreSQL running (via any method above), run these commands:

```bash
# 1. Run migrations to create tables
npx prisma migrate dev --name init

# 2. Seed sample data (optional but recommended)
npm run seed

# 3. Restart the server
npm run dev
```

---

## Verify Setup

After running migrations, test the API:

```bash
# Health check
curl http://localhost:3000/health

# Create a company
curl -X POST http://localhost:3000/api/companies \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Corp","defaultCurrency":"USD"}'
```

**Expected**: JSON response with company details (not "Route not found")

---

## Recommended: Docker Option (Fastest)

If you have Docker installed:

```bash
# 1. Start PostgreSQL
docker run --name postgres-expense \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=expense_management \
  -p 5432:5432 \
  -d postgres:14

# 2. Wait 3 seconds for DB to initialize
sleep 3

# 3. Run migrations
npx prisma migrate dev --name init

# 4. Seed data
npm run seed

# 5. Test API
curl http://localhost:3000/api/companies
```

To stop PostgreSQL later:
```bash
docker stop postgres-expense
```

To start it again:
```bash
docker start postgres-expense
```

To remove it:
```bash
docker rm -f postgres-expense
```

---

## Current .env Configuration

Your `.env` is already configured for local PostgreSQL:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/expense_management?schema=public"
PORT=3000
NODE_ENV=development
```

This works for:
- ✅ Homebrew PostgreSQL (default credentials)
- ✅ Docker PostgreSQL (with command above)

For cloud databases, replace `DATABASE_URL` with the cloud provider's connection string.

---

## Troubleshooting

### "Command not found: createdb"

PostgreSQL is not installed or not in PATH.
- **Solution**: Use Docker or cloud database

### "Connection refused at localhost:5432"

PostgreSQL is installed but not running.
- **Homebrew**: `brew services start postgresql@14`
- **Docker**: `docker start postgres-expense`

### "Password authentication failed"

Wrong credentials in DATABASE_URL.
- **Solution**: Update `.env` with correct username/password

### "Database does not exist"

Database not created yet.
- **Solution**: `createdb expense_management` or use Docker command above

---

## Next Steps

1. **Choose one option** from above (Docker recommended)
2. **Run migrations**: `npx prisma migrate dev --name init`
3. **Seed data**: `npm run seed`
4. **Test API**: Visit http://localhost:3000/api-docs

The server is already running (`npm run dev`), so after database setup, just restart it and routes will work!


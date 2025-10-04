#!/bin/bash

# Expense Management System - Quick Setup Script
# This script sets up PostgreSQL via Docker and initializes the database

echo "🚀 Starting Expense Management System Setup..."
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first:"
    echo "   Visit: https://www.docker.com/products/docker-desktop"
    echo ""
    echo "Or use Homebrew: brew install --cask docker"
    exit 1
fi

echo "✅ Docker found"
echo ""

# Check if PostgreSQL container already exists
if docker ps -a | grep -q postgres-expense; then
    echo "📦 PostgreSQL container already exists. Starting it..."
    docker start postgres-expense
else
    echo "📦 Creating PostgreSQL container..."
    docker run --name postgres-expense \
      -e POSTGRES_PASSWORD=postgres \
      -e POSTGRES_DB=expense_management \
      -p 5432:5432 \
      -d postgres:14
fi

echo "⏳ Waiting for PostgreSQL to initialize..."
sleep 5

echo "✅ PostgreSQL is running"
echo ""

# Run Prisma migrations
echo "📊 Running database migrations..."
npx prisma migrate dev --name init --skip-seed

if [ $? -eq 0 ]; then
    echo "✅ Migrations completed"
else
    echo "❌ Migration failed. Check your DATABASE_URL in .env"
    exit 1
fi

echo ""

# Seed database
echo "🌱 Seeding database with sample data..."
npm run seed

if [ $? -eq 0 ]; then
    echo "✅ Database seeded successfully"
else
    echo "⚠️  Seeding failed (optional step)"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Start server: npm run dev"
echo "   2. Visit Swagger UI: http://localhost:3000/api-docs"
echo "   3. Test health: curl http://localhost:3000/health"
echo ""
echo "💡 To stop PostgreSQL: docker stop postgres-expense"
echo "💡 To start PostgreSQL: docker start postgres-expense"
echo "💡 Database GUI: npx prisma studio"


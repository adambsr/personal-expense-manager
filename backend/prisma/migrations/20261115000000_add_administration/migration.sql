CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

ALTER TABLE "User"
  ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER',
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "GlobalCategory" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(40) NOT NULL,
  "type" "CategoryType" NOT NULL,
  "icon" VARCHAR(40) NOT NULL DEFAULT 'circle',
  "color" VARCHAR(7) NOT NULL DEFAULT '#4338ca',
  "enabledForNewUsers" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "GlobalCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GlobalCategory_type_name_key" ON "GlobalCategory"("type", "name");
CREATE INDEX "GlobalCategory_type_enabledForNewUsers_idx" ON "GlobalCategory"("type", "enabledForNewUsers");

INSERT INTO "GlobalCategory" ("name", "type", "icon", "color", "enabledForNewUsers", "updatedAt") VALUES
  ('Food & Groceries', 'EXPENSE', 'utensils', '#f59e0b', true, NOW()),
  ('Restaurants & Cafés', 'EXPENSE', 'coffee', '#f59e0b', true, NOW()),
  ('Transportation', 'EXPENSE', 'car', '#2563eb', true, NOW()),
  ('Shopping', 'EXPENSE', 'shopping-bag', '#9333ea', true, NOW()),
  ('Bills & Utilities', 'EXPENSE', 'zap', '#7c3aed', true, NOW()),
  ('Housing & Rent', 'EXPENSE', 'house', '#4f46e5', true, NOW()),
  ('Health & Medical', 'EXPENSE', 'heart', '#e11d48', true, NOW()),
  ('Entertainment', 'EXPENSE', 'clapperboard', '#c026d3', true, NOW()),
  ('Education', 'EXPENSE', 'book-open', '#0891b2', true, NOW()),
  ('Travel', 'EXPENSE', 'plane', '#0284c7', true, NOW()),
  ('Personal Care', 'EXPENSE', 'sparkles', '#db2777', true, NOW()),
  ('Subscriptions', 'EXPENSE', 'repeat', '#6366f1', true, NOW()),
  ('Other Expenses', 'EXPENSE', 'circle', '#64748b', true, NOW()),
  ('Salary', 'INCOME', 'wallet', '#059669', true, NOW()),
  ('Freelance', 'INCOME', 'laptop', '#0d9488', true, NOW()),
  ('Business', 'INCOME', 'briefcase', '#0891b2', true, NOW()),
  ('Investments', 'INCOME', 'trending-up', '#16a34a', true, NOW()),
  ('Gifts', 'INCOME', 'gift', '#db2777', true, NOW()),
  ('Other Income', 'INCOME', 'circle', '#64748b', true, NOW());

CREATE TABLE "AdminAuditLog" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "actorUserId" UUID NOT NULL,
  "action" VARCHAR(60) NOT NULL,
  "targetId" VARCHAR(100) NOT NULL,
  "details" JSONB,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminAuditLog_actorUserId_createdAt_idx" ON "AdminAuditLog"("actorUserId", "createdAt");
CREATE INDEX "AdminAuditLog_targetId_createdAt_idx" ON "AdminAuditLog"("targetId", "createdAt");

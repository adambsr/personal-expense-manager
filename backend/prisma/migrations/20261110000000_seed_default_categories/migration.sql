INSERT INTO "Category" ("id", "userId", "name", "type", "createdAt", "updatedAt")
SELECT gen_random_uuid(), users."id", defaults."name", defaults."type"::"CategoryType", NOW(), NOW()
FROM "User" AS users
CROSS JOIN (VALUES
  ('Food & Groceries', 'EXPENSE'),
  ('Restaurants & Cafés', 'EXPENSE'),
  ('Transportation', 'EXPENSE'),
  ('Shopping', 'EXPENSE'),
  ('Bills & Utilities', 'EXPENSE'),
  ('Housing & Rent', 'EXPENSE'),
  ('Health & Medical', 'EXPENSE'),
  ('Entertainment', 'EXPENSE'),
  ('Education', 'EXPENSE'),
  ('Travel', 'EXPENSE'),
  ('Personal Care', 'EXPENSE'),
  ('Subscriptions', 'EXPENSE'),
  ('Other Expenses', 'EXPENSE'),
  ('Salary', 'INCOME'),
  ('Freelance', 'INCOME'),
  ('Business', 'INCOME'),
  ('Investments', 'INCOME'),
  ('Gifts', 'INCOME'),
  ('Other Income', 'INCOME')
) AS defaults("name", "type")
ON CONFLICT ("userId", "type", "name") DO NOTHING;

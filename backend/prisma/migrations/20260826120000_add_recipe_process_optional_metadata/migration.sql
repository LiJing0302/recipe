ALTER TABLE "Recipe"
ADD COLUMN "process" TEXT,
ALTER COLUMN "servings" DROP NOT NULL,
ALTER COLUMN "duration" DROP NOT NULL,
ALTER COLUMN "difficulty" DROP NOT NULL;

UPDATE "Recipe"
SET "process" = '其他'
WHERE "process" IS NULL;

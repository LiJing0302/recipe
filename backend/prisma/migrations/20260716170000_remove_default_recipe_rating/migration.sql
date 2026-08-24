-- New recipes should remain unrated until someone submits a rating.
ALTER TABLE "Recipe" ALTER COLUMN "rating" SET DEFAULT 0;

-- Existing rows with no ratings were created from the old placeholder default.
UPDATE "Recipe" SET "rating" = 0 WHERE "ratingCount" = 0;

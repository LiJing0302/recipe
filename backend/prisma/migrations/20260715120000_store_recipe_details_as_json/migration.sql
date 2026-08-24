-- Move recipe-owned details into JSONB columns before removing the child tables.
ALTER TABLE "Recipe"
ADD COLUMN "ingredients" JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN "steps" JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE "Recipe" AS recipe
SET
  "ingredients" = COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', ingredient."id",
        'name', ingredient."name",
        'amount', ingredient."amount",
        'optional', ingredient."optional"
      ) ORDER BY ingredient."position"
    )
    FROM "Ingredient" AS ingredient
    WHERE ingredient."recipeId" = recipe."id"
  ), '[]'::jsonb),
  "steps" = COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', step."id",
        'title', step."title",
        'description', step."description",
        'duration', step."duration",
        'tip', step."tip",
        'images', COALESCE(step."images", ARRAY[]::text[])
      ) ORDER BY step."position"
    )
    FROM "RecipeStep" AS step
    WHERE step."recipeId" = recipe."id"
  ), '[]'::jsonb);

DROP TABLE "Ingredient";
DROP TABLE "RecipeStep";

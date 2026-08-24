-- Track independent user-owned copies imported from public recipes.
CREATE TABLE "RecipeImport" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "originRecipeId" TEXT NOT NULL,
    "originAuthorId" TEXT NOT NULL,
    "copiedRecipeId" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecipeImport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RecipeImport_copiedRecipeId_key" ON "RecipeImport"("copiedRecipeId");
CREATE UNIQUE INDEX "RecipeImport_ownerId_originRecipeId_key" ON "RecipeImport"("ownerId", "originRecipeId");
CREATE INDEX "RecipeImport_originRecipeId_idx" ON "RecipeImport"("originRecipeId");

ALTER TABLE "RecipeImport" ADD CONSTRAINT "RecipeImport_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecipeImport" ADD CONSTRAINT "RecipeImport_originRecipeId_fkey"
  FOREIGN KEY ("originRecipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecipeImport" ADD CONSTRAINT "RecipeImport_copiedRecipeId_fkey"
  FOREIGN KEY ("copiedRecipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

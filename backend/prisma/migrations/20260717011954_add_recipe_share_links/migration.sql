-- CreateTable
CREATE TABLE "RecipeShareLink" (
    "id" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "codeCiphertext" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecipeShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecipeShareLink_codeHash_key" ON "RecipeShareLink"("codeHash");

-- CreateIndex
CREATE UNIQUE INDEX "RecipeShareLink_userId_key" ON "RecipeShareLink"("userId");

-- AddForeignKey
ALTER TABLE "RecipeShareLink" ADD CONSTRAINT "RecipeShareLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

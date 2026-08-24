-- CreateTable
CREATE TABLE "UserIngredientCategory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserIngredientCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserIngredientMapping" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "normalizedSourceName" TEXT NOT NULL,
    "ingredientKey" TEXT NOT NULL,
    "targetName" TEXT,
    "targetCategory" TEXT,
    "matchMethod" TEXT NOT NULL,
    "confidence" DECIMAL(6,5),
    "confirmedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserIngredientMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryBatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "ingredientKey" TEXT,
    "category" TEXT NOT NULL,
    "quantity" DECIMAL(18,6) NOT NULL,
    "unit" TEXT NOT NULL,
    "baseQuantity" DECIMAL(18,6),
    "baseUnit" TEXT,
    "purchasedAt" TIMESTAMP(3) NOT NULL,
    "price" DECIMAL(18,2) NOT NULL,
    "sourceType" TEXT NOT NULL,
    "recipeId" TEXT,
    "recipeTitle" TEXT,
    "basketItemId" TEXT,
    "storageMode" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BasketItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "ingredientName" TEXT NOT NULL,
    "ingredientKey" TEXT,
    "matchMethod" TEXT,
    "amount" JSONB NOT NULL,
    "sourceConversion" JSONB,
    "recipeId" TEXT NOT NULL,
    "recipeTitle" TEXT NOT NULL,
    "recipeCover" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BasketItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "meal" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "orderedBy" TEXT NOT NULL DEFAULT '',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFollow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFollow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeCollection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecipeCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "recipeTitle" TEXT NOT NULL,
    "hostName" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "note" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CookingRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "recipeTitle" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "duration" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "guestComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CookingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserIngredientCategory_userId_position_idx" ON "UserIngredientCategory"("userId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "UserIngredientCategory_userId_name_key" ON "UserIngredientCategory"("userId", "name");

-- CreateIndex
CREATE INDEX "UserIngredientMapping_userId_ingredientKey_idx" ON "UserIngredientMapping"("userId", "ingredientKey");

-- CreateIndex
CREATE UNIQUE INDEX "UserIngredientMapping_userId_normalizedSourceName_key" ON "UserIngredientMapping"("userId", "normalizedSourceName");

-- CreateIndex
CREATE INDEX "InventoryBatch_userId_ingredientKey_idx" ON "InventoryBatch"("userId", "ingredientKey");

-- CreateIndex
CREATE INDEX "InventoryBatch_userId_purchasedAt_idx" ON "InventoryBatch"("userId", "purchasedAt");

-- CreateIndex
CREATE INDEX "BasketItem_userId_ingredientKey_idx" ON "BasketItem"("userId", "ingredientKey");

-- CreateIndex
CREATE UNIQUE INDEX "BasketItem_userId_recipeId_ingredientId_key" ON "BasketItem"("userId", "recipeId", "ingredientId");

-- CreateIndex
CREATE INDEX "MenuEntry_userId_date_idx" ON "MenuEntry"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "MenuEntry_userId_date_meal_recipeId_orderedBy_key" ON "MenuEntry"("userId", "date", "meal", "recipeId", "orderedBy");

-- CreateIndex
CREATE INDEX "UserFollow_followerId_idx" ON "UserFollow"("followerId");

-- CreateIndex
CREATE INDEX "UserFollow_followingId_idx" ON "UserFollow"("followingId");

-- CreateIndex
CREATE UNIQUE INDEX "UserFollow_followerId_followingId_key" ON "UserFollow"("followerId", "followingId");

-- CreateIndex
CREATE INDEX "RecipeCollection_userId_createdAt_idx" ON "RecipeCollection"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RecipeCollection_userId_recipeId_key" ON "RecipeCollection"("userId", "recipeId");

-- CreateIndex
CREATE INDEX "Order_userId_date_idx" ON "Order"("userId", "date");

-- CreateIndex
CREATE INDEX "CookingRecord_userId_date_idx" ON "CookingRecord"("userId", "date");

-- AddForeignKey
ALTER TABLE "UserIngredientCategory" ADD CONSTRAINT "UserIngredientCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserIngredientMapping" ADD CONSTRAINT "UserIngredientMapping_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryBatch" ADD CONSTRAINT "InventoryBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BasketItem" ADD CONSTRAINT "BasketItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuEntry" ADD CONSTRAINT "MenuEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuEntry" ADD CONSTRAINT "MenuEntry_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFollow" ADD CONSTRAINT "UserFollow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFollow" ADD CONSTRAINT "UserFollow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeCollection" ADD CONSTRAINT "RecipeCollection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeCollection" ADD CONSTRAINT "RecipeCollection_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CookingRecord" ADD CONSTRAINT "CookingRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CookingRecord" ADD CONSTRAINT "CookingRecord_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

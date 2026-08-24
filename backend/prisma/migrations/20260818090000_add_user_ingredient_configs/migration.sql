CREATE TABLE "UserIngredientProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ingredientKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "roomDays" INTEGER NOT NULL,
    "fridgeDays" INTEGER NOT NULL,
    "frozenDays" INTEGER NOT NULL,
    "fridgeSuitable" BOOLEAN NOT NULL DEFAULT true,
    "showExtraUnit" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserIngredientProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserIngredientUnit" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "unitKey" TEXT NOT NULL,
    "unitName" TEXT NOT NULL,
    "baseUnit" TEXT,
    "baseValue" DECIMAL(18,6),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserIngredientUnit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserIngredientProfile_userId_ingredientKey_key" ON "UserIngredientProfile"("userId", "ingredientKey");
CREATE INDEX "UserIngredientProfile_userId_category_idx" ON "UserIngredientProfile"("userId", "category");
CREATE UNIQUE INDEX "UserIngredientUnit_profileId_unitKey_key" ON "UserIngredientUnit"("profileId", "unitKey");
CREATE INDEX "UserIngredientUnit_profileId_enabled_idx" ON "UserIngredientUnit"("profileId", "enabled");

ALTER TABLE "UserIngredientProfile" ADD CONSTRAINT "UserIngredientProfile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserIngredientUnit" ADD CONSTRAINT "UserIngredientUnit_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "UserIngredientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

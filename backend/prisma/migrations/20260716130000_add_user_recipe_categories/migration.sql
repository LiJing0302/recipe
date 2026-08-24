-- Store the editable category list for each user.
CREATE TABLE "RecipeCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecipeCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RecipeCategory_userId_name_key" ON "RecipeCategory"("userId", "name");
CREATE INDEX "RecipeCategory_userId_position_idx" ON "RecipeCategory"("userId", "position");

ALTER TABLE "RecipeCategory" ADD CONSTRAINT "RecipeCategory_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "RecipeCategory" ("id", "name", "position", "isDefault", "userId", "updatedAt")
SELECT md5('default-category:' || "id" || ':' || category.name), category.name, category.position, true, "id", CURRENT_TIMESTAMP
FROM "User"
CROSS JOIN (VALUES
  ('快手早餐', 0),
  ('冷盘凉菜', 1),
  ('荤菜主菜', 2),
  ('素菜家常', 3),
  ('米面主食', 4),
  ('汤粥煲汤', 5),
  ('小吃点心', 6),
  ('饮品酒水', 7)
) AS category(name, position);

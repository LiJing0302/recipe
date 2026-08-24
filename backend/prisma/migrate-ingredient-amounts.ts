import { PrismaClient } from '@prisma/client'
import { parseStoredIngredientAmount } from '../src/recipes/ingredient-amount'

const prisma = new PrismaClient()

const isStructuredAmount = (value: unknown) => Boolean(value && typeof value === 'object' && typeof (value as { raw?: unknown }).raw === 'string' && typeof (value as { type?: unknown }).type === 'string')

async function main() {
  const recipes = await prisma.recipe.findMany({ select: { id: true, ingredients: true } })
  let updatedRecipes = 0
  let migratedIngredients = 0

  for (const recipe of recipes) {
    if (!Array.isArray(recipe.ingredients)) continue
    let changed = false
    const ingredients = recipe.ingredients.map((value) => {
      if (!value || typeof value !== 'object') return value
      const ingredient = value as { name?: unknown; amount?: unknown; unit?: unknown }
      if (isStructuredAmount(ingredient.amount) && ingredient.unit === undefined) return value
      changed = true
      migratedIngredients += 1
      const { unit: legacyUnit, ...withoutLegacyUnit } = ingredient
      return {
        ...withoutLegacyUnit,
        amount: parseStoredIngredientAmount(ingredient.amount, typeof legacyUnit === 'string' ? legacyUnit : '')
      }
    })
    if (changed) {
      await prisma.recipe.update({ where: { id: recipe.id }, data: { ingredients } })
      updatedRecipes += 1
    }
  }

  console.log(`Migrated ${migratedIngredients} ingredients in ${updatedRecipes} recipes`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())

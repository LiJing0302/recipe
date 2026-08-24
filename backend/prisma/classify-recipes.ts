import { PrismaClient } from '@prisma/client'
import { classifyRecipe } from '../src/recipes/category-classifier'

const prisma = new PrismaClient()
const BATCH_SIZE = 500

async function main() {
  const recipes = await prisma.recipe.findMany({
    select: { id: true, title: true, tags: true, ingredients: true }
  })
  const groups = new Map<string, string[]>()
  for (const recipe of recipes) {
    const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients as Array<{ name: string }> : []
    const categories = classifyRecipe({ title: recipe.title, tags: recipe.tags, ingredients: ingredients.map((item) => item.name) })
    const key = categories.join('|')
    const ids = groups.get(key) || []
    ids.push(recipe.id)
    groups.set(key, ids)
  }

  let updated = 0
  for (const [key, ids] of groups) {
    const categories = key.split('|')
    for (let offset = 0; offset < ids.length; offset += BATCH_SIZE) {
      const result = await prisma.recipe.updateMany({
        where: { id: { in: ids.slice(offset, offset + BATCH_SIZE) } },
        data: { categories }
      })
      updated += result.count
      console.log(`已分类 ${updated}/${recipes.length}`)
    }
  }
  console.log(JSON.stringify({ total: recipes.length, updated, groups: groups.size }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
}).finally(() => prisma.$disconnect())

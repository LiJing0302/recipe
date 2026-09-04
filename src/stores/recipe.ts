import { defineStore } from 'pinia'
import type { Recipe } from '@/types'
import { getAuthSessionVersion } from '@/services/auth-session'
import { createRecipeRemote, deleteRecipeRemote, fetchMyRecipes, updateRecipeRemote } from '@/services/recipe'
import { getAuthToken } from '@/services/storage'

type RecipeScope = 'none' | 'mine'

export const useRecipeStore = defineStore('recipe', {
  state: () => ({
    recipes: [] as Recipe[],
    loaded: false,
    loading: false,
    includeImported: false,
    scope: 'none' as RecipeScope,
    revision: 0
  }),
  actions: {
    clear() {
      this.revision += 1
      this.recipes = []
      this.loaded = false
      this.loading = false
      this.scope = 'none'
    },

    async load(includeImported = this.includeImported, force = false) {
      const token = getAuthToken()
      const sessionVersion = getAuthSessionVersion()
      if (!token) {
        this.clear()
        return this.recipes
      }
      if (this.scope === 'mine' && this.loaded && this.includeImported === includeImported && !force) return this.recipes
      if (this.scope === 'mine' && this.loading && this.includeImported === includeImported) return this.recipes

      const revision = ++this.revision
      this.scope = 'mine'
      this.includeImported = includeImported
      this.loading = true
      try {
        const recipes = await fetchMyRecipes(includeImported)
        if (revision !== this.revision || token !== getAuthToken() || sessionVersion !== getAuthSessionVersion()) return this.recipes
        this.recipes = [...recipes]
        this.loaded = true
        return this.recipes
      } finally {
        if (revision === this.revision && token === getAuthToken() && sessionVersion === getAuthSessionVersion()) this.loading = false
      }
    },

    async refresh(includeImported = this.includeImported) {
      return this.load(includeImported, true)
    },

    async create(recipe: Recipe) {
      return this.save(recipe, 'create')
    },

    async update(recipe: Recipe) {
      return this.save(recipe, 'update')
    },

    async remove(recipeId: string) {
      const token = getAuthToken()
      const sessionVersion = getAuthSessionVersion()
      if (!token) throw new Error('请先登录')

      // 让删除期间已发起的列表请求失效，避免旧列表覆盖删除结果。
      const writeRevision = ++this.revision
      try {
        await deleteRecipeRemote(recipeId)
        if (token !== getAuthToken() || sessionVersion !== getAuthSessionVersion()) return recipeId

        this.revision += 1
        this.loading = false
        if (this.scope === 'mine') this.recipes = this.recipes.filter((recipe) => recipe.id !== recipeId)
        return recipeId
      } catch (error) {
        if (writeRevision === this.revision) this.loading = false
        throw error
      }
    },

    async save(recipe: Recipe, mode: 'create' | 'update') {
      const token = getAuthToken()
      const sessionVersion = getAuthSessionVersion()
      if (!token) throw new Error('请先登录')

      // 让写入期间已发起的列表请求失效，避免旧列表覆盖写入结果。
      const writeRevision = ++this.revision
      try {
        const saved = mode === 'create' ? await createRecipeRemote(recipe) : await updateRecipeRemote(recipe)
        if (token !== getAuthToken() || sessionVersion !== getAuthSessionVersion()) return saved

        this.revision += 1
        this.loading = false
        if (this.scope === 'mine') {
          if (this.includeImported || !saved.isImported) {
            const index = this.recipes.findIndex((item) => item.id === saved.id)
            if (index < 0) this.recipes = [saved, ...this.recipes]
            else this.recipes = this.recipes.map((item) => item.id === saved.id ? saved : item)
          } else {
            this.recipes = this.recipes.filter((item) => item.id !== saved.id)
          }
        }
        return saved
      } catch (error) {
        if (writeRevision === this.revision) this.loading = false
        throw error
      }
    }
  }
})

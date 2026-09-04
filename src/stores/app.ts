import { defineStore } from 'pinia'
import type { UserProfile } from '@/types'
import { bumpAuthSessionVersion, getAuthSessionVersion, subscribeAuthSession } from '@/services/auth-session'
import { clearAllRuntimeCaches } from '@/services/session-cache'
import { clearAuthSession, getAuthToken, getStoredUser, saveAuthSession, saveCurrentUser } from '@/services/storage'
import { useBasketStore } from './basket'
import { useInventoryStore } from './inventory'
import { useRecipeStore } from './recipe'

let authEventBound = false

export const useAppStore = defineStore('app', {
  state: () => ({
    user: null as UserProfile | null,
    token: '',
    sessionVersion: 0,
    ready: false
  }),
  getters: {
    authenticated: (state) => Boolean(state.user && state.token),
    sessionKey: (state) => `${state.sessionVersion}:${state.user?.id || 'guest'}`
  },
  actions: {
    bootstrap() {
      if (!authEventBound) {
        authEventBound = true
        subscribeAuthSession((event) => {
          if (event === 'expired') this.expire()
        })
      }

      const token = getAuthToken()
      const user = getStoredUser()
      const basketStore = useBasketStore()
      const inventoryStore = useInventoryStore()
      const recipeStore = useRecipeStore()
      this.sessionVersion = getAuthSessionVersion()
      if (token && user) {
        this.token = token
        this.user = user
        void Promise.all([basketStore.load(), inventoryStore.load(), recipeStore.load()]).catch(() => undefined)
      } else {
        clearAuthSession()
        clearAllRuntimeCaches()
        basketStore.clear()
        inventoryStore.clear()
        recipeStore.clear()
        this.token = ''
        this.user = null
      }
      this.ready = true
    },
    setSession(token: string, user: UserProfile) {
      clearAllRuntimeCaches()
      const basketStore = useBasketStore()
      const inventoryStore = useInventoryStore()
      const recipeStore = useRecipeStore()
      basketStore.clear()
      inventoryStore.clear()
      recipeStore.clear()
      saveAuthSession(token, user)
      this.token = token
      this.user = user
      this.sessionVersion = bumpAuthSessionVersion()
      void Promise.all([basketStore.load(), inventoryStore.load(), recipeStore.load()]).catch(() => undefined)
    },
    logout() {
      const hadSession = Boolean(this.user || this.token || getAuthToken() || getStoredUser())
      clearAuthSession()
      clearAllRuntimeCaches()
      useBasketStore().clear()
      useInventoryStore().clear()
      useRecipeStore().clear()
      if (!hadSession) return
      this.token = ''
      this.user = null
      this.sessionVersion = bumpAuthSessionVersion()
    },
    expire() {
      this.logout()
    },
    updateUser(patch: Partial<UserProfile>) {
      if (!this.user) return
      this.user = { ...this.user, ...patch }
      saveCurrentUser(this.user)
    }
  }
})

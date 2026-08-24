import { defineStore } from 'pinia'
import type { UserProfile } from '@/types'
import { getCurrentUser, saveCurrentUser } from '@/services/storage'

export const useAppStore = defineStore('app', {
  state: () => ({
    user: null as UserProfile | null,
    ready: false
  }),
  actions: {
    bootstrap() {
      this.user = getCurrentUser()
      this.ready = true
    },
    updateUser(patch: Partial<UserProfile>) {
      if (!this.user) return
      this.user = { ...this.user, ...patch }
      saveCurrentUser(this.user)
    }
  }
})

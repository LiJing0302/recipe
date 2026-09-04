export type AuthSessionEvent = 'expired'

type AuthSessionListener = (event: AuthSessionEvent) => void

const listeners = new Set<AuthSessionListener>()
let authSessionVersion = 0

export const subscribeAuthSession = (listener: AuthSessionListener) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const notifyAuthExpired = () => {
  listeners.forEach((listener) => listener('expired'))
}

export const getAuthSessionVersion = () => authSessionVersion

export const bumpAuthSessionVersion = () => {
  authSessionVersion += 1
  return authSessionVersion
}

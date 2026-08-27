// The backend exposes all routes under /api. Vite loads the matching .env file
// for development or production, while the fallbacks keep the config usable
// when a custom environment variable is not provided.
const LOCAL_API_BASE_URL = 'http://127.0.0.1:3000/api'
const ONLINE_API_BASE_URL = 'https://api.wenjun.cc.cd/api'

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? LOCAL_API_BASE_URL : ONLINE_API_BASE_URL)
).replace(/\/$/, '')

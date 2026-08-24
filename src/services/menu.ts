import type { MealType, MenuItem } from '@/types'
import { addMenuRemote, deleteMenuRemote, getMenuRemote } from './api'

const menuMemory: MenuItem[] = []
export const loadMenu = async () => {
  const items = await getMenuRemote()
  menuMemory.splice(0, menuMemory.length, ...items)
  return menuMemory
}

export const formatDate = (date = new Date()) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const getDailyMenu = (date: string) => menuMemory.filter((item) => item.date === date).map((item) => ({ ...item, meal: item.meal || 'dinner' as MealType }))
export const getMenuMap = () => menuMemory.reduce<Record<string, MenuItem[]>>((map, item) => { (map[item.date] ||= []).push(item); return map }, {})

export const addRecipeToMenu = async (date: string, recipeId: string, meal: MealType = 'dinner', order?: Pick<MenuItem, 'orderedBy' | 'note'>) => {
  if (date < formatDate()) return undefined
  const item = await addMenuRemote({ date, recipeId, meal, ...order })
  const index = menuMemory.findIndex((current) => current.id === item.id)
  if (index >= 0) menuMemory[index] = item
  else menuMemory.push(item)
  return item
}

export const removeMenuItem = async (id: string) => {
  await deleteMenuRemote(id)
  const index = menuMemory.findIndex((item) => item.id === id)
  if (index >= 0) menuMemory.splice(index, 1)
}

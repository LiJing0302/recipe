import type { CookingRecord } from '@/types'
import { createCookingRecordRemote, getCookingRecordsRemote } from './api'

const recordMemory: CookingRecord[] = []
export const loadCookingRecords = async () => { const records = await getCookingRecordsRemote(); recordMemory.splice(0, recordMemory.length, ...records); return recordMemory }
export const getCookingRecords = () => recordMemory
export const completeCooking = async (input: Omit<CookingRecord, 'id' | 'recipeTitle'>) => { const record = await createCookingRecordRemote(input); recordMemory.unshift(record); return record }

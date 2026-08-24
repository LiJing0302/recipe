import type { Order } from '@/types'
import { createOrderRemote, getOrdersRemote } from './api'

const orderMemory: Order[] = []
export const loadOrders = async () => { const orders = await getOrdersRemote(); orderMemory.splice(0, orderMemory.length, ...orders); return orderMemory }
const getOrders = () => orderMemory
export const getOrdersForDate = (date: string) => getOrders().filter((order) => order.date === date)
export const createOrder = async (input: Omit<Order, 'id' | 'createdAt' | 'status'>) => { const order = await createOrderRemote(input); orderMemory.unshift(order); return order }

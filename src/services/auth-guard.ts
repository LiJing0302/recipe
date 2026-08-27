import { switchAppTab } from '@/services/tabbar'
import { isAuthenticated } from '@/services/storage'

export const LOGIN_TAB_INDEX = 4

/**
 * 为需要登录的交互统一加上登录拦截。
 * 未登录时只切换到「我的」Tab，由个人页负责展示登录表单。
 */
export const withLoginRequired = <TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => TResult
) => (...args: TArgs): TResult | undefined => {
  if (!isAuthenticated()) {
    switchAppTab(LOGIN_TAB_INDEX)
    return undefined
  }
  return action(...args)
}

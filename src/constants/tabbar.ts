/**
 * 悬浮 Tab 共享配置。
 *
 * 根页面中的唯一悬浮 TabBar 与全局 store 使用本文件。
 */

export type TabBarItem = {
  id: string
  label: string
  icon: string
  activeIcon: string
}

export const TAB_PAGES: TabBarItem[] = [
  { id: 'menu', label: '菜单', icon: '/static/tabbar/menu.png', activeIcon: '/static/tabbar/menu-active.png' },
  { id: 'basket', label: '菜篮子', icon: '/static/tabbar/basket.png', activeIcon: '/static/tabbar/basket-active.png' },
  { id: 'ingredients', label: '食材库', icon: '/static/tabbar/ingredients.png', activeIcon: '/static/tabbar/ingredients-active.png' },
  { id: 'recipes', label: '食谱', icon: '/static/tabbar/recipes.png', activeIcon: '/static/tabbar/recipes-active.png' },
  { id: 'profile', label: '我的', icon: '/static/tabbar/profile.png', activeIcon: '/static/tabbar/profile-active.png' }
]

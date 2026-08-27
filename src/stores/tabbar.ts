import { defineStore } from 'pinia'
import { TAB_PAGES } from '@/constants/tabbar'

/**
 * 全局悬浮 Tab 唯一状态源（单实例语义）。
 *
 * 根容器 pages/index/index 统一挂载 custom-tab-bar/index.vue 作为悬浮
 * TabBar（不再依赖原生 tabBar 配置，避免两端重复渲染底部栏）；各端都通过
 * 本 store 保持唯一实例的选中项和显隐状态一致。
 */
export const useTabBarStore = defineStore('tabbar', {
  state: () => ({
    /** 当前选中 tab 的下标 */
    selected: 0,
    /** 悬浮 tab 是否可见 */
    visible: true
  }),
  actions: {
    setSelected(index: number) {
      if (index >= 0 && index < TAB_PAGES.length) this.selected = index
    },
    show() {
      this.visible = true
    },
    hide() {
      this.visible = false
    }
  }
})

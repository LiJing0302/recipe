<script setup lang="ts">
const iconGlyphs = {
  'arrow-up-right': String.fromCharCode(0xea70),
  bag: String.fromCharCode(0xf114),
  plus: String.fromCharCode(0xea13),
  spark: String.fromCharCode(0xf36b),
  check: String.fromCharCode(0xeb7b),
  share: String.fromCharCode(0xf0fd),
  grid: String.fromCharCode(0xee90),
  community: String.fromCharCode(0xebba),
  settings: String.fromCharCode(0xf0e6),
  trash: String.fromCharCode(0xec2a),
  pencil: String.fromCharCode(0xec86),
  info: String.fromCharCode(0xee59),
  close: String.fromCharCode(0xeb99),
  'chevron-right': String.fromCharCode(0xea6e),
  leaf: String.fromCharCode(0xeea3),
  camera: String.fromCharCode(0xeb31),
  calendar: String.fromCharCode(0xeb27),
} as const

type IconName = keyof typeof iconGlyphs
type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const props = withDefaults(defineProps<{
  name: IconName
  size?: IconSize
  label?: string
}>(), {
  size: 'md',
})
</script>

<template>
  <!-- 功能图标使用单色字体；多色食材图标应使用独立图片资源。
       注：必须用 <view> 而不是 <text> —— <text> 在 uniapp/小程序里是 inline 元素，
            对 display: inline-flex + align-items: center 不生效，会导致图标
            偏基线、视觉上向下偏移。 -->
  <view
    class="app-icon"
    :class="props.size"
    :aria-label="props.label"
    :aria-hidden="props.label ? undefined : true"
  >{{ iconGlyphs[props.name] }}</view>
</template>

<style scoped>
/* ---------- 图标字体：Remix Icon（Apache-2.0）子集，保留项目使用的 17 个字形；share = share-forward-line（0xf0fd），原为 share-forward-2-line（0xf0f9） ---------- */
@font-face {
  font-family: 'remixicon';
  src: url("data:application/x-font-woff;charset=utf-8;base64,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") format('woff');
  font-display: block;
}
.app-icon {
  /* 整体居中靠两层 flex：父容器 flex 居中 .app-icon 盒子，
     盒子内部又 inline-flex 把字形居中。view 而不是 text 是关键：
     <text> 在 uniapp/小程序里是 inline 元素，对 align-items: center 不生效。 */
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 1em;
  height: 1em;
  overflow: hidden;
  color: inherit;
  font-family: 'remixicon';
  font-style: normal;
  font-weight: normal;
  line-height: 1;
  text-align: center;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
.app-icon.xs { font-size: 20rpx; }
.app-icon.sm { font-size: 24rpx; }
.app-icon.md { font-size: 30rpx; }
.app-icon.lg { font-size: 38rpx; }
.app-icon.xl { font-size: 48rpx; }
</style>

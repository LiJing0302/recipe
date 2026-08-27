<script setup lang="ts">
const iconGlyphs = {
  'arrow-up-right': String.fromCharCode(0xea70),
  bag: String.fromCharCode(0xf114),
  plus: String.fromCharCode(0xea13),
  spark: String.fromCharCode(0xf36b),
  check: String.fromCharCode(0xeb7b),
  share: String.fromCharCode(0xf0f9),
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
  <!-- 功能图标使用单色字体；多色食材图标应使用独立图片资源。 -->
  <text
    class="app-icon"
    :class="props.size"
    :aria-label="props.label"
    :aria-hidden="props.label ? undefined : true"
  >{{ iconGlyphs[props.name] }}</text>
</template>

<style scoped>
/* ---------- 图标字体：Remix Icon（Apache-2.0），仅保留项目使用的 17 个字形 ---------- */
@font-face {
  font-family: 'remixicon';
  src: url("data:application/x-font-woff;charset=utf-8;base64,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") format('woff');
  font-display: block;
}
.app-icon {
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
  vertical-align: middle;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
.app-icon.xs { font-size: 20rpx; }
.app-icon.sm { font-size: 24rpx; }
.app-icon.md { font-size: 30rpx; }
.app-icon.lg { font-size: 38rpx; }
.app-icon.xl { font-size: 48rpx; }
</style>

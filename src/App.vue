<script setup lang="ts">
	import { onLaunch } from '@dcloudio/uni-app'
	import { useAppStore } from '@/stores/app'
	import { clearLegacyBusinessDataOnce } from '@/services/storage'
	import { loadIngredientConfigsRemote } from '@/services/ingredient-config'

	const appStore = useAppStore()

	onLaunch(() => {
		clearLegacyBusinessDataOnce()
		// 用户单位配置已迁移到后端，不兼容旧的本地配置。
		uni.removeStorageSync('recipe-ai-ingredient-configs')
		uni.removeStorageSync('recipe-ai-ingredient-configs-v2')
		appStore.bootstrap()
		loadIngredientConfigsRemote().catch(() => undefined)
		// 公共弹窗统一圆角：所有 up-popup 默认 24px（底部弹窗圆顶部两角，居中弹窗圆四角），新增弹窗自动生效
		uni.$u.setConfig({
			config: {
				popup: { round: '24px' }
			}
		})
	})
</script>

<style lang="scss">
	@import "./uni.scss";

	page {
		background: $paper;
		color: $ink;
		font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "HarmonyOS Sans SC", "Segoe UI", sans-serif;
		font-size: 28rpx;
	}

	/* uview-plus CSS 变量兜底 */
	page {
		--up-primary: #{$brand};
		--up-primary-dark: #{$brand-dark};
		--up-primary-light: #{$brand-soft};
		--up-warning: #{$gold};
		--up-success: #{$sage};
		--up-error: #{$brand};
		--up-bg-color: #{$paper};
	}

	view,
	text,
	button,
	input,
	textarea,
	image,
	scroll-view {
		box-sizing: border-box;
	}

	button::after {
		border: none;
	}

	/* ---------- 页面骨架 ---------- */
	.page-shell {
		min-height: 100vh;
		padding: 32rpx 28rpx 82rpx;
	}

	/* u-popup 根节点默认 flex:1，在 flex 列容器中关闭时仍会占位挤压布局；
	   配合 custom-class="popup-static" 使用，让其不参与 flex 分配（弹层内容本身是 fixed 定位） */
	.popup-static {
		flex: 0 0 auto !important;
	}

	/* ---------- 文字 ---------- */
	.muted {
		color: $ink-soft;
	}

	.caption {
		color: $ink-faint;
		font-size: 24rpx;
	}

	.section-title {
		color: $ink;
		font-size: 38rpx;
		font-weight: 700;
	}

	.section-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	/* ---------- 标签胶囊 ---------- */
	.pill {
		display: inline-flex;
		align-items: center;
		padding: 10rpx 18rpx;
		border-radius: $radius-pill;
		background: $brand-soft;
		color: $brand-dark;
		font-size: 22rpx;
		font-weight: 500;
	}

	/* ---------- 按钮 ---------- */
	.primary-button {
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, $accent 0%, $brand 100%);
		color: #fff;
		border-radius: $radius-pill;
		font-size: 28rpx;
		font-weight: 600;
		line-height: 88rpx;
		height: 88rpx;
		box-shadow: $shadow-brand;
	}

	.primary-button:active {
		transform: scale(.98);
		opacity: .92;
	}

	.secondary-button {
		background: #fff;
		color: $brand-dark;
		border: 1.5rpx solid $line-strong;
		border-radius: $radius-pill;
		font-size: 28rpx;
		font-weight: 500;
		line-height: 80rpx;
		height: 80rpx;
	}

	/* ---------- 卡片 ---------- */
	.surface {
		background: $surface;
		border: 1rpx solid $line;
		border-radius: $radius-md;
		box-shadow: $shadow-card;
	}

	.divider {
		height: 1rpx;
		background: $line;
	}

	.grid-2 {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 20rpx;
	}

	.empty-state {
		padding: 80rpx 30rpx;
		text-align: center;
		color: $ink-faint;
	}

	.link-button {
		padding: 0;
		background: transparent;
		color: $brand;
		font-size: 26rpx;
		line-height: 1.5;
	}

	/* uni-app 原生 picker 弹层 z-index 仅 999，会被 u-popup(10075) 覆盖，
	   提到比 u-popup 更高的层级，使 picker 永远显示在最顶层。 */
	.uni-picker-container,
	.uni-picker-mask,
	.uni-modal {
		z-index: 10080 !important;
	}
</style>

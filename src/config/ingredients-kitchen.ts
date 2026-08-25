import type { InventoryZone } from "@/services/inventory-view";

/**
 * 食材库厨房皮肤配置。
 *
 * 每套皮肤都使用同一套「顶部留白 + 主体 + 底部地板」分割模型。
 * 后续新增皮肤时，只需增加一个 KITCHEN_SKINS 条目，并为该条目准备
 * 三张分割背景图和一份独立视频定位参数，不会影响其他皮肤。
 */

export type KitchenSkinId = "skin-1" | "skin-2";

export type KitchenZoneConfig = {
  key: InventoryZone;
  code: string;
  name: string;
  ariaLabel: string;
  hotspot: {
    left?: string;
    right?: string;
    top: string;
    width: string;
    height: string;
  };
};

export type KitchenSkinConfig = {
  id: KitchenSkinId;
  name: string;
  background: {
    color: string;
    topBlank: { src: string };
    main: {
      src: string;
      aspectRatio: string;
      widthByViewportHeight: number;
      canvasWidthVw: number;
    };
    bottomFloor: { src: string };
  };
  zones: KitchenZoneConfig[];
  canvasAnimation: {
    default: { transform: string };
    fridgeFocus: { transform: string };
    transformOrigin: string;
    durationMs: number;
    easing: string;
  };
  fridgeVideo: {
    src: string;
    // 定位相对于该皮肤的主体区域左上角，不是屏幕左上角。
    anchor: { x: string; y: string };
    width: string;
    aspectRatio: string;
    scale: number;
    objectFit: "cover" | "contain";
    objectPosition: string;
    playbackRate: number;
    debugPreview: { enabled: boolean; opacity: number };
    reveal: { durationMs: number; easing: string };
    openedOpacity: number;
    transitionDurationMs: number;
  };
  fridgeReverse: {
    tickMs: number;
    stepSeconds: number;
    fallbackDurationSeconds: number;
  };
  backgroundBlur: { opened: string; transitionDurationMs: number };
  backgroundReveal: { opacityDurationMs: number };
  overlay: { fadeDurationMs: number };
};

export const KITCHEN_SKINS = {
  "skin-1": {
    id: "skin-1",
    name: "原木厨房",
    background: {
      color: "#c9a174",
      topBlank: { src: "/static/ingredients/kitchen-storage-top.png" },
      main: {
        src: "/static/ingredients/kitchen-storage-main.png",
        aspectRatio: "941 / 860",
        widthByViewportHeight: 1.09419,
        canvasWidthVw: 91.392,
      },
      bottomFloor: { src: "/static/ingredients/kitchen-storage-floor.png" },
    },
    zones: [
      {
        key: "fridge",
        code: "FRIDGE",
        name: "冰箱",
        ariaLabel: "打开冰箱动画",
        hotspot: { left: "40%", top: "20%", width: "34%", height: "78%" },
      },
      {
        key: "seasoning",
        code: "SEASONING",
        name: "调料台",
        ariaLabel: "打开调料台食材列表",
        hotspot: { left: "0", top: "45%", width: "40%", height: "49%" },
      },
      {
        key: "vegetable",
        code: "VEGETABLE",
        name: "蔬菜架",
        ariaLabel: "打开蔬菜架食材列表",
        hotspot: { right: "0", top: "25%", width: "26%", height: "75%" },
      },
    ],
    canvasAnimation: {
      default: { transform: "scale(1)" },
      fridgeFocus: { transform: "translate(-60rpx, -80rpx) scale(1.92)" },
      transformOrigin: "58% 45%",
      durationMs: 780,
      easing: "ease-in-out",
    },
    fridgeVideo: {
      src: "/static/ingredients/fridge-open.mp4",
      anchor: { x: "28%", y: "-1.4%" },
      width: "59.6%",
      aspectRatio: "720 / 1192",
      scale: 1,
      objectFit: "cover",
      objectPosition: "center",
      playbackRate: 1.5,
      debugPreview: { enabled: false, opacity: 0.96 },
      reveal: { durationMs: 900, easing: "ease" },
      openedOpacity: 0.96,
      transitionDurationMs: 700,
    },
    fridgeReverse: {
      tickMs: 33,
      stepSeconds: 0.05,
      fallbackDurationSeconds: 1.033,
    },
    backgroundBlur: { opened: "8rpx", transitionDurationMs: 900 },
    backgroundReveal: { opacityDurationMs: 650 },
    overlay: { fadeDurationMs: 180 },
  },
  "skin-2": {
    id: "skin-2",
    name: "暖阳插画厨房",
    background: {
      color: "#e5ae72",
      topBlank: {
        src: "/static/ingredients/skins/skin-2/kitchen-storage-top.png",
      },
      main: {
        src: "/static/ingredients/skins/skin-2/kitchen-storage-main.png",
        aspectRatio: "768 / 732",
        widthByViewportHeight: 1.04918,
        canvasWidthVw: 95.3125,
      },
      bottomFloor: {
        src: "/static/ingredients/skins/skin-2/kitchen-storage-floor.png",
      },
    },
    zones: [
      // 第二套热区是主体裁切图坐标，后续可单独微调，不影响 skin-1。
      {
        key: "fridge",
        code: "FRIDGE",
        name: "冰箱",
        ariaLabel: "打开冰箱动画",
        hotspot: { left: "40.5%", top: "18%", width: "34%", height: "78%" },
      },
      {
        key: "seasoning",
        code: "SEASONING",
        name: "调料台",
        ariaLabel: "打开调料台食材列表",
        hotspot: { left: "0", top: "42%", width: "41%", height: "56%" },
      },
      {
        key: "vegetable",
        code: "VEGETABLE",
        name: "蔬菜架",
        ariaLabel: "打开蔬菜架食材列表",
        hotspot: { right: "0", top: "25%", width: "26%", height: "72%" },
      },
    ],
    canvasAnimation: {
      default: { transform: "scale(1)" },
      // 第二套冰箱焦点参数，先保留为独立调试值。
      fridgeFocus: { transform: "translate(-18rpx, -24rpx) scale(1.72)" },
      transformOrigin: "58% 48%",
      durationMs: 780,
      easing: "ease-in-out",
    },
    fridgeVideo: {
      src: "/static/ingredients/skins/skin-2/fridge-open.mp4",
      // 第二套视频是 720 x 964，尺寸、比例、位置全部独立维护。
      anchor: { x: "21%", y: "1.3%" },
      width: "70.5%",
      aspectRatio: "720 / 964",
      scale: 1,
      objectFit: "cover",
      objectPosition: "center",
      playbackRate: 1,
      // 当前皮肤打开开发预览，方便你直接调整下面的 anchor / width / scale。
      debugPreview: { enabled: false, opacity: 0.6 },
      reveal: { durationMs: 900, easing: "ease" },
      openedOpacity: 0.96,
      transitionDurationMs: 700,
    },
    fridgeReverse: {
      tickMs: 33,
      stepSeconds: 0.05,
      fallbackDurationSeconds: 3.065,
    },
    backgroundBlur: { opened: "8rpx", transitionDurationMs: 900 },
    backgroundReveal: { opacityDurationMs: 650 },
    overlay: { fadeDurationMs: 180 },
  },
} satisfies Record<KitchenSkinId, KitchenSkinConfig>;

// 当前用于调试和对齐的视频皮肤。完成对齐后改为 'skin-1' 即可恢复第一套。
export const ACTIVE_KITCHEN_SKIN_ID: KitchenSkinId = "skin-2";
export const INGREDIENTS_KITCHEN_CONFIG = KITCHEN_SKINS[ACTIVE_KITCHEN_SKIN_ID];
export const kitchenZoneConfigs = INGREDIENTS_KITCHEN_CONFIG.zones;

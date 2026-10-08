import { LAYOUT_BREAKPOINT_PX } from "@/core/constants/layout";
import { isTauriRuntime } from "@/infrastructure/platform/is-tauri";

/** 常见手机 / 平板 UA 子串 */
const MOBILE_USER_AGENT_RE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

/**
 * 根据 User-Agent 判断是否为常见移动设备。
 */
export function isMobileUserAgent(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  return MOBILE_USER_AGENT_RE.test(navigator.userAgent);
}

/**
 * 视口宽度是否不大于布局断点。
 *
 * @param breakpointPx 宽度上限（像素），含等号
 */
export function isNarrowViewport(breakpointPx: number = LAYOUT_BREAKPOINT_PX): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.innerWidth <= breakpointPx;
}

/** 是否为粗指针（触摸为主）环境 */
export function isCoarsePointer(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia("(pointer: coarse)").matches;
}

/**
 * 综合判定是否按移动端对待（布局、抽屉等）。
 */
export function isMobileEnvironment(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  if (isMobileUserAgent()) {
    return true;
  }
  if (!isNarrowViewport()) {
    return false;
  }
  if (isCoarsePointer()) {
    return true;
  }
  return typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;
}

/** 是否为桌面端环境 */
export function isDesktopEnvironment(): boolean {
  return !isMobileEnvironment();
}

/** 当前设备归类 */
export function getRuntimeDeviceKind(): "mobile" | "desktop" {
  return isMobileEnvironment() ? "mobile" : "desktop";
}

/** 是否在 Tauri 壳内且为移动 UA */
export function isTauriMobileShell(): boolean {
  return isTauriRuntime() && isMobileUserAgent();
}

/** 是否在 Tauri 壳内且为桌面 UA */
export function isTauriDesktopShell(): boolean {
  return isTauriRuntime() && !isMobileUserAgent();
}

/**
 * 是否像 Android 模拟器 UA（用于选择默认 API 宿主机地址 10.0.2.2）。
 */
export function isLikelyAndroidEmulator(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  const ua = navigator.userAgent;
  return /Android/i.test(ua) && /sdk_gphone|emulator|Android SDK built for/i.test(ua);
}

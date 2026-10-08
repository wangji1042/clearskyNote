import { isTauri } from "@tauri-apps/api/core";

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

/** 是否运行在 Tauri 运行时（相对纯浏览器） */
export function isTauriRuntime(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return isTauri() || typeof window.__TAURI_INTERNALS__ !== "undefined";
}

/**
 * 是否在 Vite 开发模式。
 * 构建期由 `define` 注入字面量，避免 WebView 74 + es2019 下降级后 `import.meta.env` 不可用。
 */
export const IS_VITE_DEV = __VITE_IS_DEV__;

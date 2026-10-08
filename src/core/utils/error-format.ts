/**
 * 将 catch 到的未知类型错误转为可展示字符串（Android WebView console 常无法展开对象）。
 */
export function formatUnknownError(error: unknown): string {
  if (error instanceof Error) {
    return error.message || error.name;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  try {
    return JSON.stringify(error);
  } catch {
    return "";
  }
}

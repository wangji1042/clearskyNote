import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import type { WebDavCredentials } from "@/core/types/domain";
import { formatUnknownError } from "@/core/utils/error-format";
import { isLikelyAndroidEmulator } from "@/core/utils/device";
import { IS_VITE_DEV } from "@/core/utils/vite-env";
import { isTauriRuntime } from "@/infrastructure/platform/is-tauri";

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function normalizePath(path: string): string {
  if (!path.startsWith("/")) {
    return `/${path}`;
  }
  return path;
}

function buildUrl(credentials: WebDavCredentials, path: string): string {
  return `${normalizeBaseUrl(credentials.baseUrl)}${normalizePath(path)}`;
}

/** 编码 Basic 认证头，使用 TextEncoder 处理 UTF-8 字符 */
function encodeBasicAuth(username: string, password: string): string {
  const bytes = new TextEncoder().encode(`${username}:${password}`);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createHeaders(credentials: WebDavCredentials, extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  headers.set(
    "Authorization",
    `Basic ${encodeBasicAuth(credentials.username, credentials.password)}`,
  );
  return headers;
}

/** 是否为访问公网 WebDAV（非本机/局域网） */
function isPublicWebDavHost(baseUrl: string): boolean {
  try {
    const hostname = new URL(normalizeBaseUrl(baseUrl)).hostname.toLowerCase();
    return (
      hostname !== "127.0.0.1" &&
      hostname !== "localhost" &&
      hostname !== "10.0.2.2" &&
      !hostname.startsWith("192.168.") &&
      !hostname.startsWith("10.") &&
      hostname !== "[::1]"
    );
  } catch {
    return true;
  }
}

/**
 * 根据错误信息给出模拟器环境下的 WebDAV 提示。
 */
function buildWebDavErrorMessage(baseUrl: string, detail: string): string {
  if (
    isLikelyAndroidEmulator() &&
    isPublicWebDavHost(baseUrl) &&
    /network|unreachable|resolve|dns|unknown host|connection refused|failed to connect/i.test(
      detail,
    )
  ) {
    return (
      "模拟器无法访问公网，坚果云 WebDAV 同步不可用。请改用真机（WiFi）或修复模拟器网络后重试。" +
      (detail ? `（${detail}）` : "")
    );
  }
  return detail ? `WebDAV 请求失败：${detail}` : "WebDAV 请求失败";
}

/**
 * WebDAV 请求：
 * 1. Tauri 运行态走 Rust HTTP 插件（tauriFetch），避开 WebView CORS 限制；
 * 2. 纯浏览器开发态（Vite Dev）走本地中间件代理（/__webdav_proxy），避开浏览器同源策略限制；
 * 3. 生产静态 Web 兜底调用 window.fetch，若触发 CORS 则给出清晰引导。
 */
async function request(
  credentials: WebDavCredentials,
  path: string,
  init: RequestInit,
): Promise<Response> {
  const url = buildUrl(credentials, path);
  const options: RequestInit = {
    ...init,
    headers: createHeaders(credentials, init.headers),
  };

  if (isTauriRuntime()) {
    try {
      return await tauriFetch(url, options);
    } catch (error) {
      throw new Error(buildWebDavErrorMessage(credentials.baseUrl, formatUnknownError(error)), {
        cause: error,
      });
    }
  }

  // 纯浏览器开发环境：通过 Vite 本地代理转发绕过浏览器跨域 CORS 拦截
  const requestUrl = IS_VITE_DEV ? `/__webdav_proxy?target=${encodeURIComponent(url)}` : url;

  try {
    return await fetch(requestUrl, options);
  } catch (error) {
    const errorMsg = formatUnknownError(error);
    if (!IS_VITE_DEV && /failed to fetch|networkerror|cors/i.test(errorMsg)) {
      throw new Error(
        "浏览器端无法直接跨域访问坚果云 WebDAV（受浏览器同源策略限制），请使用 ClearSky Note 桌面版或 Android 客户端进行同步。",
        { cause: error },
      );
    }
    throw new Error(buildWebDavErrorMessage(credentials.baseUrl, errorMsg), { cause: error });
  }
}

/** 确保远程目录存在（MKCOL 创建目录，405 表示已存在则视为成功） */
export async function ensureDirectory(credentials: WebDavCredentials, path: string): Promise<void> {
  const response = await request(credentials, path, {
    method: "MKCOL",
  });
  if (!response.ok && response.status !== 405) {
    throw new Error(`WebDAV MKCOL ${path} 失败: ${response.status}`);
  }
}

export async function uploadText(
  credentials: WebDavCredentials,
  path: string,
  content: string,
  contentType = "text/plain; charset=utf-8",
): Promise<void> {
  const response = await request(credentials, path, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
    },
    body: content,
  });

  if (!response.ok) {
    throw new Error(`WebDAV PUT failed: ${response.status} ${response.statusText}`);
  }
}

export async function downloadText(credentials: WebDavCredentials, path: string): Promise<string> {
  const response = await request(credentials, path, {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(`WebDAV GET failed: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

/** 列出远程目录中的文件名（使用 PROPFIND，Depth: 1） */
export async function listDirectory(
  credentials: WebDavCredentials,
  path: string,
): Promise<string[]> {
  const body = `<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:">
  <D:prop>
    <D:displayname/>
  </D:prop>
</D:propfind>`;

  const response = await request(credentials, path, {
    method: "PROPFIND",
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      Depth: "1",
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`WebDAV PROPFIND ${path} 失败: ${response.status}`);
  }

  const xmlText = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");

  const names: string[] = [];
  const responses = doc.querySelectorAll("response");
  const dirPath = normalizePath(path).replace(/\/+$/, "") + "/";

  for (const el of responses) {
    /** 当前 PROPFIND 响应中的 href 节点 */
    const hrefEl = el.querySelector("href");
    const href = hrefEl && hrefEl.textContent ? hrefEl.textContent : "";
    // 跳过目录本身
    const decoded = decodeURIComponent(href.replace(/\/+$/, ""));
    if (decoded === dirPath.replace(/\/+$/, "")) {
      continue;
    }
    // 提取文件名（最后一段路径）
    const name = decoded.split("/").pop();
    if (name) {
      names.push(name);
    }
  }

  return names;
}

/** 删除远程资源（文件或目录，返回 404 视为已删除成功） */
export async function deleteResource(credentials: WebDavCredentials, path: string): Promise<void> {
  const response = await request(credentials, path, {
    method: "DELETE",
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(`WebDAV DELETE ${path} 失败: ${response.status}`);
  }
}

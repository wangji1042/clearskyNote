import legacy from "@vitejs/plugin-legacy";
import { defineConfig, transformWithEsbuild, type Plugin } from "vite";
import vue from "@vitejs/plugin-vue";
import { codeInspectorPlugin } from "code-inspector-plugin";
import http from "node:http";
import https from "node:https";
import { fileURLToPath, URL } from "node:url";

/**
 * Tauri 移动端开发时会设置 TAURI_DEV_HOST（如模拟器 10.0.2.2、真机局域网 IP）。
 * 此时需禁用 code-inspector，避免 WebView 兼容问题。
 */
const isTauriMobile = !!process.env.TAURI_DEV_HOST;
/** 移动端 HMR 连接的 host（与 `tauri android dev --host` 一致） */
const tauriDevHost = process.env.TAURI_DEV_HOST;

/** 与 Android WebView 74（Chrome 74）对齐的 browserslist 目标 */
const legacyTargets = ["chrome >= 74", "android >= 7"];

/** esbuild 降级选项：语法到 es2019，但保留 import.meta（HMR / Vite 需要） */
const es2019TransformOptions = {
  target: "es2019",
  supported: {
    "import-meta": true,
  },
} as const;

/**
 * @vitejs/plugin-vue 对 SFC 内 TS 使用 target: "esnext"，会保留 ?? / ?.；
 * 开发态 legacy 插件不生效，Android WebView 74 会直接 SyntaxError。
 * 在 vue 之后再降一级到 es2019。
 */
function downlevelVueSfcToEs2019(): Plugin {
  return {
    name: "downlevel-vue-sfc-es2019",
    enforce: "post",
    async transform(code, id) {
      const fileId = id.split("?")[0] ?? id;
      if (!fileId.endsWith(".vue")) {
        return null;
      }
      // 样式/自定义块不参与 JS 语法降级
      if (id.includes("type=style") || id.includes("type=custom")) {
        return null;
      }
      return transformWithEsbuild(code, id, {
        loader: "js",
        ...es2019TransformOptions,
      });
    },
  };
}

/**
 * WebDAV 本地开发代理插件：
 * 纯浏览器环境下受同源策略限制，无法直接跨域向坚果云等 WebDAV 服务发送自定义 HTTP 动作（MKCOL/PROPFIND 等）；
 * 在 Vite 开发服务器端使用 Node.js 发起同源代理请求，规避开发态 CORS 限制。
 */
function webDavDevProxyPlugin(): Plugin {
  return {
    name: "webdav-dev-proxy",
    configureServer(server) {
      server.middlewares.use("/__webdav_proxy", (req, res) => {
        // 处理预检请求
        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader(
            "Access-Control-Allow-Methods",
            "GET, POST, PUT, DELETE, MKCOL, PROPFIND, OPTIONS",
          );
          res.setHeader("Access-Control-Allow-Headers", "*");
          res.end();
          return;
        }

        const reqUrl = new URL(req.url || "/", "http://localhost");
        const targetUrlStr = reqUrl.searchParams.get("target");
        if (!targetUrlStr) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.end("Missing target query param for WebDAV proxy");
          return;
        }

        let targetUrl: URL;
        try {
          targetUrl = new URL(targetUrlStr);
        } catch {
          res.statusCode = 400;
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.end("Invalid target url for WebDAV proxy");
          return;
        }

        const transport = targetUrl.protocol === "https:" ? https : http;
        /** 转发给真实 WebDAV 服务器的请求头 */
        const forwardedHeaders: Record<string, string | string[] | undefined> = { ...req.headers };
        delete forwardedHeaders.host;
        delete forwardedHeaders.origin;
        delete forwardedHeaders.referer;
        forwardedHeaders.host = targetUrl.host;

        const proxyReq = transport.request(
          targetUrl,
          {
            method: req.method,
            headers: forwardedHeaders,
          },
          (proxyRes) => {
            /** 注入允许 CORS 的代理响应头 */
            const responseHeaders: Record<string, string | string[] | undefined> = {
              ...proxyRes.headers,
              "access-control-allow-origin": "*",
              "access-control-allow-methods": "*",
              "access-control-allow-headers": "*",
            };
            res.writeHead(proxyRes.statusCode || 500, responseHeaders);
            proxyRes.pipe(res);
          },
        );

        proxyReq.on("error", (err) => {
          res.statusCode = 502;
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.end(`WebDAV proxy error: ${err.message}`);
        });

        req.pipe(proxyReq);
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  // android:dev 走 Vite 开发服，legacy 仅 build；es2019 降级语法，import-meta 单独保留
  define: {
    __VITE_IS_DEV__: JSON.stringify(mode === "development"),
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Vite 4 只能调用 Sass 的 legacy JS API，这里静默它的弃用告警；
        // 升级到 Vite 5.4+ 后应改用 api: "modern-compiler" 并移除本项
        silenceDeprecations: ["legacy-js-api"],
      },
    },
  },
  esbuild: {
    ...es2019TransformOptions,
  },
  optimizeDeps: {
    esbuildOptions: {
      ...es2019TransformOptions,
    },
  },
  plugins: [
    ...(mode === "development" && !isTauriMobile
      ? [
          codeInspectorPlugin({
            bundler: "vite",
          }),
        ]
      : []),
    webDavDevProxyPlugin(),
    vue(),
    downlevelVueSfcToEs2019(),
    legacy({
      targets: legacyTargets,
      modernTargets: ["chrome >= 87", "android >= 10"],
      renderLegacyChunks: true,
      modernPolyfills: true,
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 1420,
    strictPort: true,
    watch: {
      // Cargo/Gradle 构建时会锁定 target、gen 下的文件，Windows 上 Vite 监听会 EBUSY
      ignored: ["**/src-tauri/gen/**", "**/src-tauri/target/**"],
    },
    hmr: tauriDevHost
      ? {
          protocol: "ws",
          host: tauriDevHost,
          port: 1420,
        }
      : undefined,
  },
  clearScreen: false,
}));

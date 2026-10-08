# ClearSky Note

面向 `Windows` 桌面与 `Android` 移动端的离线优先笔记应用，基于 `Vue 3 + Vite + Tauri 2`，一套前端代码构建两端。

## 特性

- **离线优先**：所有操作在本地完成，无网络也可读写
- **多级目录**：文件夹树 + 笔记列表 + 编辑器三栏布局
- **Markdown 编辑**：实时渲染，支持表格与任务列表
- **坚果云同步**：基于 `WebDAV` 的快照全量同步
- **双端适配**：Windows 下三栏网格，Android 窄屏自动切换为抽屉式导航（断点 1080px）

## 技术栈

| 层次     | 选型                                                |
| -------- | --------------------------------------------------- |
| 前端框架 | Vue 3.5（Composition API）、TypeScript              |
| 状态管理 | Pinia 3                                             |
| 路由     | vue-router 4（hash 模式，适配 Tauri / WebView）     |
| 构建     | Vite 4 + `@vitejs/plugin-legacy`                    |
| 样式     | Sass（SCSS）                                        |
| Markdown | markdown-it（multimd-table、task-lists）+ DOMPurify |
| 客户端壳 | Tauri 2（fs / http 插件）                           |

## 目标平台

只支持以下两个平台，其余系统不在计划内：

| 平台                   | 运行时 WebView                   | 构建命令                | 产物                   |
| ---------------------- | -------------------------------- | ----------------------- | ---------------------- |
| Windows 10 / 11（x64） | WebView2（Chromium，系统提供）   | `npm run tauri:build`   | NSIS 安装包            |
| Android 7+（arm64）    | 系统 WebView，下限对齐 Chrome 74 | `npm run android:build` | release APK（aarch64） |

两端共用同一份前端代码，语法兼容下限由 Android 侧的 Chrome 74 决定，因此构建统一降级到 `es2019`。

## 快速开始

```bash
npm install
```

安装依赖后按目标平台选择启动方式：

```bash
npm run dev            # 仅前端，浏览器访问 http://localhost:1420
npm run tauri:dev      # Windows 桌面应用，见下方「Windows 端」
npm run android:dev    # Android 模拟器，见下方「Android 端」
```

开发服务器固定监听 `0.0.0.0:1420`（`strictPort`），端口被占用时会直接报错而非自动切换。

## npm 脚本

| 脚本                        | 说明                                                |
| --------------------------- | --------------------------------------------------- |
| `dev`                       | Vite 开发服务器（仅前端，端口 1420）                |
| `build`                     | 类型检查 + Vite 生产构建                            |
| `preview`                   | 预览生产构建产物                                    |
| `check`                     | TypeScript 类型检查（`vue-tsc --noEmit`）           |
| `lint` / `lint:fix`         | ESLint 检查 / 自动修复                              |
| `format` / `format:check`   | Prettier 格式化 / 仅校验                            |
| `tauri:dev` / `tauri:build` | Tauri 桌面端开发 / 生产构建                         |
| `android:init`              | 初始化 Android 工程（生成 `src-tauri/gen/android`） |
| `android:dev`               | 模拟器调试：`adb reverse` + `--host 127.0.0.1`      |
| `android:dev:device`        | 真机调试：走局域网 IP                               |
| `android:build`             | 构建 release APK（aarch64）                         |

## 目录结构

```
src/
├── app/                    # 应用入口（main.ts、App.vue）
├── router/                 # 路由表（hash 模式）
├── pages/                  # 路由页面 NotesPage / SettingsPage + 页面级样式
├── core/                   # 与业务无关的基础能力
│   ├── constants/          # 存储键、布局断点、编辑器防抖等常量
│   ├── types/domain.ts     # 领域实体与 DTO
│   └── utils/              # id、设备检测、HTML 净化、日期、搜索高亮、构建环境
├── infrastructure/         # 基础设施
│   ├── persistence/        # local-kv、工作区快照读写
│   ├── repository/         # workspace.repository 门面
│   └── platform/           # is-tauri 运行环境判断
├── features/               # 按功能域拆分
│   ├── workspace/          # Pinia store + 目录树/查询/合并等领域逻辑
│   ├── folders/            # SidebarTree
│   ├── notes/              # NoteList、NoteEditor
│   ├── editor/             # MarkdownEditor + 渲染与工具栏逻辑
│   ├── layout/             # 设备类型、移动抽屉、三栏 NotesWorkspacePanels
│   └── sync/               # WebDAV 客户端、快照同步、设置页表单 composable
├── styles/                 # global.scss（csn-* 全局类）、variables.scss
├── types/domain.ts         # 兼容层，重导出 @/core/types/domain
└── env.d.ts
```

`src-tauri/` 是 Tauri 2 的 Rust 壳，仅挂载 fs / http 插件，业务逻辑全部在前端。

## 架构

### 数据流

1. 页面挂载时 `useWorkspaceBootstrap()` → `useWorkspaceStore().initialize()`
2. `infrastructure/repository` 从 `localStorage` 读出 `WorkspaceSnapshot`
3. 编辑笔记 → `NoteEditor` 防抖 → `updateSelectedNote` → `persist()`
4. 设置页 → `useJianguoyunSyncForm` → `syncToWebDav` / `pullFromWebDav` → `features/sync/services`

### 状态管理

- `features/workspace/store/workspace.store.ts` 内的 `useWorkspaceStore` 承载文件夹/笔记 CRUD、搜索与同步状态
- 纯领域逻辑抽离到 `features/workspace/lib/*`（`folder-tree`、`note-query`、`merge-remote-snapshot` 等），便于单独推理与测试

### UI 组合

- `features/layout/components/NotesWorkspacePanels.vue` 是桌面与移动共用的三栏容器，`showSidebar` 控制是否渲染目录树
- `pages/NotesPage.vue` 负责顶栏与「桌面网格 / 移动抽屉」的切换，store 事件只在此处绑定一次，避免重复监听

## 开发约定

- 路径别名 `@/` → `src/`；入口 HTML 指向 `src/app/main.ts`
- 全局样式类统一 `csn-*` 前缀；组件内部使用 BEM 块名（如 `note-list__card`）
- 新增函数与变量必须写 `/** ... */` JSDoc 注释；样式文件内只用 `/** ... */`，不用 `//`
- 语法下限由 Android WebView 74 决定（Windows 侧的 WebView2 是新版 Chromium，不构成约束）：`esbuild.target` 锁 `es2019`，构建走 `@vitejs/plugin-legacy`
- 判断开发模式请用 `IS_VITE_DEV`（`src/core/utils/vite-env.ts`），它读取由 `define` 注入的 `__VITE_IS_DEV__` 字面量；降级后 `import.meta.env` 在旧 WebView 上不可用，不要直接依赖
- 笔记采用软删除，同步 push 时跳过 `isDeleted` 的笔记

## 开发环境准备

两端都在 Windows 开发机上构建，公共前置是 Node.js 与 Rust 工具链（`stable-x86_64-pc-windows-msvc`）。

### Windows 端

- Visual Studio Build Tools 的「使用 C++ 的桌面开发」工作负载，提供 MSVC 链接器
- WebView2 Runtime，Windows 10 / 11 一般已随系统预装

就绪后 `npm run tauri:dev` 启动调试，`npm run tauri:build` 产出 NSIS 安装包，位于 `src-tauri/target/release/bundle/nsis/`。

### Android 端

- Android Studio（含 SDK、NDK）与 JDK 17，并配置好 `ANDROID_HOME`、`NDK_HOME`、`JAVA_HOME`
- Rust 交叉编译目标：`rustup target add aarch64-linux-android`；若用 x86_64 模拟器，再加 `x86_64-linux-android`

```bash
npm run android:init   # 每台新机器执行一次
npm run android:dev    # 模拟器（自动 adb reverse）
```

`src-tauri/gen/android` 由 Tauri 生成且不纳入版本库，所以换机器后必须重新 `android:init`。Gradle 与 Build Tools 版本以 Android Studio / Tauri 默认配置为准，可按需在生成目录内调整。

真机调试用 `npm run android:dev:device`，它走局域网 IP，需要手机与开发机处于同一网段。`npm run android:build` 产出的 APK 路径会在命令结束时打印，位于 `src-tauri/gen/android/app/build/outputs/apk/` 下。

### 常见问题

**`android:dev` 报符号链接失败**

Tauri 需要把 Android `.so` 链接到 `src-tauri/gen/android/app/src/main/jniLibs`，这要求当前用户有创建符号链接的权限。推荐开启系统开发者模式：

```text
设置 -> 系统 -> 开发者选项 -> 开发人员模式
```

若无法开启，则需在本地安全策略中为当前用户授予 `SeCreateSymbolicLinkPrivilege`。

**Gradle 报 `Can't connect to SOCKS proxy`**

检查 `%USERPROFILE%\.gradle\gradle.properties` 中是否残留失效的代理配置，备份后删除相关 `systemProp.*.proxy*` 项即可。

## 已知限制与规划

- 数据层用 `localStorage` 做全量快照持久化，不走 SQL
- 同步为快照全量覆盖，尚未实现增量同步与冲突解决
- 仅面向 Windows 与 Android，不计划支持 macOS / Linux / iOS，`bundle.targets` 因此只保留 `nsis`
- Android 只构建 aarch64 APK，未提供 x86_64 或多架构 universal 包

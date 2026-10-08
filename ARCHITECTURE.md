# ClearSky Note 技术架构

面向 **Windows 桌面端** 与 **Android 移动端** 的**离线优先（Offline-First）**多级目录 Markdown 笔记应用。技术栈为 **Vue 3 + TypeScript + Pinia + Tauri 2**，一套前端代码、两端构建分发。

---

## 一、整体架构分层

项目采用受 Clean Architecture / DDD 启发的分层结构，各层单向依赖、关注点分离：

```
┌────────────────────────────────────────────────────────┐
│               App & Pages（应用表现层）                 │
│       App.vue / NotesPage.vue / SettingsPage.vue       │
│                  vue-router（Hash 模式）               │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│                 Features（业务特性层）                  │
│  workspace │ notes │ folders │ editor │ layout │ sync  │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│             Infrastructure（基础设施层）                │
│  repository │ persistence（KV） │ platform（is-tauri） │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│                 Core（核心与基础能力）                  │
│   types/domain │ constants/* │ utils（id / html 等）   │
└────────────────────────────────────────────────────────┘
```

### 1. Core（核心领域模型与通用基础）

| 路径 | 职责 |
| --- | --- |
| `core/types/domain.ts` | 领域实体与 DTO：`FolderEntity`、`NoteEntity`、`WorkspaceSnapshot`、`WebDavCredentials` 等 |
| `core/constants/` | 存储键、布局断点（1080px）、编辑器防抖（220ms）等常量 |
| `core/utils/` | ID / 时间戳、HTML 净化、搜索高亮、设备探测等纯函数 |

### 2. Infrastructure（基础设施与持久化）

| 路径 | 职责 |
| --- | --- |
| `repository/workspace.repository.ts` | Repository 门面：`getWorkspaceSnapshot` / `persistWorkspaceSnapshot`，解耦业务与存储 |
| `persistence/` | 快照序列化与 `local-kv`（`localStorage`，无 window 时内存兜底） |
| `platform/is-tauri.ts` | 通过 `window.__TAURI_INTERNALS__` 判断是否在 Tauri 运行时 |

持久化走 `localStorage` 全量快照，不走 SQL；Repository 仅隔离业务与存储实现。

### 3. Features（领域特性）

| 模块 | 职责 |
| --- | --- |
| `workspace` | Pinia store 承载 CRUD / 搜索 / 同步状态；`lib/*` 存放目录树、查询、摘要、远端合并等纯领域逻辑 |
| `folders` | `SidebarTree.vue`：多级目录树 |
| `notes` | `NoteList.vue`、`NoteEditor.vue`：列表与编辑入口 |
| `editor` | Markdown 工具栏、渲染（markdown-it + GFM + DOMPurify）、预览切换 |
| `layout` | 设备类型、移动抽屉、三栏容器 `NotesWorkspacePanels.vue` |
| `sync` | WebDAV 客户端、快照推送 / 拉取、设置页同步表单 composable |

### 4. Pages & App（路由与表现）

- `pages/NotesPage.vue`：工作台；桌面三栏 / 移动抽屉切换；store 事件只在此绑定一次
- `pages/SettingsPage.vue`：坚果云 WebDAV 凭证与同步 / 恢复
- `router/`：vue-router **Hash 模式**，适配 Tauri / WebView

---

## 二、目录结构

```
src/
├── app/                    # 应用入口（main.ts、App.vue）
├── router/                 # 路由表（hash 模式）
├── pages/                  # NotesPage / SettingsPage + 页面级样式
├── core/                   # 与业务无关的基础能力
│   ├── constants/
│   ├── types/domain.ts
│   └── utils/
├── infrastructure/         # 持久化、仓库门面、平台探测
│   ├── persistence/
│   ├── repository/
│   └── platform/
├── features/               # 按功能域拆分
│   ├── workspace/
│   ├── folders/
│   ├── notes/
│   ├── editor/
│   ├── layout/
│   └── sync/
├── styles/                 # global.scss（csn-*）、variables.scss
├── types/domain.ts         # 兼容层，重导出 @/core/types/domain
└── env.d.ts
```

`src-tauri/` 为 Tauri 2 的 Rust 壳：仅挂载 fs / http 插件，**业务逻辑全部在前端**。

---

## 三、核心数据流

### 1. 离线优先与自动保存

```
[用户输入]
    → NoteEditor（防抖 NOTE_AUTOSAVE_DEBOUNCE_MS = 220ms）
    → workspace.store.updateSelectedNote / CRUD
    → workspace.repository
    → local-kv / localStorage（WorkspaceSnapshot）
```

- 启动：`useWorkspaceBootstrap()` → `useWorkspaceStore().initialize()` → 从本地读快照；空数据时创建默认根目录「全部笔记」
- 笔记采用**软删除**（`isDeleted: true`）；同步 push 时跳过已删除笔记

### 2. 状态管理

- `useWorkspaceStore`：文件夹 / 笔记 CRUD、选中态、搜索、同步状态
- 纯领域逻辑在 `features/workspace/lib/*`（`folder-tree`、`note-query`、`merge-remote-snapshot`、`note-summary`），便于单独推理与测试

### 3. UI 组合

- `NotesWorkspacePanels.vue`：桌面与移动共用三栏容器，`showSidebar` 控制是否渲染目录树（`display: contents` 参与父级 grid）
- `NotesPage.vue`：顶栏 +「桌面网格 / 移动抽屉」切换

---

## 四、云端同步（坚果云 WebDAV）

### 远端目录约定

```
/clearsky-note/          # 可配置 rootPath
  ├── manifest.json
  ├── folders/{folderId}.json
  └── notes/
        ├── {noteId}.md
        └── {noteId}.meta.json
```

### 流程

1. 设置页 `useJianguoyunSyncForm` → `workspace.syncWithWebDav`
2. `features/sync/services` 执行闭环双向同步：拉取远端快照 (`pullWorkspaceSnapshot`) → 智能合并 (`mergeRemoteWorkspaceSnapshot`) → 回写推送远端并清理删除文件 (`pushWorkspaceSnapshot`)
3. 合并规则：基于 `updatedAt` 时间戳仲裁冲突（较新者胜），双方独有项均保留；全新客户端优先采用远端结构避免重复默认目录
4. WebDAV 交互：Tauri 走 Rust HTTP（`tauriFetch`），浏览器开发环境走 Vite 本地透明代理（`/__webdav_proxy`）避开 CORS 限制

### 凭证存储与安全

- 配置信息（`baseUrl`、`username`、`password`、`rootPath`）保存在本地存储，重新进入设置页时自动回填
- 应用专用密码在写入本地存储时进行加密（防止浏览本地文件直接暴露明文），加载使用时自动解密

> 当前为快照式全量同步；`SyncRecord` 等增量类型已在 domain 中预留，尚未接入。

---

## 五、双端适配与构建

### 目标平台

| 平台 | WebView | 构建 | 产物 |
| --- | --- | --- | --- |
| Windows 10/11（x64） | WebView2 | `npm run tauri:build` | NSIS |
| Android 7+（arm64） | 系统 WebView（下限 Chrome 74） | `npm run android:build` | aarch64 APK |

### 响应式布局

- 断点：`LAYOUT_BREAKPOINT_PX = 1080`
- 判定：UA + 视口宽度 + `pointer: coarse` + `maxTouchPoints`（见 `core/utils/device.ts`）
- **桌面**：目录树 + 笔记列表 + 编辑器三栏网格
- **移动**：目录进抽屉；主体为列表 + 编辑器；抽屉打开时锁定 body 滚动

```
【桌面 (>1080px)】
┌──────────┬────────────┬─────────────────┐
│ 目录树   │ 笔记列表   │ Markdown 编辑区 │
└──────────┴────────────┴─────────────────┘

【移动 (≤1080px)】
┌─────────────────────────────────────────┐
│ [≡] ClearSky Note                       │
├────────────┬────────────────────────────┤
│ 笔记列表   │ Markdown 编辑区            │
└────────────┴────────────────────────────┘
（菜单打开左侧抽屉：目录树 + 搜索）
```

### 编译下限（对齐 Android Chrome 74）

- `esbuild.target`：`es2019`
- `@vitejs/plugin-legacy`：`chrome >= 74`、`android >= 7`
- 开发模式用 `IS_VITE_DEV`（`__VITE_IS_DEV__`），避免旧 WebView 依赖 `import.meta.env`

### 瘦 Rust 壳

`src-tauri/src/lib.rs` 仅初始化 fs / http 插件；Android 工程在 `src-tauri/gen/android`（生成物，不入库），新机器需 `npm run android:init`。

---

## 六、技术栈一览

| 层次 | 选型 |
| --- | --- |
| 前端 | Vue 3.5（Composition API）、TypeScript |
| 状态 | Pinia 3 |
| 路由 | vue-router 4（hash） |
| 构建 | Vite 4 + `@vitejs/plugin-legacy` |
| 样式 | Sass（SCSS）；全局类 `csn-*`，组件 BEM |
| Markdown | markdown-it（multimd-table、task-lists）+ DOMPurify |
| 客户端 | Tauri 2（fs / http） |

路径别名：`@/` → `src/`。入口 HTML 指向 `src/app/main.ts`。

---

## 七、架构要点小结

| 维度 | 实践 | 收益 |
| --- | --- | --- |
| 分层 | Core / Infra / Features / Pages | 高内聚、低耦合，便于测试与演进 |
| 状态 | Pinia + 纯函数 lib | UI 与领域逻辑分离 |
| 存储 | Repository 门面 + localStorage | 业务与存储隔离，不走 SQL |
| 同步 | 用户自备 WebDAV | 无中心服务运维成本 |
| 安全 | DOMPurify；密码不落盘 | XSS 与凭证风险可控 |
| 跨端 | 一套前端 + 动态布局 | 高复用、一致体验 |

---

## 八、已知限制与演进方向

1. **持久化**：当前为 `localStorage` 全量快照，不走 SQL。
2. **同步**：现为全量覆盖 + 按 ID 合并；可演进为增量同步 / 冲突解决（domain 已预留 `SyncRecord`）。
3. **平台范围**：仅 Windows 与 Android；不计划 macOS / Linux / iOS；Android 仅 aarch64 APK。
4. **附件**：本地插图已支持；后续可将图片统一进应用数据目录并走 WebDAV 同步。
